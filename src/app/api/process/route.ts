import { type NextRequest, NextResponse } from "next/server";

interface ProcessResult {
  language: string;
  lineCount: number;
  charCount: number;
  blankLines: number;
  commentLines: number;
  functions: string[];
  imports: string[];
  complexity: {
    cyclomaticEstimate: number;
    nestingDepth: number;
    longestFunction: string;
    longestFunctionLines: number;
  };
  patterns: { type: string; line: number; detail: string }[];
}

function detectLanguage(code: string): string {
  // TypeScript first — has type annotations or ES module imports
  if (/:\s*(string|number|boolean|void|any|never|unknown)\b/.test(code)) return "TypeScript";
  if (/^\s*(import|export)\s+.*from\s+['"]/.test(code) && /interface\s+\w+|type\s+\w+/.test(code)) return "TypeScript";

  // Python — def/class with colon-based blocks
  if (/^\s*def\s+\w+\s*\(/m.test(code)) return "Python";
  if (/^\s*class\s+\w+.*:/m.test(code) && !/^\s*class\s+\w+\s*\{/m.test(code)) return "Python";

  // Go — func keyword with word boundary (not "function")
  if (/^\s*func\s+\w+/m.test(code) || /^\s*package\s+\w+/m.test(code)) return "Go";

  // Rust
  if (/^\s*(fn\s+\w+|let\s+mut\s+|impl\s+|use\s+\w+::)/m.test(code)) return "Rust";

  // Java
  if (/^\s*(public\s+static\s+void|class\s+\w+\s+extends|import\s+java\.)/m.test(code)) return "Java";

  // C/C++
  if (/^\s*#include\s*[<"]|^\s*int\s+main\s*\(/m.test(code)) return "C/C++";

  // JavaScript — function keyword, const/let/var, arrow functions, console
  if (/\bfunction\s+\w+\s*\(/.test(code)) return "JavaScript";
  if (/^\s*(const|let|var)\s+\w+\s*=/.test(code) || /=>\s*[{(]/.test(code)) return "JavaScript";
  if (/console\.(log|error|warn|debug)/.test(code)) return "JavaScript";

  // HTML
  if (/<\w+[\s>]|<\/\w+>/.test(code)) return "HTML";

  // JSON
  if (/^\s*\{[\s\S]*"[\w]+":\s*/.test(code)) return "JSON";

  // SQL
  if (/^\s*SELECT\s+|^\s*INSERT\s+|^\s*CREATE\s+TABLE/im.test(code)) return "SQL";

  return "Unknown";
}

function extractFunctions(code: string, lang: string): string[] {
  const fns: string[] = [];
  const patterns: RegExp[] = [];
  if (lang === "TypeScript" || lang === "JavaScript") {
    patterns.push(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\w+\s*=>/g,
    );
  } else if (lang === "Python") {
    patterns.push(/def\s+(\w+)\s*\(/g);
  } else if (lang === "Go") {
    patterns.push(/func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g);
  } else if (lang === "Rust") {
    patterns.push(/fn\s+(\w+)/g);
  } else if (lang === "Java") {
    patterns.push(/(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(/g);
  }
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(code)) !== null) {
      if (!["if", "for", "while", "switch", "catch", "else", "return", "console"].includes(m[1])) {
        fns.push(m[1]);
      }
    }
  }
  return Array.from(new Set(fns));
}

function extractImports(code: string): string[] {
  const imports: string[] = [];
  const importRe = /(?:import|from|require|use)\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(code)) !== null) imports.push(m[1]);
  return Array.from(new Set(imports)).slice(0, 20);
}

function countComments(code: string, lang: string): number {
  let count = 0;
  const lines = code.split("\n");
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (lang === "Python") {
      if (trimmed.startsWith("#")) count++;
    } else {
      if (inBlock) {
        count++;
        if (trimmed.includes("*/")) inBlock = false;
      } else if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
        count++;
      } else if (trimmed.startsWith("/*")) {
        count++;
        if (!trimmed.includes("*/")) inBlock = true;
      }
    }
  }
  return count;
}

function estimateComplexity(code: string) {
  const lines = code.split("\n");
  let cyclomatic = 1;
  let maxDepth = 0;
  let currentDepth = 0;
  const fnBodies: Record<string, number> = {};
  let currentFn = "";
  let fnStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const fnMatch = trimmed.match(/(?:(?:async\s+)?function|const\s+\w+\s*=\s*(?:async\s*)?(?:\(|function)|def\s+)(\w+)?/);
    if (fnMatch && !currentFn) {
      currentFn = fnMatch[1] || `anonymous_${i}`;
      fnStart = i;
    }
    if (/\b(if|else\s+if|elif|else|case|catch|&&|\|\||\?)/.test(trimmed)) cyclomatic++;
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    currentDepth += opens - closes;
    if (currentDepth > maxDepth) maxDepth = currentDepth;
    if (currentDepth < 0) currentDepth = 0;
    if (currentFn && currentDepth === 0 && (trimmed === "}" || i === lines.length - 1)) {
      fnBodies[currentFn] = i - fnStart;
      currentFn = "";
    }
  }

  let longestFn = "N/A";
  let longestLines = 0;
  for (const [fn, len] of Object.entries(fnBodies)) {
    if (len > longestLines) { longestLines = len; longestFn = fn; }
  }
  return { cyclomaticEstimate: cyclomatic, nestingDepth: maxDepth, longestFunction: longestFn, longestFunctionLines: longestLines };
}

function detectPatterns(code: string): { type: string; line: number; detail: string }[] {
  const patterns: { type: string; line: number; detail: string }[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 1;
    if (/console\.(log|warn|error|debug)/.test(line)) patterns.push({ type: "debug", line: n, detail: "Console output — remove before production" });
    if (/TODO|FIXME|HACK|XXX/.test(line)) patterns.push({ type: "todo", line: n, detail: "Unfinished work marker" });
    if (/password|secret|api.?key|token|credential/i.test(line) && /=\s*['"][^'"]+['"]/.test(line)) patterns.push({ type: "security", line: n, detail: "Possible hardcoded credential" });
    if (/eval\s*\(|new\s+Function\s*\(/.test(line)) patterns.push({ type: "security", line: n, detail: "Dynamic code execution — injection risk" });
    if (/:\s*any\b/.test(line)) patterns.push({ type: "quality", line: n, detail: "TypeScript 'any' type — weakens type safety" });
    if (/catch\s*\(\s*\w*\s*\)\s*\{\s*\}/.test(line)) patterns.push({ type: "quality", line: n, detail: "Empty catch block" });
    if (line.length > 120) patterns.push({ type: "style", line: n, detail: `Line exceeds 120 chars (${line.length})` });
  }
  return patterns.slice(0, 30);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code: string = body.input || "";
    if (!code.trim()) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const lines = code.split("\n");
    const language = detectLanguage(code);
    const functions = extractFunctions(code, language);
    const imports = extractImports(code);
    const commentLines = countComments(code, language);
    const blankLines = lines.filter((l) => l.trim() === "").length;
    const complexity = estimateComplexity(code);
    const patterns = detectPatterns(code);

    const result: ProcessResult = {
      language, lineCount: lines.length, charCount: code.length,
      blankLines, commentLines, functions, imports, complexity, patterns,
    };
    return NextResponse.json({ input: code, processed: result });
  } catch {
    return NextResponse.json({ error: "Failed to process code" }, { status: 500 });
  }
}
