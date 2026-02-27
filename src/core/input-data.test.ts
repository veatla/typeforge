import { describe, it, expect } from "vitest";
import { parseInputData, UNKNOWN_FORMAT_MESSAGE } from "./input-data";

describe("parseInputData", () => {
  it("parses valid JSON object", () => {
    const result = parseInputData('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("parses valid JSON array", () => {
    const result = parseInputData("[1,2,3]");
    expect(result).toEqual([1, 2, 3]);
  });

  it("parses valid XML", () => {
    const result = parseInputData("<root><foo>bar</foo></root>");
    expect(result).toEqual({ root: { foo: "bar" } });
  });

  it("parses valid YAML with block mapping", () => {
    const yaml = `
name: John
age: 30
active: true
`;
    const result = parseInputData(yaml.trim());
    expect(result).toEqual({ name: "John", age: 30, active: true });
  });

  it("parses valid YAML with nested mapping and sequence", () => {
    const yaml = `
root:
  key: value
  items:
    - one
    - two
`;
    const result = parseInputData(yaml.trim());
    expect(result).toEqual({
      root: { key: "value", items: ["one", "two"] },
    });
  });

  it("parses valid YAML with document start", () => {
    const result = parseInputData("---\nfoo: bar\n");
    expect(result).toEqual({ foo: "bar" });
  });

  it("parses valid YAML when file starts with comment", () => {
    const yaml = `# config
name: test
count: 42
`;
    const result = parseInputData(yaml.trim());
    expect(result).toEqual({ name: "test", count: 42 });
  });

  it("parses YAML with literal block scalar (|)", () => {
    const yaml = `description: |
  Line 1
  Line 2
`;
    const result = parseInputData(yaml.trim());
    expect(result).toEqual({ description: "Line 1\nLine 2" });
  });

  it("throws on empty string", () => {
    expect(() => parseInputData("")).toThrow("Input data is required");
    expect(() => parseInputData("   ")).toThrow("Input data is required");
  });

  it("throws with UNKNOWN_FORMAT_MESSAGE when no parser matches", () => {
    expect(() => parseInputData("not json or xml")).toThrow(UNKNOWN_FORMAT_MESSAGE);
    expect(() => parseInputData("123")).toThrow(UNKNOWN_FORMAT_MESSAGE);
  });
});
