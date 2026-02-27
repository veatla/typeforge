import { describe, it, expect } from "vitest";
import XMLParser from "./xml-parser";

describe("XMLParser", () => {
    const parser = new XMLParser();

    describe("canParse", () => {
        it("returns true for string starting with '<'", () => {
            expect(parser.canParse("<root/>")).toBe(true);
            expect(parser.canParse("  <root></root>")).toBe(true);
        });

        it("returns false for non-XML", () => {
            expect(parser.canParse("")).toBe(false);
            expect(parser.canParse("{}")).toBe(false);
            expect(parser.canParse("text")).toBe(false);
        });
    });

    describe("parse", () => {
        it("throws when data is not XML", () => {
            expect(() => parser.parse("not xml")).toThrow("Not a XML string");
        });

        it("parses self-closing tag", () => {
            expect(parser.parse("<root/>")).toEqual({ root: {} });
        });

        it("parses empty tag", () => {
            expect(parser.parse("<root></root>")).toEqual({ root: {} });
        });

        it("parses tag with attributes", () => {
            expect(parser.parse('<root id="1" name="test"/>')).toEqual({
                root: { _attributes: { id: "1", name: "test" } },
            });
        });

        it("parses tag with text content", () => {
            expect(parser.parse("<root>hello</root>")).toEqual({
                root: "hello",
            });
        });

        it("parses nested tags", () => {
            expect(parser.parse("<root><a><b>nested</b></a></root>")).toEqual({
                root: {
                    a: {
                        b: "nested",
                    },
                },
            });
        });

        it("parses multiple sibling elements", () => {
            expect(parser.parse("<root><a>1</a><b>2</b></root>")).toEqual({
                root: {
                    a: "1",
                    b: "2",
                },
            });
        });

        it("parses multiple same-name siblings as array", () => {
            expect(parser.parse("<root><item>a</item><item>b</item></root>")).toEqual({
                root: {
                    item: ["a", "b"],
                },
            });
        });

        it("parses users with user list as array of objects", () => {
            const xml = `<users>
  <user>
    <id>1</id>
    <name>Alice</name>
  </user>
  <user>
    <id>2</id>
    <name>Bob</name>
  </user>
</users>`;
            expect(parser.parse(xml)).toEqual({
                users: {
                    user: [
                        { id: "1", name: "Alice" },
                        { id: "2", name: "Bob" },
                    ],
                },
            });
        });

        it("strips XML declaration and DOCTYPE", () => {
            expect(
                parser.parse('<?xml version="1.0"?><root></root>'),
            ).toEqual({ root: {} });
            expect(
                parser.parse('<!DOCTYPE html><root></root>'),
            ).toEqual({ root: {} });
        });
    });
});
