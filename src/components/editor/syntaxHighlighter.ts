/**
 * Comprehensive Code Syntax Highlighter for DRACODECK (Cyberpunk Violet Theme)
 * Authentic tokenizer supporting: html, css, js, jsx, ts, tsx, py, dart, rs, json, md, sh, ps1, sql, yaml
 */

export interface Token {
  type: "text" | "kw" | "str" | "fn" | "type" | "num" | "tag" | "attr" | "cmt" | "heading" | "md-code";
  value: string;
}

const JS_TS_KEYWORDS = new Set([
  "import", "export", "from", "default", "const", "let", "var", "function", "return",
  "if", "else", "switch", "case", "break", "for", "while", "do", "try", "catch",
  "finally", "throw", "async", "await", "class", "extends", "new", "this", "super",
  "typeof", "instanceof", "in", "of", "yield", "interface", "type", "enum", "namespace",
  "declare", "as", "is", "keyof", "readonly", "private", "protected", "public",
  "implements", "unknown", "any", "never", "void", "true", "false", "null", "undefined"
]);

const PYTHON_KEYWORDS = new Set([
  "def", "class", "import", "from", "as", "return", "if", "elif", "else",
  "for", "while", "try", "except", "finally", "with", "raise", "pass",
  "lambda", "yield", "global", "nonlocal", "assert", "async", "await",
  "True", "False", "None", "self", "in", "is", "not", "and", "or"
]);

const DART_KEYWORDS = new Set([
  "import", "as", "show", "hide", "export", "class", "extends", "with", "implements",
  "abstract", "mixin", "extension", "void", "return", "if", "else", "switch", "case",
  "for", "while", "do", "break", "continue", "async", "await", "sync", "yield",
  "var", "final", "const", "late", "required", "dynamic", "get", "set", "true", "false", "null"
]);

const RUST_KEYWORDS = new Set([
  "fn", "let", "mut", "pub", "struct", "enum", "impl", "trait", "match", "if",
  "else", "loop", "while", "for", "in", "return", "break", "continue", "use",
  "mod", "crate", "as", "where", "async", "await", "move", "unsafe", "type",
  "Some", "None", "Ok", "Err", "true", "false", "self", "Self"
]);

const SHELL_KEYWORDS = new Set([
  "echo", "cd", "ls", "cat", "grep", "mkdir", "rm", "cp", "mv", "chmod", "chown",
  "curl", "wget", "sudo", "export", "source", "if", "then", "else", "elif", "fi",
  "for", "while", "do", "done", "case", "esac", "exit", "return", "function",
  "Get-Process", "Stop-Process", "Write-Host", "Get-ChildItem", "Set-Item", "Clear-Host"
]);

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "UPDATE", "DELETE", "CREATE", "TABLE",
  "DROP", "ALTER", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ORDER", "BY",
  "GROUP", "HAVING", "LIMIT", "OFFSET", "AND", "OR", "NOT", "NULL", "AS", "VALUES",
  "select", "from", "where", "insert", "into", "update", "delete", "create", "table",
  "join", "left", "right", "inner", "order", "by", "group", "having", "limit"
]);

const CSS_PROPERTIES = new Set([
  "color", "background", "background-color", "display", "flex", "grid", "padding",
  "margin", "border", "font-size", "font-family", "width", "height", "position",
  "absolute", "relative", "fixed", "top", "left", "right", "bottom", "z-index",
  "opacity", "cursor", "overflow", "border-radius", "box-shadow", "transition"
]);

