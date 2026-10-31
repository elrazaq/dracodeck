/**
 * Built-in Code Formatter (Prettier Engine) for DRACODECK
 * Lightweight, zero-dependency formatter for JavaScript, TypeScript, JSON, CSS, and HTML.
 */

export function formatCode(content: string, fileName?: string): string {
  const ext = (fileName?.split(".").pop() || "").toLowerCase();

  // JSON Formatter
  if (ext === "json") {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  // JS, TS, TSX, CSS Formatter: basic line indentation & brace alignment
  const lines = content.split("\n");
  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (let rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      formattedLines.push("");
      continue;
    }

    // Decrement indent if line starts with closing brace
    if (trimmed.startsWith("}") || trimmed.startsWith("]") || trimmed.startsWith(")")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indentStr = "  ".repeat(indentLevel);
    formattedLines.push(indentStr + trimmed);

    // Increment indent if line ends with opening brace, bracket, or tag
    if (
      trimmed.endsWith("{") ||
      trimmed.endsWith("[") ||
      (trimmed.endsWith("(") && !trimmed.startsWith("for") && !trimmed.startsWith("if"))
    ) {
      indentLevel++;
    }
  }

  return formattedLines.join("\n");
}
