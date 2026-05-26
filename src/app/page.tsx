"use client";

import { useState, useRef, useCallback } from "react";
import {
  Search, Code2, Shield, Zap, Layers, AlertTriangle,
  CheckCircle2, Terminal, Bug, FileCode2, Hash, Type,
  ChevronDown, Sparkles, ArrowRight, Copy, Check, RotateCcw,
  BarChart3, Clock, Eye
} from "lucide-react";

interface Pattern {
  type: string;
  line: number;
  detail: string;
}

interface Complexity {
  cyclomaticEstimate: number;
  nestingDepth: number;
  longestFunction: string;
  longestFunctionLines: number;
}

interface ProcessedData {
  language: string;
  lineCount: number;
  charCount: number;
  blankLines: number;
  commentLines: number;
  functions: string[];
  imports: string[];
  complexity: Complexity;
  patterns: Pattern[];
}

const SAMPLE_CODES: Record<string, { label: string; code: string }> = {
  buggy: {
    label: "Buggy TypeScript",
    code: `import express from 'express';

const app = express();
const API_KEY = "sk-proj-abc123secret";
let users: any = [];

app.get('/users/:id', (req, res) => {
  const id = req.params.id;
  const user = users.find(u => u.id == id);
  
  // TODO: add input validation
  console.log("User found:", user);
  
  try {
    const result = eval(req.query.code);
    res.json({ user, result });
  } catch(e) {}
});

app.post('/users', async (req, res) => {
  const data = req.body;
  users.push(data);
  
  if (data.role == "admin") {
    console.log("New admin created");
  }
  
  res.json({ success: true });
});

app.listen(3000);`,
  },
  react: {
    label: "React Component",
    code: `import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

export function UserDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1>User Dashboard</h1>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      {filtered.map(user => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  );
}`,
  },
  python: {
    label: "Python API",
    code: `import json
import os
from typing import List, Optional

API_SECRET = "hardcoded_secret_123"

class DataProcessor:
    def __init__(self, config: dict):
        self.config = config
        self.data = []
    
    def load_data(self, filepath: str) -> List[dict]:
        try:
            with open(filepath, 'r') as f:
                self.data = json.load(f)
            return self.data
        except Exception:
            return []
    
    def filter_records(self, key: str, value) -> List[dict]:
        results = []
        for record in self.data:
            if record.get(key) == value:
                results.append(record)
        return results
    
    def export_csv(self, output_path: str) -> bool:
        if not self.data:
            return False
        
        headers = self.data[0].keys()
        with open(output_path, 'w') as f:
            f.write(','.join(headers) + '\\n')
            for record in self.data:
                f.write(','.join(str(record[h]) for h in headers) + '\\n')
        return True

processor = DataProcessor({"debug": True})
data = processor.load_data("data.json")
filtered = processor.filter_records("status", "active")`,
  },
};

const LANGUAGE_ICONS: Record<string, string> = {
  TypeScript: "🔷", JavaScript: "🟡", Python: "🐍", Go: "🔵",
  Rust: "🦀", Java: "☕", "C/C++": "⚙️", HTML: "🌐",
  JSON: "📋", SQL: "🗃️", Unknown: "📄",
};

