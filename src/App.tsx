import { useState } from "react";
import { parseInputData } from "./core/input-data";
import { toTypeScriptInterface } from "./core/to-typescript-interface";
import type { ParsedDocument } from "./core/types";

const App: React.FC = () => {
  const [inputData, setInputData] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interfaceOutput, setInterfaceOutput] = useState<string>("");

  const handleParse = () => {
    setError(null);
    if (inputData.trim() === "") {
      setParsedData(null);
      setInterfaceOutput("");
      setError("Input data is required");
      return;
    }

    try {
      const parsed = parseInputData(inputData);
      setParsedData(parsed);
      setInterfaceOutput(toTypeScriptInterface(parsed));
    } catch (err: unknown) {
      setParsedData(null);
      setInterfaceOutput("");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleParse();
    }
  };

  return (
    <div>
      <textarea
        aria-label="Input data (JSON, XML or YAML)"
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your data here..."
        rows={10}
        cols={50}
        tabIndex={0}
      />
      <br />
      <button
        type="button"
        onClick={handleParse}
        aria-label="Parse input data"
        tabIndex={0}
      >
        Parse
      </button>
      <br />
      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}
      {parsedData != null && (
        <>
          <h2>Parsed</h2>
          <pre>{JSON.stringify(parsedData, null, 2)}</pre>
          <h2>TypeScript interface</h2>
          <pre aria-label="Generated TypeScript interface">{interfaceOutput || "—"}</pre>
        </>
      )}
      {parsedData == null && !error && (
        <pre>No data parsed yet.</pre>
      )}
    </div>
  );
};

export default App;
