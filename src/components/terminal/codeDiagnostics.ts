export interface CodeDiagnosticItem {
  id: string;
  file: string;
  filePath: string;
  line: number;
  col: number;
  severity: "error" | "warning";
  message: string;
  source: string;
}

const JS_VALID_LEADING_KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "async",
  "class",
  "interface",
  "type",
  "enum",
  "import",
  "export",
  "return",
  "throw",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "new",
  "delete",
  "typeof",
  "void",
  "yield",
  "await",
  "debugger",
  "public",
  "private",
  "protected",
  "readonly",
  "static",
  "declare",
  "abstract",
  "namespace",
  "module",
  "from",
  "as",
  "of",
  "in",
  "is",
  "keyof",
  "infer",
  "extends",
  "implements",
  "satisfies",
  "get",
  "set",
]);

const COMMON_KEYWORD_TYPOS: Record<string, string> = {
  cosnt: "const",
  cnst: "const",
  conts: "const",
  lte: "let",
  vra: "var",
  functoin: "function",
  funtion: "function",
  funciton: "function",
  fnction: "function",
  reutrn: "return",
  retun: "return",
  retrun: "return",
  improt: "import",
  ipmort: "import",
  exprot: "export",
  expotr: "export",
  consoel: "console",
  cosnole: "console",
  docuemnt: "document",
  widnow: "window",
  undefiend: "undefined",
  booleann: "boolean",
  stirng: "string",
  nubmer: "number",
  interafce: "interface",
  pritn: "print",
  dfe: "def",
  esle: "else",
  whlie: "while",
};

const HTML_VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Strip comments and string contents on a single line while preserving character positions
 * so line-level syntax checks do not false-positive on comments or string literals.
 */
function maskStringsAndLineComments(
  lines: string[],
  hashComments = false
): string[] {
  const masked: string[] = [];
  let inBlockComment = false;
  let inTemplate = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let out = "";
    let j = 0;

    while (j < line.length) {
      const ch = line[j];
      const next = line[j + 1];

      if (inBlockComment) {
        if (ch === "*" && next === "/") {
          inBlockComment = false;
          out += "  ";
          j += 2;
        } else {
          out += " ";
          j++;
        }
        continue;
      }

      if (inTemplate) {
        if (ch === "\\") {
          out += "  ";
          j += 2;
          continue;
        }
        if (ch === "`") {
          inTemplate = false;
          out += '"';
          j++;
          continue;
        }
        out += "x";
        j++;
        continue;
      }

      if (ch === "/" && next === "/") {
        out += " ".repeat(line.length - j);
        break;
      }

      if (hashComments && ch === "#") {
        out += " ".repeat(line.length - j);
        break;
      }

      if (ch === "/" && next === "*") {
        inBlockComment = true;
        out += "  ";
        j += 2;
        continue;
      }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        out += '"';
        j++;
        while (j < line.length) {
          if (line[j] === "\\") {
            out += "  ";
            j += 2;
            continue;
          }
          if (line[j] === quote) {
            out += '"';
            j++;
            break;
          }
          out += "x";
          j++;
        }
        continue;
      }

      if (ch === "`") {
        inTemplate = true;
        out += '"';
        j++;
        continue;
      }

      out += ch;
      j++;
    }

    masked.push(out);
  }

  return masked;
}

