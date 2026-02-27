import { describe, it, expect } from "vitest";
import YAMLParser from "./yaml-parser";

describe("YAMLParser", () => {
    const parser = new YAMLParser();

    describe("canParse", () => {
        it("returns true for document starting with ---", () => {
            expect(parser.canParse("---\nkey: value")).toBe(true);
        });

        it("returns true for line starting with key:", () => {
            expect(parser.canParse("name: John")).toBe(true);
            expect(parser.canParse("  foo: bar")).toBe(true);
        });

        it("returns true for line starting with - (sequence)", () => {
            expect(parser.canParse("- item")).toBe(true);
            expect(parser.canParse("  - a")).toBe(true);
        });

        it("returns false for plain text without YAML structure", () => {
            expect(parser.canParse("plain text")).toBe(false);
            expect(parser.canParse("123")).toBe(false);
        });

        it("returns true when document starts with comment", () => {
            expect(parser.canParse("# comment\nkey: value")).toBe(true);
            expect(parser.canParse("# one\n# two\nname: x")).toBe(true);
        });
    });

    describe("parse", () => {
        it("throws when data is not YAML", () => {
            expect(() => parser.parse("not yaml")).toThrow("Not a YAML string");
        });

        it("parses simple block mapping", () => {
            expect(parser.parse("name: John")).toEqual({ name: "John" });
            expect(parser.parse("a: 1\nb: 2")).toEqual({ a: 1, b: 2 });
        });

        it("parses scalars: null, boolean, number", () => {
            expect(parser.parse("n: null")).toEqual({ n: null });
            expect(parser.parse("t: true\nf: false")).toEqual({ t: true, f: false });
            expect(parser.parse("num: 42\nfloat: 3.14")).toEqual({ num: 42, float: 3.14 });
        });

        it("parses nested block mapping", () => {
            const yaml = `
root:
  key: value
  nested:
    a: 1
`;
            expect(parser.parse(yaml.trim())).toEqual({
                root: { key: "value", nested: { a: 1 } },
            });
        });

        it("parses block sequence", () => {
            expect(parser.parse("- one\n- two\n- three")).toEqual(["one", "two", "three"]);
            expect(parser.parse("- 1\n- 2\n- 3")).toEqual([1, 2, 3]);
        });

        it("parses sequence of mappings", () => {
            const yaml = `
- name: a
  val: 1
- name: b
  val: 2
`;
            expect(parser.parse(yaml.trim())).toEqual([
                { name: "a", val: 1 },
                { name: "b", val: 2 },
            ]);
        });

        it("parses mapping with sequence value", () => {
            const yaml = `
items:
  - one
  - two
`;
            expect(parser.parse(yaml.trim())).toEqual({ items: ["one", "two"] });
        });

        it("strips document start ---", () => {
            expect(parser.parse("---\nfoo: bar")).toEqual({ foo: "bar" });
        });

        it("parses flow style object", () => {
            expect(parser.parse("obj: { a: 1, b: 2 }")).toEqual({ obj: { a: 1, b: 2 } });
        });

        it("parses flow style array", () => {
            expect(parser.parse("arr: [1, 2, 3]")).toEqual({ arr: [1, 2, 3] });
        });

        it("parses empty value as null", () => {
            expect(parser.parse("key:")).toEqual({ key: null });
        });

        it("parses document that starts with comment", () => {
            const yaml = "# config file\nfoo: bar\nbaz: 1";
            expect(parser.parse(yaml)).toEqual({ foo: "bar", baz: 1 });
        });

        it("parses literal block scalar (|) preserving newlines", () => {
            const yaml = `description: |
  Line 1
  Line 2
`;
            expect(parser.parse(yaml.trim())).toEqual({
                description: "Line 1\nLine 2",
            });
        });

        it("parses folded block scalar (>)", () => {
            const yaml = `summary: >
  First paragraph
  continued
`;
            expect(parser.parse(yaml.trim())).toEqual({
                summary: "First paragraph continued",
            });
        });

        it("parses double-quoted value (strips quotes)", () => {
            expect(parser.parse('host: "127.0.0.1"')).toEqual({ host: "127.0.0.1" });
        });

        it("parses single-quoted value", () => {
            expect(parser.parse("name: 'hello'")).toEqual({ name: "hello" });
        });
    });
});
