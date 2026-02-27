import FormatParser from "../../format-parser";

type LineInfo = { indent: number; content: string; raw: string };

export default class YAMLParser extends FormatParser {
    private readonly supportedVersions = ["1.2"];

    canParse(data: string): boolean {
        const firstSignificant = this.getFirstSignificantLine(data);
        if (firstSignificant === null) return false;

        const trimmed = firstSignificant.trim();
        if (trimmed.startsWith("---")) return true;
        if (trimmed.startsWith("%YAML")) return true;
        if (trimmed.startsWith("version: ")) {
            const version = trimmed.split("\n")[0].replace(/.*version:\s*/, "").trim();
            return this.supportedVersions.some((v) => version.startsWith(v));
        }
        return /^[a-zA-Z_][\w-]*\s*:/.test(trimmed) || /^\s*-\s+/.test(trimmed);
    }

    /** Returns first non-empty, non-comment line (content only); null if none. */
    private getFirstSignificantLine(data: string): string | null {
        const normalized = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        for (const raw of normalized.split("\n")) {
            const line = raw.trimEnd();
            if (line === "" || line.startsWith("#")) continue;
            return line;
        }
        return null;
    }

    parse(data: string): unknown {
        if (!this.canParse(data)) throw new Error("Not a YAML string");

        const normalized = this.normalizeDocument(data);
        const lines = this.getLines(normalized);
        const result = this.parseDocument(lines, 0, 0);
        return result?.value ?? null;
    }

    private normalizeDocument(data: string): string {
        let s = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
        if (s.startsWith("---")) {
            s = s.replace(/^---\s*\n?/, "");
        }
        if (s.endsWith("...")) {
            s = s.replace(/\s*\.\.\.\s*$/, "");
        }
        return s.trim();
    }

    private getLines(data: string): LineInfo[] {
        const lines: LineInfo[] = [];
        const rawLines = data.split("\n");
        for (const raw of rawLines) {
            const trimmed = raw.trimEnd();
            if (trimmed.startsWith("#") || trimmed === "") {
                continue;
            }
            const indent = raw.length - raw.trimStart().length;
            const content = raw.slice(indent).trimEnd();
            lines.push({ indent, content, raw });
        }
        return lines;
    }

    private parseDocument(
        lines: LineInfo[],
        start: number,
        baseIndent: number,
    ): { value: unknown; nextIndex: number } | null {
        if (start >= lines.length) return null;

        const first = lines[start];
        if (first.indent < baseIndent) return null;

        const content = first.content;

        if (content.startsWith("- ")) {
            return this.parseSequence(lines, start, baseIndent);
        }
        if (content.includes(": ")) {
            return this.parseMapping(lines, start, baseIndent);
        }
        if (content.endsWith(":") && !content.startsWith('"') && !content.startsWith("'")) {
            return this.parseMapping(lines, start, baseIndent);
        }
        if (content.startsWith("{") || content.startsWith("[")) {
            const flow = this.parseFlow(content, 0);
            return { value: flow.value, nextIndex: start + 1 };
        }

        return { value: this.parseScalar(content), nextIndex: start + 1 };
    }

    private parseSequence(
        lines: LineInfo[],
        start: number,
        baseIndent: number,
    ): { value: unknown[]; nextIndex: number } {
        const result: unknown[] = [];
        let i = start;

        while (i < lines.length) {
            const line = lines[i];
            if (line.indent < baseIndent) break;
            if (line.indent > baseIndent) {
                i++;
                continue;
            }

            if (!line.content.startsWith("- ")) break;

            const valuePart = line.content.slice(2).trim();
            const childIndent = line.indent;

            if (valuePart === "" || valuePart === "|" || valuePart === ">") {
                const nextLine = lines[i + 1];
                if (nextLine && nextLine.indent > childIndent) {
                    const block = this.parseDocument(lines, i + 1, nextLine.indent);
                    if (block) {
                        result.push(block.value);
                        i = block.nextIndex;
                        continue;
                    }
                }
                result.push(null);
                i++;
                continue;
            }

            if (valuePart.startsWith("{") || valuePart.startsWith("[")) {
                const flow = this.parseFlow(valuePart, 0);
                result.push(flow.value);
                i++;
                continue;
            }

            const nextLine = lines[i + 1];
            if (nextLine && nextLine.indent > childIndent) {
                const inlineMapping = this.parseInlineMappingEntry(valuePart);
                if (inlineMapping !== null) {
                    const block = this.parseDocument(lines, i + 1, nextLine.indent);
                    if (block && typeof block.value === "object" && block.value !== null && !Array.isArray(block.value)) {
                        result.push({ ...inlineMapping, ...(block.value as Record<string, unknown>) });
                        i = block.nextIndex;
                        continue;
                    }
                }
                const block = this.parseDocument(lines, i + 1, nextLine.indent);
                if (block) {
                    result.push(block.value);
                    i = block.nextIndex;
                    continue;
                }
            }

            const inlineMapping = this.parseInlineMappingEntry(valuePart);
            if (inlineMapping !== null) {
                result.push(inlineMapping);
            } else {
                result.push(this.parseScalar(valuePart));
            }
            i++;
        }

        return { value: result, nextIndex: i };
    }

