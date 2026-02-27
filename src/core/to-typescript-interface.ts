/**
 * Converts a parsed object (from JSON/XML/YAML) into a TypeScript interface definition string.
 */

const ROOT_INTERFACE_NAME = "Root";

const INDENT = "  ";

/**
 * Returns a TypeScript type string for the given value.
 * @param value - Value to infer type from
 * @param indentLevel - Current indent level for nested structures
 */
function inferType(value: unknown, indentLevel: number = 0): string {
  const pad = INDENT.repeat(indentLevel);
  const innerPad = INDENT.repeat(indentLevel + 1);

  if (value === null) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";

  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const elementTypes = new Set<string>();
    for (const item of value) {
      elementTypes.add(inferType(item, indentLevel + 1));
    }
    const types = Array.from(elementTypes);
    if (types.length === 1) return `${types[0]}[]`;
    return `(${types.join(" | ")})[]`;
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj)
      .map(([key, val]) => {
        const safeKey = escapePropertyName(key);
        return `${innerPad}${safeKey}: ${inferType(val, indentLevel + 1)}`;
      })
      .join(";\n");
    return entries ? `{\n${entries}\n${pad}}` : "Record<string, unknown>";
  }

  return "unknown";
}

/**
 * Escapes property name for TypeScript: use quotes if not a valid identifier.
 */
function escapePropertyName(key: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return key;
  return JSON.stringify(key);
}

/**
 * Converts parsed data into a TypeScript interface declaration.
 * @param parsed - Parsed object (from parseInputData or similar)
 * @param rootName - Name of the root interface (default "Root")
 * @returns TypeScript source string with interface definition
 */
export function toTypeScriptInterface(
  parsed: unknown,
  rootName: string = ROOT_INTERFACE_NAME,
): string {
  if (parsed === null || typeof parsed !== "object") {
    const typeStr = inferType(parsed);
    return `export type ${rootName} = ${typeStr};\n`;
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return `export type ${rootName} = unknown[];\n`;
    const elementType = inferType(parsed[0], 1);
    return `export type ${rootName} = ${elementType}[];\n`;
  }

  const obj = parsed as Record<string, unknown>;
  const entries = Object.entries(obj)
    .map(([key, val]) => {
      const safeKey = escapePropertyName(key);
      return `  ${safeKey}: ${inferType(val, 1)};`;
    })
    .join("\n");

  return `export interface ${rootName} {\n${entries}\n}\n`;
}
