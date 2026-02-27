import FormatParser from "../../format-parser";

type XmlNode = Record<string, unknown>;

export default class XMLParser extends FormatParser {
    public canParse(data: string): boolean {
        const trimmed = data.trimStart();
        return trimmed.startsWith("<");
    }

    private stripXmlDeclaration(data: string): string {
        return data.replace(/^<\?xml[\s\S]*?\?>/, "").trimStart();
    }

    private stripDoctype(data: string): string {
        return data.replace(/^<!DOCTYPE[\s\S]*?>/, "").trimStart();
    }

    public parse(data: string): unknown {
        if (!this.canParse(data)) throw new Error("Not a XML string");
        data = this.stripXmlDeclaration(data);
        data = this.stripDoctype(data);
        data = data.trim();

        const result = this.parseXML(data, 0);
        return this.simplifyTextNodes(result.value);
    }

    /** Replace nodes that only have _text (no attrs, no children) with the string value. */
    private simplifyTextNodes(value: unknown): unknown {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            const obj = value as Record<string, unknown>;
            const keys = Object.keys(obj);
            if (keys.length === 1 && keys[0] === "_text") {
                return obj._text;
            }
            const out: Record<string, unknown> = {};
            for (const k of keys) {
                out[k] = this.simplifyTextNodes(obj[k]);
            }
            return out;
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.simplifyTextNodes(item));
        }
        return value;
    }

    private parseXML(data: string, position: number): { value: XmlNode; position: number } {
        position = this.skipWhitespace(data, position);
        if (data[position] !== "<") {
            throw new Error(`Unexpected character '${data[position]}' at position ${position}`);
        }
        return this.parseTag(data, position);
    }

    private parseTag(data: string, position: number): { value: XmlNode; position: number } {
        position = this.skipWhitespace(data, position);
        if (data[position] !== "<") {
            throw new Error(`Expected '<' at position ${position}`);
        }
        position++;

        const tagNameMatch = data.slice(position).match(/^([\w-.:]+)/);
        if (!tagNameMatch) throw new Error(`Invalid tag name at position ${position}`);
        const tagName = tagNameMatch[1];
        position += tagName.length;

        position = this.skipWhitespace(data, position);

        const attrs: Record<string, string> = {};
        while (position < data.length) {
            const attrMatch = data.slice(position).match(/^(\w[\w-.:]*)\s*=\s*("([^"]*)"|'([^']*)')/);
            if (attrMatch) {
                const [, name, , dqVal, sqVal] = attrMatch;
                attrs[name] = dqVal !== undefined ? dqVal : sqVal!;
                position += attrMatch[0].length;
                position = this.skipWhitespace(data, position);
            } else {
                break;
            }
        }

        const selfClosing = data.slice(position, position + 2) === "/>";
        if (selfClosing) {
            position += 2;
            const node: XmlNode = {};
            if (Object.keys(attrs).length > 0) node._attributes = attrs;
            return { value: { [tagName]: node }, position };
        }

        if (data[position] !== ">") {
            throw new Error(`Expected '>' or '/>' at position ${position}`);
        }
        position++;

        const contentResult = this.parseContent(data, position, tagName);
        position = contentResult.position;

        const node: XmlNode = {};
        if (Object.keys(attrs).length > 0) node._attributes = attrs;

        const content = contentResult.value;
        if (typeof content === "string") {
            const trimmed = content.trim();
            if (trimmed) node._text = trimmed;
        } else if (content !== null && typeof content === "object" && !Array.isArray(content)) {
            for (const [k, v] of Object.entries(content)) {
                node[k] = v;
            }
        }

        return { value: { [tagName]: node }, position };
    }

    private parseContent(
        data: string,
        position: number,
        closingTagName: string,
    ): { value: string | XmlNode; position: number } {
        const children: Array<{ name: string; value: XmlNode }> = [];
        let text = "";

        while (position < data.length) {
            position = this.skipWhitespace(data, position);
            if (position >= data.length) break;

            if (data[position] === "<") {
                if (data.slice(position).startsWith("</")) {
                    const escaped = closingTagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const closeMatch = data.slice(position).match(new RegExp(`^</\\s*${escaped}\\s*>`));
                    if (!closeMatch) {
                        throw new Error(`Expected closing tag </${closingTagName}> at position ${position}`);
                    }
                    position += closeMatch[0].length;

                    if (children.length === 0 && !text.trim()) {
                        return { value: text || "", position };
                    }
                    if (children.length === 0) {
                        return { value: text, position };
                    }

                    const merged: XmlNode = {};
                    if (text.trim()) merged._text = text.trim();
                    const byName = new Map<string, unknown[]>();
                    for (const { name, value } of children) {
                        const nodeVal = (value as XmlNode)[name];
                        if (!byName.has(name)) byName.set(name, []);
                        const arr = byName.get(name)!;
                        if (Array.isArray(nodeVal)) arr.push(...nodeVal);
                        else arr.push(nodeVal);
                    }
                    for (const [name, arr] of byName) {
                        merged[name] = arr.length === 1 ? arr[0] : arr;
                    }
                    return { value: merged, position };
                }

                const sub = this.parseTag(data, position);
                position = sub.position;
                for (const [name, val] of Object.entries(sub.value)) {
                    children.push({ name, value: { [name]: val } });
                }
                continue;
            }

            const nextOpen = data.indexOf("<", position);
            if (nextOpen === -1) {
                throw new Error(`Unclosed tag </${closingTagName}>`);
            }
            text += data.slice(position, nextOpen);
            position = nextOpen;
        }

        throw new Error(`Unclosed tag </${closingTagName}>`);
    }

    private skipWhitespace(data: string, position: number): number {
        while (position < data.length && /\s/.test(data[position])) {
            position++;
        }
        return position;
    }
}
