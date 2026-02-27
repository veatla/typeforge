import FormatParser from "../../format-parser";
type PrimitiveParser = (data: string, position: number) => { value: unknown; position: number };
export default class JSONParser extends FormatParser {
    private readonly escapeCharacters: Record<string, string> = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
    };

    canParse(data: string): boolean {
        const first = data[0];
        return first === "{" || first === "[";
    }

    parse(data: string): unknown {
        if (!this.canParse(data)) throw new Error("Not a JSON string");

        return this.parseJSON(data, 0).value;
    }

    private parseJSON(data: string, position = 0): { value: unknown; position: number } {
        position = this.skipWhitespace(data, position);

        const character = data[position];

        const parses: Record<string, PrimitiveParser> = {
            '"': this.parseString,
            "{": this.parseObject,
            "[": this.parseArray,
            t: this.parseTrue,
            f: this.parseFalse,
            n: this.parseNull,
            "-": this.parseNumber,
        };

        if (character in parses) {
            return parses[character].call(this, data, position);
        } else if (character >= "0" && character <= "9") {
            return this.parseNumber(data, position);
        } else throw new Error(`Unexpected character '${character}' at position ${position}`);
    }

    private parseNumber(data: string, position: number): { value: number; position: number } {
        const match = data.slice(position).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (!match) {
            throw new Error(`Invalid number at position ${position}`);
        }
        return { value: parseFloat(match[0]), position: position + match[0].length };
    }

    private parseString(data: string, position: number): { value: string; position: number } {
        if (data[position] !== '"') throw new Error(`Expected '"' at position ${position}`);

        position++;
        let result = "";
        while (position < data.length) {
            const character = data[position];
            if (character === '"') {
                return { value: result, position: position + 1 };
            } else if (character === "\\") {
                position++;
                const escape = data[position];
                if (this.escapeCharacters[escape]) {
                    result += this.escapeCharacters[escape];
                    position++;
                } else if (escape === "u") {
                    result += String.fromCharCode(parseInt(data.slice(position + 1, position + 5), 16));
                    position += 5; // skip 'u' and 4 hex digits
                }
                continue;
            } else {
                result += character;
            }

            position++;
        }

        throw new Error("Unterminated string");
    }

    private parseArray(data: string, position: number): { value: unknown[]; position: number } {
        const result: unknown[] = [];
        position++; // skip '['

        position = this.skipWhitespace(data, position);
        if (data[position] === "]") return { value: result, position: position + 1 };

        while (position < data.length) {
            const { value, position: afterValue } = this.parseJSON(data, position);

            result.push(value);
            position = this.skipWhitespace(data, afterValue);
            if (data[position] === "]") return { value: result, position: position + 1 };
            if (data[position] !== ",") throw new Error(`Expected ',' at position ${position}`);
            position++;
        }

        throw new Error("Unterminated array");
    }

    private parseObject(data: string, position: number): { value: Record<string, unknown>; position: number } {
        const result: Record<string, unknown> = {};
        position++; // skip '{'

        position = this.skipWhitespace(data, position);
        if (data[position] === "}") return { value: result, position: position + 1 };

        while (position < data.length) {
            position = this.skipWhitespace(data, position);
            const { value: key, position: afterKey } = this.parseString(data, position);

            position = this.skipWhitespace(data, afterKey);

            if (data[position] !== ":") throw new Error(`Expected ':' at position ${position}`);
            position++;

            const { value, position: afterValue } = this.parseJSON(data, position);
            result[key] = value;
            position = this.skipWhitespace(data, afterValue);

            if (data[position] === "}") return { value: result, position: position + 1 };
            if (data[position] !== ",") throw new Error(`Expected ',' at position ${position}`);
            position++;
        }

        throw new Error("Unterminated object");
    }

    private parseTrue(data: string, position: number): { value: boolean; position: number } {
        if (data.slice(position, position + 4) !== "true") {
            throw new Error(`Expected 'true' at position ${position}`);
        }
        return { value: true, position: position + 4 };
    }

    private parseFalse(data: string, position: number): { value: boolean; position: number } {
        if (data.slice(position, position + 5) !== "false") {
            throw new Error(`Expected 'false' at position ${position}`);
        }
        return { value: false, position: position + 5 };
    }

    private parseNull(data: string, position: number): { value: null; position: number } {
        if (data.slice(position, position + 4) !== "null") {
            throw new Error(`Expected 'null' at position ${position}`);
        }
        return { value: null, position: position + 4 };
    }

    private skipWhitespace(data: string, position: number): number {
        while (position < data.length && /\s/.test(data[position])) {
            position++;
        }
        return position;
    }
}
