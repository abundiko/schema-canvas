export type TokenType = "word" | "ident" | "string" | "number" | "punct";

export interface Token {
  type: TokenType;
  value: string;
}

const PUNCT = new Set(["(", ")", ",", ";", ".", "=", "*", "[", "]"]);

/** Lowercased keyword view of a token, ignoring its quoting flavor. */
export function kw(token: Token | undefined): string {
  if (!token) return "";
  if (token.type === "string" || token.type === "ident") {
    return token.value.toLowerCase();
  }
  return token.value.toLowerCase();
}

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const c = sql[i];

    // whitespace
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }

    // line comments: -- , # and // (MySQL)
    if (c === "-" && sql[i + 1] === "-") {
      while (i < n && sql[i] !== "\n") i += 1;
      continue;
    }
    if (c === "#") {
      while (i < n && sql[i] !== "\n") i += 1;
      continue;
    }

    // block comments
    if (c === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }

    // quoted identifiers / strings
    if (c === "`" || c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      let value = "";
      while (j < n) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            value += quote;
            j += 2;
            continue;
          }
          break;
        }
        value += sql[j];
        j += 1;
      }
      // i: opening quote; j: closing quote (or n)
      tokens.push({
        type: quote === "`" || quote === '"' ? "ident" : "string",
        value,
      });
      i = j + 1;
      continue;
    }

    // bracketed identifier: [foo] — but an empty [] is postgres array syntax
    if (c === "[") {
      let j = i + 1;
      if (sql[j] === "]") {
        tokens.push({ type: "punct", value: "[" });
        i += 1;
        continue;
      }
      let value = "";
      while (j < n && sql[j] !== "]") {
        value += sql[j];
        j += 1;
      }
      tokens.push({ type: "ident", value });
      i = j + 1;
      continue;
    }

    // number
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(sql[i + 1] ?? ""))) {
      let j = i;
      let value = "";
      while (j < n && /[0-9]/.test(sql[j])) {
        value += sql[j];
        j += 1;
      }
      if (sql[j] === "." && /[0-9]/.test(sql[j + 1] ?? "")) {
        value += ".";
        j += 1;
        while (j < n && /[0-9]/.test(sql[j])) {
          value += sql[j];
          j += 1;
        }
      }
      tokens.push({ type: "number", value });
      i = j;
      continue;
    }

    // punctuation
    if (PUNCT.has(c)) {
      tokens.push({ type: "punct", value: c });
      i += 1;
      continue;
    }

    // bare word / identifier
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      let value = "";
      while (j < n && /[A-Za-z0-9_$]/.test(sql[j])) {
        value += sql[j];
        j += 1;
      }
      tokens.push({ type: "word", value });
      i = j;
      continue;
    }

    // unknown single char — skip
    i += 1;
  }

  return tokens;
}

/** Split token stream into statements on top-level `;` (paren depth 0). */
export function splitStatements(tokens: Token[]): Token[][] {
  const statements: Token[][] = [];
  let current: Token[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.type === "punct" && token.value === "(") depth += 1;
    if (token.type === "punct" && token.value === ")") depth = Math.max(0, depth - 1);
    if (token.type === "punct" && token.value === ";" && depth === 0) {
      if (current.length > 0) statements.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) statements.push(current);
  return statements;
}
