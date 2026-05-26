import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code: string = body.input || "";
    const language: string = body.language || "Unknown";
    const analysis: string = body.analysis || "";

    if (!code.trim()) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const apiKey = process.env.MIMO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "MIMO_API_KEY not configured" }, { status: 500 });
    }

    const prompt = `You are CodeLens, an expert AI code reviewer. Analyze the following ${language} code and provide a thorough review.

Code to review:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Static analysis results:
${analysis}

Provide your review in this EXACT format (use these headers):

## 🔍 Code Quality Score
Rate the code from 1-10 and give a brief summary.

## 🐛 Bugs & Issues
List any bugs, logic errors, or runtime issues found. If none, say "No critical bugs found."

## 🔒 Security Concerns
List any security vulnerabilities. If none, say "No security concerns detected."

## ⚡ Performance
List performance issues or optimization opportunities. If none, say "Performance looks good."

## 🏗️ Architecture & Design
Comment on code structure, design patterns, and maintainability.

## 💡 Improvements
Provide specific, actionable improvement suggestions with code examples where relevant.

## ✅ Best Practices
Note any best practice violations and what to do instead.

Be specific, reference line numbers where possible, and provide code fixes for issues found. Be thorough but concise.`;

    const response = await fetch("https://token-plan-sgp.xiaomimimo.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5-pro",
        messages: [
          { role: "system", content: "You are CodeLens, a senior code reviewer with 15+ years of experience. You find real bugs, suggest practical improvements, and explain clearly. Always use the exact section headers requested." },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("MiMo API error:", response.status, errText);
      return NextResponse.json({ error: `MiMo API error: ${response.status}` }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) controller.enqueue(encoder.encode(content));
              } catch { /* skip malformed */ }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
