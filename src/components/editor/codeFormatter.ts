/**
 * Built-in AST-Like Structural Code Formatter (Prettier Engine) for DRACODECK
 * Zero-dependency formatter for TypeScript, TSX, JSX, JavaScript, JSON, CSS, and HTML.
 * Supports JSX element trees, multi-line JSX props, self-closing tags, comments, and compound blocks.
 */

const HTML_VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);

type IndentFrame = "BLOCK" | "JSX_ELEMENT" | "JSX_HEAD";

/**
 * Replaces string literals and inline comments with inert placeholders so
 * brackets/tags inside strings (e.g. Tailwind `rounded-[2.5rem]`) never skew indentation.
 */
function maskStringsAndComments(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    // JSX comment {/* ... */} or block comment /* ... */
    if (line.slice(i, i + 3) === "{/*") {
      const end = line.indexOf("*/}", i + 3);
      if (end !== -1) {
        i = end + 3;
        continue;
      }
    }
    if (line.slice(i, i + 2) === "/*") {
      const end = line.indexOf("*/", i + 2);
      if (end !== -1) {
        i = end + 2;
        continue;
      }
    }
    // Single-line comment //
    if (line.slice(i, i + 2) === "//") {
      break;
    }
    // String literals
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += quote;
      i++;
      while (i < line.length && line[i] !== quote) {
        if (line[i] === "\\") {
          i += 2;
        } else {
          i++;
        }
      }
      if (i < line.length) {
        out += quote;
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out.trim();
}

export function formatCode(content: string, fileName?: string): string {
  const ext = (fileName?.split(".").pop() || "").toLowerCase();
  const normalized = content.replace(/\r\n/g, "\n");

  // 1. Strict JSON Formatter
  if (ext === "json") {
    try {
      const parsed = JSON.parse(normalized);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return normalized;
    }
  }

  // 2. Pre-pass: split adjacent closing tags like </div></div> onto separate lines
  const isJsxLike = ["tsx", "jsx", "html", "xml", "vue", "svelte"].includes(ext) || /<\/[a-zA-Z]/.test(normalized);
  const rawLines = (
    isJsxLike
      ? normalized.replace(/(<\/[a-zA-Z0-9_.-]+>)\s*(<\/[a-zA-Z0-9_.-]+>)/g, "$1\n$2")
      : normalized
  ).split("\n");

  const stack: IndentFrame[] = [];
  const formattedLines: string[] = [];
  let consecutiveBlank = 0;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      consecutiveBlank++;
      if (consecutiveBlank <= 1) {
        formattedLines.push("");
      }
      continue;
    }
    consecutiveBlank = 0;

    // Pure comment lines keep current indentation
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("{/*")
    ) {
      formattedLines.push("  ".repeat(stack.length) + trimmed);
      continue;
    }

    const masked = maskStringsAndComments(trimmed);
    const topFrame = stack[stack.length - 1];

    // --- DEDENT BEFORE PRINTING LINE ---
    if (topFrame === "JSX_HEAD") {
      // Standalone closing `>` or `/>` for a multi-line JSX opening tag
      if (masked === ">" || masked.startsWith(">")) {
        stack.pop();
        formattedLines.push("  ".repeat(stack.length) + trimmed);
        if (!masked.includes("</")) {
          stack.push("JSX_ELEMENT");
        }
        continue;
      }
      if (masked === "/>" || masked.startsWith("/>")) {
        stack.pop();
        formattedLines.push("  ".repeat(stack.length) + trimmed);
        continue;
      }
    }

    // Leading JSX closing tag `</Tag>`
    if (/^<\/[a-zA-Z0-9_.:-]*>/.test(masked)) {
      if (stack[stack.length - 1] === "JSX_HEAD") stack.pop();
      if (stack[stack.length - 1] === "JSX_ELEMENT") stack.pop();
    } else if (/^[}\])]/.test(masked)) {
      // Leading closing brace/bracket/paren (e.g. `}`, `});`, `}: Props) {`)
      if (stack[stack.length - 1] === "JSX_HEAD") stack.pop();
      if (stack.length > 0) stack.pop();
    }

    // Compute current line indentation (case/default get -1 visual offset inside switch)
    const isSwitchCase = /^(case\s+.+|default)\s*:/.test(masked);
    const visualDepth = Math.max(0, stack.length - (isSwitchCase ? 1 : 0));
    formattedLines.push("  ".repeat(visualDepth) + trimmed);

    // --- INDENT AFTER PRINTING LINE ---
    // If currently inside a multi-line JSX tag head, check if this prop line closes the head
    if (stack[stack.length - 1] === "JSX_HEAD") {
      if (masked.endsWith("/>")) {
        stack.pop();
        continue;
      }
      if (masked.endsWith(">") && !masked.endsWith("=>")) {
        stack.pop();
        stack.push("JSX_ELEMENT");
        continue;
      }
      continue;
    }

    // Check if line starts a JSX tag (or `return (<Tag...`)
    const jsxStartMatch = masked.match(/^(?:return\s*\(\s*)?<([a-zA-Z][a-zA-Z0-9_.:-]*)\b/);
    if (jsxStartMatch) {
      const tagName = jsxStartMatch[1];
      const isVoid = HTML_VOID_TAGS.has(tagName.toLowerCase());
      const hasClosingBracket = masked.includes(">");
      const isSelfClosing = masked.endsWith("/>") || /\/>\s*[);,]*$/.test(masked);
      const hasSameLineClose =
        new RegExp(`</${tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`).test(masked) ||
        /<\/[a-zA-Z0-9_.:-]*>$/.test(masked);

      if (!hasClosingBracket) {
        // Multi-line JSX opening tag `<Component\n  prop={...}`
        stack.push("JSX_HEAD");
        continue;
      } else if (!isVoid && !isSelfClosing && !hasSameLineClose) {
        stack.push("JSX_ELEMENT");
        continue;
      }
    }

    // Standard block / paren / bracket balance on masked line
    // Ignore leading closing brackets already popped above
    const withoutLeadingClose = masked.replace(/^[}\])]+/, "");
    let openCount = 0;
    let closeCount = 0;
    for (let i = 0; i < withoutLeadingClose.length; i++) {
      const c = withoutLeadingClose[i];
      if (c === "{" || c === "(" || c === "[") openCount++;
      else if (c === "}" || c === ")" || c === "]") closeCount++;
    }

    if (openCount > closeCount) {
      stack.push("BLOCK");
    } else if (closeCount > openCount && stack.length > 0) {
      // Handle trailing closes on a line that didn't start with a close (e.g. `return foo; }`)
      stack.pop();
    }
  }

  return formattedLines.join("\n");
}
