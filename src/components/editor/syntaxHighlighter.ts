/**
 * Deep Granular Semantic Syntax Highlighter for DRACODECK (Cyberpunk Violet Theme)
 * Granular classification across 16+ semantic token types:
 * - Control Keywords vs Declaration Keywords
 * - Types & Built-ins
 * - Function Definitions vs Invocations
 * - Object Properties (.property)
 * - Decorators & Attributes
 * - Booleans, Nulls, Numbers
 * - String & Template Literals
 * - Operators & Punctuation
 * - Comments & Markdown
 */

export type TokenType =
  | "kw-control"
  | "kw-decl"
  | "type"
  | "fn-def"
  | "fn-call"
  | "prop"
  | "str"
  | "template"
  | "num"
  | "bool"
  | "operator"
  | "punct"
  | "decorator"
  | "tag"
  | "attr"
  | "cmt"
  | "heading"
  | "md-code"
  | "text";

export interface Token {
  type: TokenType;
  value: string;
}

const CONTROL_KEYWORDS = new Set([
  "if", "else", "switch", "case", "default", "break", "continue", "return",
  "try", "catch", "finally", "throw", "while", "do", "for", "in", "of",
  "await", "yield", "elif", "except", "with", "raise", "pass", "loop",
  "match", "where", "move", "unsafe", "select", "from", "where", "group", "having"
]);

const DECLARATION_KEYWORDS = new Set([
  "import", "export", "from", "as", "const", "let", "var", "function", "class",
  "extends", "implements", "interface", "type", "enum", "namespace", "declare",
  "def", "lambda", "global", "nonlocal", "fn", "let", "mut", "pub", "struct",
  "impl", "trait", "mod", "crate", "use", "void", "async", "sync", "new", "delete",
  "static", "readonly", "private", "protected", "public", "abstract", "mixin"
]);

const BUILTIN_TYPES = new Set([
  "string", "number", "boolean", "any", "unknown", "never", "void", "symbol", "bigint",
  "Promise", "Array", "Record", "Map", "Set", "Object", "Function", "Date", "RegExp",
  "int", "float", "str", "bool", "list", "dict", "tuple", "set",
  "i8", "i16", "i32", "i64", "i128", "isize", "u8", "u16", "u32", "u64", "u128", "usize",
  "f32", "f64", "char", "bool", "Option", "Result", "String", "Vec"
]);

const BOOLEAN_NULLS = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity",
  "True", "False", "None", "self", "this", "super", "Ok", "Err", "Some", "nil"
]);

