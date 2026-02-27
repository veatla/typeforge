# TypeForge

A tool for working with structured data: parsing, format conversion, and TypeScript type generation.

## Goals

- **JSON → TypeScript types** — Generate TypeScript interfaces and types from JSON (and other formats).
- **YAML support** — Parse and serialize YAML alongside JSON and XML.
- **Cross-format conversion** — Convert between JSON, XML, YAML, etc. (e.g. JSON → XML, JSON → YAML, XML → JSON).

## Current status

| Feature                                                   | Status                      |
| --------------------------------------------------------- | --------------------------- |
| JSON parsing                                              | ✅ Done                     |
| XML parsing                                               | ✅ Done                     |
| YAML parsing                                              | ✅ Basic (JSON-like subset) |
| TypeScript type generation from JSON/XML                  | ✅ Done                     |
| Serialization (JSON → XML, JSON → YAML, XML → JSON, etc.) | 🔲 Planned                  |

**JSON**, **XML**, and **YAML** (basic) parsers are implemented. The web UI lets you paste raw data, auto-detects the format, and shows the parsed result as JSON.

## Stack & scripts

- **React 19** + **Vite 7**, **TypeScript**
- `npm run dev` — development server
- `npm run build` — production build
- `npm run test:unit` — unit tests (Vitest)
- `npm run test:e2e` — E2E tests (Playwright)

## Structure

- `src/core/format-parser.ts` — base abstract parser.
- `src/core/parsers/json/` — JSON parser.
- `src/core/parsers/xml/` — XML parser.
- `src/core/input-data.ts` — `parseInputData()` picks a parser and returns parsed result (or throws).
- `src/App.tsx` — UI: data input, Parse button, parsed output.

## License

Copyright 2O26 Altaev Nurzhan

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