    private parseMapping(
        lines: LineInfo[],
        start: number,
        baseIndent: number,
    ): { value: Record<string, unknown>; nextIndex: number } {
        const result: Record<string, unknown> = {};
        let i = start;

        while (i < lines.length) {
            const line = lines[i];
            if (line.indent < baseIndent) break;
            if (line.indent > baseIndent) {
                i++;
                continue;
            }

            const keyMatch = line.content.match(/^([^:]+):\s*(.*)$/);
            if (!keyMatch) break;

            const key = this.parseScalar(keyMatch[1].trim()) as string;
            const valuePart = keyMatch[2].trim();

            const childIndent = line.indent;
            const nextLine = lines[i + 1];

            if (valuePart === "" && nextLine && nextLine.indent > childIndent) {
                const block = this.parseDocument(lines, i + 1, nextLine.indent);
                if (block) {
                    result[key] = block.value;
                    i = block.nextIndex;
                    continue;
                }
            }

            const blockScalar = this.tryParseBlockScalar(valuePart, lines, i + 1, childIndent);
            if (blockScalar !== null) {
                result[key] = blockScalar.value;
                i = blockScalar.nextIndex;
                continue;
            }

            result[key] = this.parseInlineValue(valuePart);
            i++;
        }

        return { value: result, nextIndex: i };
    }

    /** Parses inline value: quoted string, flow structure, or plain scalar. */
    private parseInlineValue(valuePart: string): unknown {
        if (valuePart === "") return null;
        if (valuePart.startsWith('"')) return this.parseDoubleQuotedString(valuePart, 0).value;
        if (valuePart.startsWith("'")) return this.parseSingleQuotedString(valuePart, 0).value;
        if (valuePart.startsWith("{") || valuePart.startsWith("[")) return this.parseFlow(valuePart, 0).value;
        return this.parseScalar(valuePart);
    }

    /**
     * If valuePart is a block scalar indicator (| or >) and next lines are indented, parse block content.
     * Literal (|) preserves newlines; folded (>) joins lines with space.
     */
    private tryParseBlockScalar(
        valuePart: string,
        lines: LineInfo[],
        startIndex: number,
        parentIndent: number,
    ): { value: string; nextIndex: number } | null {
        const match = valuePart.match(/^(\||>)([-+]?)$/);
        if (!match) return null;
        const style = match[1] as "|" | ">";
        const nextLine = lines[startIndex];
        if (!nextLine || nextLine.indent <= parentIndent) return null;

        const contentIndent = nextLine.indent;
        const chunks: string[] = [];
        let i = startIndex;

        while (i < lines.length && lines[i].indent > parentIndent) {
            const line = lines[i];
            if (line.indent >= contentIndent) {
                chunks.push(line.content);
            }
            i++;
        }

        if (style === "|") {
            return { value: chunks.join("\n"), nextIndex: i };
        }
        return { value: chunks.join(" ").replace(/\s+/g, " ").trim(), nextIndex: i };
    }

    private parseFlow(
        data: string,
        position: number,
    ): { value: unknown; position: number } {
        position = this.skipWhitespace(data, position);
        const char = data[position];

        if (char === "{") {
            return this.parseFlowObject(data, position);
        }
        if (char === "[") {
            return this.parseFlowArray(data, position);
        }
        throw new Error(`Unexpected flow character '${char}' at position ${position}`);
    }

    private parseFlowObject(
        data: string,
        position: number,
    ): { value: Record<string, unknown>; position: number } {
        const result: Record<string, unknown> = {};
        position++;
        position = this.skipWhitespace(data, position);
        if (data[position] === "}") {
            return { value: result, position: position + 1 };
        }

        while (position < data.length) {
            position = this.skipWhitespace(data, position);
            const keyResult = this.parseFlowScalar(data, position);
            position = this.skipWhitespace(data, keyResult.position);
            if (data[position] !== ":") {
                throw new Error(`Expected ':' at position ${position}`);
            }
            position++;
            position = this.skipWhitespace(data, position);
            const valueResult = this.parseFlowValue(data, position);
            result[keyResult.value as string] = valueResult.value;
            position = this.skipWhitespace(data, valueResult.position);
            if (data[position] === "}") {
                return { value: result, position: position + 1 };
            }
            if (data[position] !== ",") {
                throw new Error(`Expected ',' or '}' at position ${position}`);
            }
            position++;
        }
        throw new Error("Unterminated flow object");
    }