export function highlightCode(code: string, fileName?: string): Token[][] {
  const ext = (fileName?.split(".").pop() || "txt").toLowerCase();
  const lines = code.split("\n");

  let keywords: Set<string> | null = null;
  if (["js", "jsx", "ts", "tsx"].includes(ext)) {
    keywords = JS_TS_KEYWORDS;
  } else if (ext === "py") {
    keywords = PYTHON_KEYWORDS;
  } else if (ext === "dart") {
    keywords = DART_KEYWORDS;
  } else if (ext === "rs") {
    keywords = RUST_KEYWORDS;
  } else if (["sh", "bash", "ps1"].includes(ext)) {
    keywords = SHELL_KEYWORDS;
  } else if (ext === "sql") {
    keywords = SQL_KEYWORDS;
  } else if (["css", "scss"].includes(ext)) {
    keywords = CSS_PROPERTIES;
  }

  return lines.map((line) => {
    const tokens: Token[] = [];
    let i = 0;

    // Special Markdown handling
    if (ext === "md") {
      const headingMatch = line.match(/^(#{1,6}\s+.*)$/);
      if (headingMatch) {
        return [{ type: "heading", value: line }];
      }
      if (line.trim().startsWith("```")) {
        return [{ type: "md-code", value: line }];
      }
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ") || /^\d+\.\s/.test(line.trim())) {
        const bulletMatch = line.match(/^(\s*[-*]|\s*\d+\.)/);
        if (bulletMatch) {
          tokens.push({ type: "kw", value: bulletMatch[0] });
          i += bulletMatch[0].length;
        }
      }
    }

    // Single-line full comment check
    const trimmed = line.trimStart();
    if (
      trimmed.startsWith("//") ||
      (trimmed.startsWith("#") && ext !== "md" && ext !== "css") ||
      trimmed.startsWith("--") ||
      trimmed.startsWith("/*")
    ) {
      return [{ type: "cmt", value: line }];
    }

    while (i < line.length) {
      // In-line comment check
      if (line.slice(i, i + 2) === "//") {
        tokens.push({ type: "cmt", value: line.slice(i) });
        break;
      }
      if (line[i] === "#" && ext !== "md" && ext !== "css") {
        tokens.push({ type: "cmt", value: line.slice(i) });
        break;
      }

      // Strings (double quotes, single quotes, backticks)
      const char = line[i];
      if (char === '"' || char === "'" || char === "`") {
        const quote = char;
        let strVal = quote;
        i++;
        while (i < line.length && line[i] !== quote) {
          if (line[i] === "\\" && i + 1 < line.length) {
            strVal += line[i] + line[i + 1];
            i += 2;
          } else {
            strVal += line[i];
            i++;
          }
        }
        if (i < line.length) {
          strVal += line[i];
          i++;
        }
        tokens.push({ type: "str", value: strVal });
        continue;
      }

      // HTML / JSX opening and closing tags
      if (char === "<" && ["html", "jsx", "tsx", "xml"].includes(ext)) {
        const tagMatch = line.slice(i).match(/^<(\/?[a-zA-Z0-9_-]+)/);
        if (tagMatch) {
          tokens.push({ type: "tag", value: tagMatch[0] });
          i += tagMatch[0].length;
          continue;
        }
      }

      // Numbers (decimal, float, hex)
      const numMatch = line.slice(i).match(/^(0x[0-9a-fA-F]+|-?\b\d+(\.\d+)?\b)/);
      if (numMatch) {
        tokens.push({ type: "num", value: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }

      // Words (identifiers, keywords, types, functions)
      const wordMatch = line.slice(i).match(/^[a-zA-Z_$@][a-zA-Z0-9_$-]*/);
      if (wordMatch) {
        const word = wordMatch[0];
        const nextChar = line[i + word.length];

        if (keywords && keywords.has(word)) {
          tokens.push({ type: "kw", value: word });
        } else if (nextChar === "(") {
          tokens.push({ type: "fn", value: word });
        } else if (/^[A-Z]/.test(word) && ext !== "sql") {
          tokens.push({ type: "type", value: word });
        } else if (ext === "json" && nextChar === ":") {
          tokens.push({ type: "attr", value: word });
        } else {
          tokens.push({ type: "text", value: word });
        }

        i += word.length;
        continue;
      }

      // Punctuation, operators, spaces
      tokens.push({ type: "text", value: char });
      i++;
    }

    return tokens;
  });
}