export function analyzeCodeProblems(
  fileName: string,
  filePath: string,
  content: string
): CodeDiagnosticItem[] {
  if (!fileName || !content) return [];
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif", "md", "txt", "lock"].includes(
      ext
    )
  ) {
    return [];
  }

  const diagnostics: CodeDiagnosticItem[] = [];
  const lines = content.split("\n");

  const addError = (
    line: number,
    col: number,
    message: string,
    source: string,
    severity: "error" | "warning" = "error"
  ) => {
    if (diagnostics.length >= 60) return;
    const dup = diagnostics.some(
      (d) => d.line === line && d.message === message
    );
    if (!dup) {
      diagnostics.push({
        id: `${filePath}-${line}-${col}-${diagnostics.length}`,
        file: fileName,
        filePath,
        line,
        col: Math.max(1, col),
        severity,
        message,
        source,
      });
    }
  };

  // 1. JSON Validation
  if (ext === "json") {
    try {
      JSON.parse(content);
    } catch (err: any) {
      const msg = err?.message || "Invalid JSON syntax";
      const posMatch = msg.match(/position\s+(\d+)/i);
      let line = 1;
      let col = 1;
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const slice = content.slice(0, pos);
        const split = slice.split("\n");
        line = split.length;
        col = split[split.length - 1].length + 1;
      }
      addError(line, col, msg, "JSON Parser");
    }
    return diagnostics;
  }

  const isJsTs = ["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext);
  const isHtmlLike = ["html", "htm", "xml", "vue", "svelte", "jsx", "tsx"].includes(ext);
  const isCssLike = ["css", "scss", "less"].includes(ext);
  const isPython = ext === "py";
  const isCStyle = ["c", "cpp", "h", "hpp", "cs", "java", "rs", "go", "php"].includes(ext);

  // 2. Bracket, Brace, Parenthesis & String Quote Scanner (skip pure HTML files for quote/brace noise)
  if (!["html", "htm", "xml"].includes(ext)) {
    const stack: { char: string; expected: string; line: number; col: number }[] = [];
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
    const closers: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let singleStartCol = 1;
      let doubleStartCol = 1;
      inSingle = false;
      inDouble = false;

      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        const next = line[j + 1];

        if (inBlockComment) {
          if (ch === "*" && next === "/") {
            inBlockComment = false;
            j++;
          }
          continue;
        }

        if (!inSingle && !inDouble && !inBacktick) {
          if (ch === "/" && next === "/") break;
          if (isPython && ch === "#") break;
          if (ch === "/" && next === "*") {
            inBlockComment = true;
            j++;
            continue;
          }
        }

        if (ch === "\\" && (inSingle || inDouble || inBacktick)) {
          j++;
          continue;
        }

        if (!inDouble && !inBacktick && ch === "'") {
          // Ignore Rust lifetimes or English contractions inside JSX text if needed
          inSingle = !inSingle;
          if (inSingle) singleStartCol = j + 1;
          continue;
        }
        if (!inSingle && !inBacktick && ch === '"') {
          inDouble = !inDouble;
          if (inDouble) doubleStartCol = j + 1;
          continue;
        }
        if (!inSingle && !inDouble && ch === "`") {
          inBacktick = !inBacktick;
          continue;
        }

        if (inSingle || inDouble || inBacktick) continue;

        if (pairs[ch]) {
          stack.push({ char: ch, expected: pairs[ch], line: i + 1, col: j + 1 });
        } else if (closers[ch]) {
          const last = stack.pop();
          if (!last) {
            addError(
              i + 1,
              j + 1,
              `Unexpected closing '${ch}' with no matching opening '${closers[ch]}'`,
              "Syntax"
            );
          } else if (last.char !== closers[ch]) {
            addError(
              i + 1,
              j + 1,
              `Mismatched delimiter '${ch}': expected '${last.expected}' to close '${last.char}' from line ${last.line}`,
              "Syntax"
            );
          }
        }
      }

      if (inSingle && ext !== "rs") {
        addError(i + 1, singleStartCol, "Unterminated single-quoted string literal", "Syntax");
      }
      if (inDouble) {
        addError(i + 1, doubleStartCol, "Unterminated double-quoted string literal", "Syntax");
      }
    }

    for (const unclosed of stack.slice(-8)) {
      addError(
        unclosed.line,
        unclosed.col,
        `Unclosed '${unclosed.char}' — missing '${unclosed.expected}'`,
        "Syntax"
      );
    }
  }

  // 3. HTML / JSX / TSX Tag Matching & Broken Tag Validator
  if (isHtmlLike) {
    const tagStack: { name: string; line: number; col: number }[] = [];
    const maskedLines = maskStringsAndLineComments(lines, false);

    for (let i = 0; i < maskedLines.length; i++) {
      const rawLine = lines[i];
      const line = maskedLines[i];

      // Check broken attribute assignment e.g. className=> or id=>
      const brokenAttr = rawLine.match(/\b([a-zA-Z_:][-a-zA-Z0-9_:.]*)=\s*(?:>|\/>)/);
      if (brokenAttr) {
        addError(
          i + 1,
          rawLine.indexOf(brokenAttr[0]) + 1,
          `Attribute '${brokenAttr[1]}' is missing a value after '='`,
          "Markup"
        );
      }

      // Match HTML/JSX tags on this line: <TagName ...> or </TagName>
      const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9._-]*)[^>]*>/g;
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(line)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];
        const col = match.index + 1;

        // Skip TypeScript generic false-positives like Array<string> or useState<number>(
        const charBefore = match.index > 0 ? line[match.index - 1] : " ";
        const charAfter = line[match.index + fullTag.length] || " ";
        if (/[a-zA-Z0-9_$]/.test(charBefore) || charAfter === "(") {
          continue;
        }

        const isClosing = fullTag.startsWith("</");
        const isSelfClosing =
          fullTag.endsWith("/>") || HTML_VOID_TAGS.has(tagName.toLowerCase());

        if (isSelfClosing && !isClosing) {
          continue;
        }

        if (!isClosing) {
          tagStack.push({ name: tagName, line: i + 1, col });
        } else {
          const last = tagStack.pop();
          if (!last) {
            addError(
              i + 1,
              col,
              `Unexpected closing tag '</${tagName}>' with no matching opening tag`,
              "JSX/HTML"
            );
          } else if (last.name !== tagName) {
            addError(
              i + 1,
              col,
              `Expected closing tag '</${last.name}>' (opened on line ${last.line}) but found '</${tagName}>'`,
              "JSX/HTML"
            );
          }
        }
      }
    }

    for (const unclosedTag of tagStack.slice(-5)) {
      addError(
        unclosedTag.line,
        unclosedTag.col,
        `JSX/HTML element '<${unclosedTag.name}>' has no corresponding closing tag '</${unclosedTag.name}>'`,
        "JSX/HTML"
      );
    }
  }

  // 4. Deep JS / TS / JSX / TSX Statement & Expression Diagnostics
  if (isJsTs) {
    const maskedLines = maskStringsAndLineComments(lines, false);

    for (let i = 0; i < maskedLines.length; i++) {
      const mLine = maskedLines[i];
      const trimmed = mLine.trim();
      if (!trimmed) continue;

      const firstCharCol = mLine.length - mLine.trimStart().length + 1;

      // 4a. Check common keyword/global typos anywhere on the line
      const wordRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
      let wMatch: RegExpExecArray | null;
      while ((wMatch = wordRegex.exec(mLine)) !== null) {
        const w = wMatch[1];
        if (COMMON_KEYWORD_TYPOS[w]) {
          addError(
            i + 1,
            wMatch.index + 1,
            `Unknown identifier '${w}'. Did you mean '${COMMON_KEYWORD_TYPOS[w]}'?`,
            "TypeScript/JS"
          );
        }
      }

      // 4b. Check two consecutive identifiers at start of statement (e.g., "ini salah", "foo bar = 1", "constt x = 1")
      const twoIdentMatch = trimmed.match(
        /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(.*)$/
      );
      if (twoIdentMatch) {
        const firstWord = twoIdentMatch[1];
        const secondWord = twoIdentMatch[2];
        const rest = twoIdentMatch[3].trim();
        if (
          !JS_VALID_LEADING_KEYWORDS.has(firstWord) &&
          !["as", "is", "in", "of", "from", "satisfies", "extends", "implements"].includes(
            secondWord
          )
        ) {
          addError(
            i + 1,
            firstCharCol,
            `SyntaxError: Unexpected identifier '${secondWord}' after '${firstWord}'. Missing operator or invalid keyword '${firstWord}'.`,
            "TypeScript/JS"
          );
        } else if (
          ["const", "let", "var"].includes(firstWord) &&
          JS_VALID_LEADING_KEYWORDS.has(secondWord) &&
          !["from", "as", "of", "in", "async"].includes(secondWord)
        ) {
          addError(
            i + 1,
            firstCharCol,
            `SyntaxError: '${secondWord}' is a reserved keyword and cannot be used as a variable name`,
            "TypeScript/JS"
          );
        } else if (firstWord === "const" && rest === ";") {
          addError(
            i + 1,
            firstCharCol,
            `SyntaxError: 'const' declarations must be initialized ('const ${secondWord} = ...')`,
            "TypeScript/JS"
          );
        }
      }

      // 4c. Check bare standalone identifier on a line that isn't a valid statement/expression continuation
      const singleWordMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*);?$/);
      if (singleWordMatch) {
        const word = singleWordMatch[1];
        const prevTrimmed = i > 0 ? maskedLines[i - 1].trim() : "";
        const nextTrimmed = i + 1 < maskedLines.length ? maskedLines[i + 1].trim() : "";
        const validSolo = new Set([
          "return",
          "break",
          "continue",
          "debugger",
          "else",
          "try",
          "finally",
          "default",
        ]);
        const prevContinues =
          /[+\-*/%&|^=<>?:,(\[{]$/.test(prevTrimmed) ||
          prevTrimmed.endsWith("=>") ||
          prevTrimmed.endsWith("return") ||
          prevTrimmed.endsWith("throw") ||
          prevTrimmed.endsWith("await") ||
          prevTrimmed.endsWith("yield") ||
          prevTrimmed.endsWith("typeof") ||
          prevTrimmed.endsWith("void") ||
          prevTrimmed.endsWith("delete") ||
          prevTrimmed.endsWith("new") ||
          prevTrimmed.endsWith("case") ||
          prevTrimmed.endsWith("import") ||
          prevTrimmed.endsWith("export") ||
          prevTrimmed.endsWith("type") ||
          prevTrimmed.endsWith("interface");
        const nextContinues =
          /^[.\[(?:+\-*/%&|^=<>!,}]/.test(nextTrimmed) ||
          nextTrimmed.startsWith("from ") ||
          nextTrimmed.startsWith("=>");

        if (!validSolo.has(word) && !prevContinues && !nextContinues) {
          addError(
            i + 1,
            firstCharCol,
            `Syntax/Reference Error: Unexpected standalone identifier '${word}' (not a valid statement or declaration)`,
            "TypeScript/JS"
          );
        }
      }

      // 4d. Dangling assignment or binary operator before semicolon (e.g. "const x = ;", "a = ;", "return + ;")
      const danglingSemi = trimmed.match(/([=+\-*/%&|^<>!]+)\s*;$/);
      if (danglingSemi && !["++", "--"].includes(danglingSemi[1])) {
        addError(
          i + 1,
          mLine.lastIndexOf(danglingSemi[1]) + 1,
          `SyntaxError: Expression expected after '${danglingSemi[1]}' before ';'`,
          "TypeScript/JS"
        );
      }

      // 4e. Dangling assignment at end of line when next line cannot be an expression
      if (/(?:^|[^=!<>])=\s*$/.test(trimmed) && !trimmed.endsWith("=>")) {
        const nextNonEmpty = maskedLines.slice(i + 1).find((l) => l.trim().length > 0)?.trim() || "";
        if (
          !nextNonEmpty ||
          /^(const|let|var|function|return|import|export|if|for|while|switch|try|catch|class|interface|type|\}|\)|\])\b/.test(
            nextNonEmpty
          )
        ) {
          addError(
            i + 1,
            mLine.lastIndexOf("=") + 1,
            "SyntaxError: Expression expected after '='",
            "TypeScript/JS"
          );
        }
      }

      // 4f. Control flow statements missing parentheses: if / for / while / switch / catch
      const badControl = trimmed.match(/^(if|for|while|switch|catch)\s+([^{(=\s].*)$/);
      if (badControl) {
        addError(
          i + 1,
          firstCharCol,
          `SyntaxError: Expected '(' after '${badControl[1]}'`,
          "TypeScript/JS"
        );
      }

      // 4g. Empty condition in if() / while() / switch()
      const emptyCond = trimmed.match(/^(if|while|switch|catch)\s*\(\s*\)/);
      if (emptyCond) {
        addError(
          i + 1,
          firstCharCol,
          `SyntaxError: Expression expected inside '${emptyCond[1]}(...)'`,
          "TypeScript/JS"
        );
      }

      // 4h. Invalid consecutive binary operators e.g. "+ *", "* /", "== ="
      const doubleOp = trimmed.match(/([+\-*/%])\s+([*/%])/);
      if (doubleOp) {
        addError(
          i + 1,
          mLine.indexOf(doubleOp[0]) + 1,
          `SyntaxError: Unexpected operator '${doubleOp[2]}' after '${doubleOp[1]}'`,
          "TypeScript/JS"
        );
      }

      // 4i. Broken import/export statements
      if (/^import\s+from\b/.test(trimmed)) {
        addError(
          i + 1,
          firstCharCol,
          "SyntaxError: Import clause expected before 'from'",
          "TypeScript/JS"
        );
      }
      if (/^(const|let|var)\s*[=;]/.test(trimmed)) {
        addError(
          i + 1,
          firstCharCol,
          "SyntaxError: Variable identifier expected after declaration keyword",
          "TypeScript/JS"
        );
      }
    }
  }

  // 5. CSS / SCSS / LESS Diagnostics
  if (isCssLike) {
    const maskedLines = maskStringsAndLineComments(lines, false);
    let braceDepth = 0;

    for (let i = 0; i < maskedLines.length; i++) {
      const mLine = maskedLines[i];
      const trimmed = mLine.trim();
      if (!trimmed) continue;

      const opens = (mLine.match(/\{/g) || []).length;
      const closes = (mLine.match(/\}/g) || []).length;

      if (braceDepth > 0 && opens === 0 && closes === 0 && !trimmed.startsWith("@")) {
        // Inside a CSS rule block: must contain ':'
        if (!trimmed.includes(":")) {
          addError(
            i + 1,
            mLine.length - mLine.trimStart().length + 1,
            `CSS Syntax Error: Expected ':' in property declaration '${trimmed}'`,
            "CSS"
          );
        } else {
          const afterColon = trimmed.split(":")[1]?.replace(/;/g, "").trim();
          if (!afterColon) {
            addError(
              i + 1,
              mLine.indexOf(":") + 1,
              "CSS Syntax Error: Property value expected after ':'",
              "CSS"
            );
          } else if (!trimmed.endsWith(";") && !trimmed.endsWith(",") && !trimmed.endsWith("{")) {
            addError(
              i + 1,
              mLine.length,
              "CSS Warning: Missing semicolon ';' at end of declaration",
              "CSS",
              "warning"
            );
          }
        }
      }

      braceDepth += opens - closes;
    }
  }

  // 6. Python Diagnostics
  if (isPython) {
    const maskedLines = maskStringsAndLineComments(lines, true);
    for (let i = 0; i < maskedLines.length; i++) {
      const mLine = maskedLines[i];
      const trimmed = mLine.trim();
      if (!trimmed) continue;
      const firstCol = mLine.length - mLine.trimStart().length + 1;

      if (
        /^(def|class|if|elif|else|for|while|try|except|finally|with)\b/.test(trimmed) &&
        !trimmed.endsWith(":") &&
        !trimmed.endsWith("\\") &&
        !trimmed.endsWith(",") &&
        !trimmed.endsWith("(")
      ) {
        addError(
          i + 1,
          mLine.length,
          "Python SyntaxError: expected ':' at end of block header",
          "Python"
        );
      }

      if (/(?:^|[^=!<>])=\s*$/.test(trimmed)) {
        addError(i + 1, mLine.lastIndexOf("=") + 1, "Python SyntaxError: invalid syntax after '='", "Python");
      }

      const twoWords = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (twoWords) {
        const w1 = twoWords[1];
        const w2 = twoWords[2];
        const validPy = new Set([
          "def",
          "class",
          "if",
          "elif",
          "for",
          "while",
          "import",
          "from",
          "return",
          "yield",
          "raise",
          "assert",
          "del",
          "global",
          "nonlocal",
          "async",
          "await",
          "with",
          "except",
          "not",
          "in",
          "is",
          "and",
          "or",
          "lambda",
          "case",
          "match",
          "type",
        ]);
        if (!validPy.has(w1) && !validPy.has(w2)) {
          addError(
            i + 1,
            firstCol,
            `Python SyntaxError: invalid syntax '${w1} ${w2}'`,
            "Python"
          );
        }
      }
    }
  }

  // 7. C / C++ / Rust / Go / Java / PHP Diagnostics
  if (isCStyle) {
    const maskedLines = maskStringsAndLineComments(lines, ext === "php");
    for (let i = 0; i < maskedLines.length; i++) {
      const mLine = maskedLines[i];
      const trimmed = mLine.trim();
      if (!trimmed) continue;

      if (/([=+\-*/%&|^<>!]+)\s*;$/.test(trimmed) && !trimmed.endsWith("++;") && !trimmed.endsWith("--;")) {
        addError(
          i + 1,
          mLine.lastIndexOf(";") + 1,
          "Syntax Error: Expression expected before ';'",
          ext.toUpperCase()
        );
      }
    }
  }

  return diagnostics;
}