    private parseFlowArray(
        data: string,
        position: number,
    ): { value: unknown[]; position: number } {
        const result: unknown[] = [];
        position++;
        position = this.skipWhitespace(data, position);
        if (data[position] === "]") {
            return { value: result, position: position + 1 };
        }

        while (position < data.length) {
            position = this.skipWhitespace(data, position);
            const valueResult = this.parseFlowValue(data, position);
            result.push(valueResult.value);
            position = this.skipWhitespace(data, valueResult.position);
            if (data[position] === "]") {
                return { value: result, position: position + 1 };
            }
            if (data[position] !== ",") {
                throw new Error(`Expected ',' or ']' at position ${position}`);
            }
            position++;
        }
        throw new Error("Unterminated flow array");
    }

    private parseFlowValue(
        data: string,
        position: number,
    ): { value: unknown; position: number } {
        const char = data[position];
        if (char === "{") return this.parseFlowObject(data, position);
        if (char === "[") return this.parseFlowArray(data, position);
        return this.parseFlowScalar(data, position);
    }

    private parseFlowScalar(
        data: string,
        position: number,
    ): { value: unknown; position: number } {
        const char = data[position];
        if (char === '"') return this.parseDoubleQuotedString(data, position);
        if (char === "'") return this.parseSingleQuotedString(data, position);
        let end = position;
        while (end < data.length && !/[,\]\s}]/.test(data[end])) {
            if (data[end] === ":" && data.slice(position, end).trim().length > 0) {
                break;
            }
            end++;
        }
        const raw = data.slice(position, end).trim();
        return { value: this.parseScalar(raw), position: end };
    }

    /** Parses "key: value" into { key: value }; returns null if not a mapping entry. */
    private parseInlineMappingEntry(valuePart: string): Record<string, unknown> | null {
        const keyMatch = valuePart.match(/^([^:]+):\s*(.*)$/);
        if (!keyMatch) return null;
        const key = this.parseScalar(keyMatch[1].trim()) as string;
        const valueStr = keyMatch[2].trim();
        const value = this.parseInlineValue(valueStr);
        return { [key]: value };
    }

    private parseScalar(raw: string): unknown {
        if (raw === "" || raw === "null" || raw === "~") return null;
        if (raw === "true") return true;
        if (raw === "false") return false;
        const num = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.exec(raw);
        if (num) return parseFloat(num[0]);
        return raw;
    }

    private parseDoubleQuotedString(
        data: string,
        position: number,
    ): { value: string; position: number } {
        const escape: Record<string, string> = {
            '"': '"',
            "\\": "\\",
            "/": "/",
            n: "\n",
            r: "\r",
            t: "\t",
        };
        if (data[position] !== '"') throw new Error(`Expected '"' at position ${position}`);
        position++;
        let result = "";
        while (position < data.length) {
            const ch = data[position];
            if (ch === '"') return { value: result, position: position + 1 };
            if (ch === "\\") {
                position++;
                const next = data[position];
                if (escape[next] !== undefined) {
                    result += escape[next];
                } else if (next === "u") {
                    result += String.fromCharCode(
                        parseInt(data.slice(position + 1, position + 5), 16),
                    );
                    position += 4;
                } else {
                    result += next;
                }
                position++;
                continue;
            }
            result += ch;
            position++;
        }
        throw new Error("Unterminated double-quoted string");
    }

    private parseSingleQuotedString(
        data: string,
        position: number,
    ): { value: string; position: number } {
        if (data[position] !== "'") throw new Error(`Expected "'" at position ${position}`);
        position++;
        let result = "";
        while (position < data.length) {
            const ch = data[position];
            if (ch === "'") {
                if (data[position + 1] === "'") {
                    result += "'";
                    position += 2;
                    continue;
                }
                return { value: result, position: position + 1 };
            }
            result += ch;
            position++;
        }
        throw new Error("Unterminated single-quoted string");
    }

    private skipWhitespace(data: string, position: number): number {
        while (position < data.length && /\s/.test(data[position])) {
            position++;
        }
        return position;
    }
}
