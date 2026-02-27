import { describe, it, expect } from "vitest";
import { toTypeScriptInterface } from "./to-typescript-interface";

describe("toTypeScriptInterface", () => {
  it("converts primitive number to type alias", () => {
    expect(toTypeScriptInterface(42)).toBe("export type Root = number;\n");
  });

  it("converts primitive string to type alias", () => {
    expect(toTypeScriptInterface("hello")).toBe("export type Root = string;\n");
  });

  it("converts primitive boolean to type alias", () => {
    expect(toTypeScriptInterface(true)).toBe("export type Root = boolean;\n");
  });

  it("converts null to type alias", () => {
    expect(toTypeScriptInterface(null)).toBe("export type Root = null;\n");
  });

  it("converts flat object to interface", () => {
    const parsed = { name: "x", count: 1, active: true };
    expect(toTypeScriptInterface(parsed)).toContain("export interface Root");
    expect(toTypeScriptInterface(parsed)).toContain("name: string");
    expect(toTypeScriptInterface(parsed)).toContain("count: number");
    expect(toTypeScriptInterface(parsed)).toContain("active: boolean");
  });

  it("converts nested object with correct indentation", () => {
    const parsed = { root: { key: "value" } };
    const out = toTypeScriptInterface(parsed);
    expect(out).toContain("root: {");
    expect(out).toContain("    key: string");
    expect(out).toContain("  }");
  });

  it("converts array of primitives", () => {
    const parsed = [1, 2, 3];
    expect(toTypeScriptInterface(parsed)).toBe("export type Root = number[];\n");
  });

  it("converts empty array to unknown[]", () => {
    const parsed: unknown[] = [];
    expect(toTypeScriptInterface(parsed)).toBe("export type Root = unknown[];\n");
  });

  it("converts array of objects", () => {
    const parsed = [{ id: 1, name: "a" }];
    const out = toTypeScriptInterface(parsed);
    expect(out).toContain("export type Root = ");
    expect(out).toContain("id: number");
    expect(out).toContain("name: string");
    expect(out).toContain("[]");
  });

  it("escapes invalid property names with quotes", () => {
    const parsed = { "my-key": "x", "with space": 1 };
    const out = toTypeScriptInterface(parsed);
    expect(out).toContain('"my-key"');
    expect(out).toContain('"with space"');
  });

  it("uses custom root name", () => {
    const parsed = { a: 1 };
    expect(toTypeScriptInterface(parsed, "Config")).toContain("export interface Config");
  });
});