export function highlightCode(code: string, fileName?: string): Token[][] {
  const ext = (fileName?.split(".").pop() || "txt").toLowerCase();
  const lines = code.split("\n");

  return lines.map((line) => {
    const tokens: Token[] = [];
    let i = 0;

    // Special Markdown handling
    if (ext === "md" || ext === "mdx") {
      const headingMatch = line.match(/^(#{1,6}\s+.*)$/);
      if (headingMatch) {
        return [{ type: "heading", value: line }];
      }
      if (line.trim().startsWith("```")) {
        return [{ type: "md-code", value: line }];
      }
      if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
        const bulletMatch = line.match(/^(\s*[-*+]\s|\s*\d+\.\s)/);
        if (bulletMatch) {
          tokens.push({ type: "operator", value: bulletMatch[0] });
          i += bulletMatch[0].length;
        }
      }
    }

    // Full-line Comments
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
      // In-line comments
      if (line.slice(i, i + 2) === "//") {
        tokens.push({ type: "cmt", value: line.slice(i) });
        break;
      }
      if (line[i] === "#" && ext !== "md" && ext !== "css") {
        tokens.push({ type: "cmt", value: line.slice(i) });
        break;
      }

      // Strings (double or single quotes)
      const char = line[i];
      if (char === '"' || char === "'") {
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

      // Template Literals (backticks)
      if (char === "`") {
        let tmplVal = "`";
        i++;
        while (i < line.length && line[i] !== "`") {
          if (line[i] === "\\" && i + 1 < line.length) {
            tmplVal += line[i] + line[i + 1];
            i += 2;
          } else {
            tmplVal += line[i];
            i++;
          }
        }
        if (i < line.length) {
          tmplVal += line[i];
          i++;
        }
        tokens.push({ type: "template", value: tmplVal });
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

      // Decorators / Rust attributes (@decorator, #[attribute])
      if (char === "@" && /^[a-zA-Z_$]/.test(line[i + 1] || "")) {
        const decMatch = line.slice(i).match(/^@[a-zA-Z0-9_$]+/);
        if (decMatch) {
          tokens.push({ type: "decorator", value: decMatch[0] });
          i += decMatch[0].length;
          continue;
        }
      }

      // Numbers (hex, float, decimal)
      const numMatch = line.slice(i).match(/^(0x[0-9a-fA-F]+|-?\b\d+(\.\d+)?(n|f|u)?\b)/);
      if (numMatch) {
        tokens.push({ type: "num", value: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }

      // Operators (multi-char first: ===, !==, =>, &&, ||, etc.)
      const opMatch = line.slice(i).match(/^(===|!==|==|!=|=>|<=|>=|\+\+|--|&&|\|\||\.\.\.|\+=|-=|\*=|\/=|%=|\?|:|\+|-|\*|\/|%|=|!|<|>|&|\||\^)/);
      if (opMatch) {
        tokens.push({ type: "operator", value: opMatch[0] });
        i += opMatch[0].length;
        continue;
      }

      // Punctuation characters
      if (["(", ")", "{", "}", "[", "]", ";", ",", "."].includes(char)) {
        // Special case: check if . is property access or chained method call
        if (char === "." && i + 1 < line.length && /^[a-zA-Z_$]/.test(line[i + 1])) {
          tokens.push({ type: "punct", value: "." });
          i++;
          const propMatch = line.slice(i).match(/^[a-zA-Z0-9_$]+/);
          if (propMatch) {
            const memberName = propMatch[0];
            const nextChar = line[i + memberName.length];
            if (nextChar === "(") {
              tokens.push({ type: "fn-call", value: memberName });
            } else {
              tokens.push({ type: "prop", value: memberName });
            }
            i += memberName.length;
            continue;
          }
        }
        tokens.push({ type: "punct", value: char });
        i++;
        continue;
      }

      // Words (identifiers, keywords, functions)
      const wordMatch = line.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (wordMatch) {
        const word = wordMatch[0];
        const nextChar = line[i + word.length];

        // Check preceding token to distinguish function definition
        const lastToken = tokens[tokens.length - 1];
        const isPrevDecl = lastToken && (lastToken.value === "function" || lastToken.value === "def" || lastToken.value === "fn");

        if (CONTROL_KEYWORDS.has(word)) {
          tokens.push({ type: "kw-control", value: word });
        } else if (DECLARATION_KEYWORDS.has(word)) {
          tokens.push({ type: "kw-decl", value: word });
        } else if (BOOLEAN_NULLS.has(word)) {
          tokens.push({ type: "bool", value: word });
        } else if (BUILTIN_TYPES.has(word)) {
          tokens.push({ type: "type", value: word });
        } else if (isPrevDecl) {
          tokens.push({ type: "fn-def", value: word });
        } else if (nextChar === "(") {
          tokens.push({ type: "fn-call", value: word });
        } else if (/^[A-Z][a-zA-Z0-9_$]*$/.test(word)) {
          tokens.push({ type: "type", value: word });
        } else if (ext === "json" && nextChar === ":") {
          tokens.push({ type: "attr", value: word });
        } else {
          tokens.push({ type: "text", value: word });
        }

        i += word.length;
        continue;
      }

      // Fallback for whitespace and other symbols
      tokens.push({ type: "text", value: char });
      i++;
    }

    return tokens;
  });
}
