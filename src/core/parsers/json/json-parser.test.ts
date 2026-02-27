import { describe, it, expect } from "vitest";
import JSONParser from "./json-parser";

describe("JSONParser", () => {
    const parser = new JSONParser();

    describe("canParse", () => {
        it("returns true for string starting with '{'", () => {
            expect(parser.canParse("{}")).toBe(true);
            expect(parser.canParse('{ "a": 1 }')).toBe(true);
        });

        it("returns true for string starting with '['", () => {
            expect(parser.canParse("[]")).toBe(true);
            expect(parser.canParse("[1, 2, 3]")).toBe(true);
        });

        it("returns false for other starting characters", () => {
            expect(parser.canParse("")).toBe(false);
            expect(parser.canParse("null")).toBe(false);
            expect(parser.canParse("true")).toBe(false);
            expect(parser.canParse("123")).toBe(false);
            expect(parser.canParse('"hello"')).toBe(false);
            expect(parser.canParse("  {}")).toBe(false);
        });
    });

    describe("parse", () => {
        it("throws when data does not start with { or [", () => {
            expect(() => parser.parse("null")).toThrow("Not a JSON string");
            expect(() => parser.parse("")).toThrow("Not a JSON string");
            expect(() => parser.parse("hello")).toThrow("Not a JSON string");
        });

        describe("null, boolean, number", () => {
            it("parses null", () => {
                expect(parser.parse("[null]")).toEqual([null]);
                expect(parser.parse('{"x": null}')).toEqual({ x: null });
            });

            it("parses true", () => {
                expect(parser.parse("[true]")).toEqual([true]);
                expect(parser.parse('{"a": true}')).toEqual({ a: true });
            });

            it("parses false", () => {
                expect(parser.parse("[false]")).toEqual([false]);
                expect(parser.parse('{"a": false}')).toEqual({ a: false });
            });

            it("parses integers", () => {
                expect(parser.parse("[0]")).toEqual([0]);
                expect(parser.parse("[42]")).toEqual([42]);
                expect(parser.parse("[-1]")).toEqual([-1]);
            });

            it("parses floats", () => {
                expect(parser.parse("[3.14]")).toEqual([3.14]);
                expect(parser.parse("[-0.5]")).toEqual([-0.5]);
            });

            it("parses scientific notation", () => {
                expect(parser.parse("[1e2]")).toEqual([100]);
                expect(parser.parse("[1.5e-1]")).toEqual([0.15]);
            });
        });

        describe("strings", () => {
            it("parses simple strings", () => {
                expect(parser.parse('["hello"]')).toEqual(["hello"]);
                expect(parser.parse('[""]')).toEqual([""]);
            });

            it("parses escape sequences", () => {
                expect(parser.parse('["\\\\"]')).toEqual(["\\"]);
                expect(parser.parse('["\\""]')).toEqual(['"']);
                expect(parser.parse('["\\/"]')).toEqual(["/"]);
                expect(parser.parse('["\\b"]')).toEqual(["\b"]);
                expect(parser.parse('["\\f"]')).toEqual(["\f"]);
            });

            it("parses unicode escape \\uXXXX", () => {
                expect(parser.parse('["\\u0041"]')).toEqual(["A"]);
                expect(parser.parse('["\\u00e9"]')).toEqual(["é"]);
            });
        });

        describe("arrays", () => {
            it("parses empty array", () => {
                expect(parser.parse("[]")).toEqual([]);
            });

            it("parses array of primitives", () => {
                expect(parser.parse("[1, 2, 3]")).toEqual([1, 2, 3]);
                expect(parser.parse("[true, false, null]")).toEqual([true, false, null]);
            });

            it("parses nested arrays", () => {
                expect(parser.parse("[[1], [2, 3]]")).toEqual([[1], [2, 3]]);
            });

            it("allows trailing whitespace before ]", () => {
                expect(parser.parse("[1 ]")).toEqual([1]);
                expect(parser.parse("[ 1 , 2 ]")).toEqual([1, 2]);
            });
        });

        describe("objects", () => {
            it("parses empty object", () => {
                expect(parser.parse("{}")).toEqual({});
            });

            it("parses object with one key", () => {
                expect(parser.parse('{"a": 1}')).toEqual({ a: 1 });
            });

            it("parses object with multiple keys", () => {
                expect(parser.parse('{"a": 1, "b": 2}')).toEqual({ a: 1, b: 2 });
            });

            it("parses nested objects", () => {
                expect(parser.parse('{"a": {"b": 1}}')).toEqual({ a: { b: 1 } });
            });

            it("allows whitespace inside object", () => {
                expect(parser.parse('{ "x" : 42 }')).toEqual({ x: 42 });
            });
        });

        describe("whitespace", () => {
            it("skips internal whitespace", () => {
                expect(parser.parse("[ 1 , 2 ]")).toEqual([1, 2]);
            });
        });

        describe("errors", () => {
            it("throws on unexpected character", () => {
                expect(() => parser.parse("[x]")).toThrow(/Unexpected character/);
            });

            it("throws on invalid number", () => {
                expect(() => parser.parse("[-]")).toThrow(/Invalid number/);
            });

            it("throws on missing comma between array elements", () => {
                expect(() => parser.parse("[1 2]")).toThrow(/Expected ','/);
            });

            it("throws on missing colon in object", () => {
                expect(() => parser.parse('{"a" 1}')).toThrow(/Expected ':'/);
            });

            it("throws on missing comma between object pairs", () => {
                expect(() => parser.parse('{"a": 1 "b": 2}')).toThrow(/Expected ','/);
            });

            it("throws on unterminated string", () => {
                expect(() => parser.parse('["unclosed')).toThrow("Unterminated string");
            });

            it("throws on invalid literal (e.g. trux)", () => {
                expect(() => parser.parse("[trux]")).toThrow(/Expected 'true'/);
            });

            it("throws on invalid literal (e.g. fals)", () => {
                expect(() => parser.parse("[fals]")).toThrow(/Expected 'false'/);
            });

            it("throws on invalid literal (e.g. nul)", () => {
                expect(() => parser.parse("[nul]")).toThrow(/Expected 'null'/);
            });
        });
    });
});
