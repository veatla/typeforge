import FormatParser from "./format-parser";
import JSONParser from "./parsers/json/json-parser";
import XMLParser from "./parsers/xml/xml-parser";
import YAMLParser from "./parsers/yaml/yaml-parser";

const PARSERS: FormatParser[] = [
  new JSONParser(),
  new XMLParser(),
  new YAMLParser(),
];

export const UNKNOWN_FORMAT_MESSAGE = "Unknown data format";

/**
 * Tries each registered parser in order; returns parsed result or throws.
 */
export function parseInputData(data: string): unknown {
  const trimmed = data.trim();
  if (trimmed === "") {
    throw new Error("Input data is required");
  }

  for (const parser of PARSERS) {
    if (parser.canParse(trimmed)) {
      return parser.parse(trimmed);
    }
  }

  throw new Error(UNKNOWN_FORMAT_MESSAGE);
}