function PatternBadge({ type }: { type: string }) {
  const cls = `badge badge-${type}`;
  return <span className={cls}>{type}</span>;
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="metric-card animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [processed, setProcessed] = useState<ProcessedData | null>(null);
  const [aiReview, setAiReview] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"metrics" | "patterns" | "review">("metrics");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleProcess = useCallback(async () => {
    if (!code.trim()) return;
    setIsProcessing(true);
    setAiReview("");
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: code }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProcessed(data.processed);
      setLanguage(data.processed.language);
    } catch (err) {
      console.error("Process error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [code]);

  const handleAnalyze = useCallback(async () => {
    if (!code.trim() || !processed) return;
    setIsAnalyzing(true);
    setAiReview("");
    setActiveTab("review");
    try {
      const analysisSummary = `Language: ${processed.language}, Lines: ${processed.lineCount}, Functions: ${processed.functions.length}, Cyclomatic complexity: ${processed.complexity.cyclomaticEstimate}, Nesting depth: ${processed.complexity.nestingDepth}, Patterns found: ${processed.patterns.length}`;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: code, language: processed.language, analysis: analysisSummary }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAiReview(full);
      }
    } catch (err) {
      setAiReview(`Error: ${err instanceof Error ? err.message : "Analysis failed"}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [code, processed]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode("");
    setProcessed(null);
    setAiReview("");
    setLanguage("");
    textareaRef.current?.focus();
  };

  const loadSample = (key: string) => {
    setCode(SAMPLE_CODES[key].code);
    setProcessed(null);
    setAiReview("");
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="color:#58a6ff;font-size:14px;font-weight:600;margin:12px 0 4px">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    html = `<p>${html}</p>`;
    return html;
  };

  const commentRatio = processed
    ? Math.round((processed.commentLines / processed.lineCount) * 100)
    : 0;
  const blankRatio = processed
    ? Math.round((processed.blankLines / processed.lineCount) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Code2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">CodeLens</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI Code Review & Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600 hidden sm:block">Powered by</span>
            <span className="text-xs font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              MiMo v2.5 Pro
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Code Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileCode2 size={14} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Input Code</span>
                {language && (
                  <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                    {LANGUAGE_ICONS[language] || "📄"} {language}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="relative group">
                  <button className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    Samples <ChevronDown size={12} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {Object.entries(SAMPLE_CODES).map(([key, val]) => (
                      <button key={key} onClick={() => loadSample(key)}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
                        {val.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleCopy} className="text-slate-500 hover:text-slate-300 p-1 transition-colors" title="Copy">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button onClick={handleReset} className="text-slate-500 hover:text-slate-300 p-1 transition-colors" title="Reset">
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              className="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here...&#10;&#10;Supports TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, HTML, SQL, and more."
              spellCheck={false}
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleProcess}
                disabled={!code.trim() || isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                {isProcessing ? "Analyzing..." : "Analyze Code"}
              </button>
              {processed && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all"
                >
                  {isAnalyzing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {isAnalyzing ? "Reviewing..." : "AI Deep Review"}
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {processed && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Code Metrics</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <MetricCard icon={Hash} label="Lines" value={processed.lineCount} color="#4a9eff" />
                <MetricCard icon={Type} label="Chars" value={processed.charCount.toLocaleString()} color="#22d3ee" />
                <MetricCard icon={FileCode2} label="Functions" value={processed.functions.length} color="#34d399" />
                <MetricCard icon={Layers} label="Imports" value={processed.imports.length} color="#a78bfa" />
                <MetricCard icon={Bug} label="Patterns" value={processed.patterns.length} color={processed.patterns.length > 0 ? "#fbbf24" : "#34d399"} />
                <MetricCard icon={Clock} label="Comment %" value={`${commentRatio}%`} color="#94a3b8" />
              </div>
              <div className="metric-card">
                <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Complexity Analysis</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Cyclomatic</span>
                    <span className={`text-sm font-bold ${processed.complexity.cyclomaticEstimate > 15 ? 'text-red-400' : processed.complexity.cyclomaticEstimate > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {processed.complexity.cyclomaticEstimate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Max Nesting</span>
                    <span className={`text-sm font-bold ${processed.complexity.nestingDepth > 5 ? 'text-red-400' : processed.complexity.nestingDepth > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {processed.complexity.nestingDepth}
                    </span>
                  </div>
                  {processed.complexity.longestFunction !== "N/A" && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Longest Fn</span>
                      <span className="text-xs text-slate-300">
                        <code className="text-blue-400">{processed.complexity.longestFunction}</code> ({processed.complexity.longestFunctionLines} lines)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Tabs */}
        {processed && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-1 mb-4 border-b border-slate-800">
              {[
                { key: "metrics" as const, icon: Eye, label: "Details" },
                { key: "patterns" as const, icon: AlertTriangle, label: `Patterns (${processed.patterns.length})` },
                { key: "review" as const, icon: Sparkles, label: "AI Review" },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* Details Tab */}
            {activeTab === "metrics" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Functions */}
                <div className="result-panel">
                  <div className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal size={12} /> Functions ({processed.functions.length})
                  </div>
                  {processed.functions.length > 0 ? (
                    <div className="space-y-1">
                      {processed.functions.map((fn, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-800/50 transition-colors">
                          <ArrowRight size={10} className="text-blue-500" />
                          <code className="text-sm text-emerald-400">{fn}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-sm">No functions detected</p>
                  )}
                </div>

                {/* Imports */}
                <div className="result-panel">
                  <div className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={12} /> Imports ({processed.imports.length})
                  </div>
                  {processed.imports.length > 0 ? (
                    <div className="space-y-1">
                      {processed.imports.map((imp, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-800/50 transition-colors">
                          <ArrowRight size={10} className="text-violet-500" />
                          <code className="text-sm text-slate-300">{imp}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-sm">No imports detected</p>
                  )}
                </div>
              </div>
            )}

            {/* Patterns Tab */}
            {activeTab === "patterns" && (
              <div className="result-panel">
                {processed.patterns.length > 0 ? (
                  <div className="space-y-2">
                    {processed.patterns.map((p, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50">
                        <PatternBadge type={p.type} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-600 font-mono">L{p.line}</span>
                            <span className="text-sm text-slate-300">{p.detail}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-8 justify-center">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-sm text-emerald-400">No patterns detected — clean code!</span>
                  </div>
                )}
              </div>
            )}

            {/* AI Review Tab */}
            {activeTab === "review" && (
              <div className="result-panel" style={{ minHeight: 300 }}>
                {isAnalyzing && !aiReview && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-sm">MiMo is reviewing your code...</span>
                  </div>
                )}
                {aiReview ? (
                  <div
                    className="analysis-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(aiReview) }}
                  />
                ) : !isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles size={24} className="text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500 mb-1">Click &quot;AI Deep Review&quot; to get a detailed analysis</p>
                    <p className="text-xs text-slate-600">Powered by MiMo v2.5 Pro — streaming response</p>
                  </div>
                ) : null}
                {isAnalyzing && aiReview && (
                  <span className="cursor-blink" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!processed && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4 pulse-glow">
              <Code2 size={28} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-300 mb-2">Paste your code to begin</h2>
            <p className="text-sm text-slate-500 max-w-md">
              CodeLens performs instant static analysis and AI-powered deep reviews.
              Supports 10+ languages with real-time pattern detection.
            </p>
            <div className="flex items-center gap-2 mt-4">
              {Object.entries(SAMPLE_CODES).map(([key, val]) => (
                <button key={key} onClick={() => loadSample(key)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                  {val.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-3 text-center">
        <p className="text-[10px] text-slate-600">
          CodeLens — Built with Next.js 16, TypeScript & MiMo v2.5 Pro
        </p>
      </footer>
    </div>
  );
}
