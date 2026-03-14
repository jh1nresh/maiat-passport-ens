'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Search, Globe, Shield, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API = '';
const EXTERNAL_API = 'https://app.maiat.io';

type SearchState = 'idle' | 'searching' | 'available' | 'taken' | 'error' | 'invalid';

interface PassportResult {
  ensName: string;
  ensFullName: string;
  walletAddress: string | null;
  name: string | null;
  trustScore: number;
  verdict: string;
  type: string;
  status: string;
  passportUrl: string;
  scarabBalance: number;
  totalQueries: number;
}

const verdictColor = (v: string) => {
  switch (v) {
    case 'trusted': return '#34D399';
    case 'proceed': return '#3B82F6';
    case 'caution': return '#FBBF24';
    case 'avoid': return '#EF4444';
    default: return '#9CA3AF';
  }
};

export default function MaiatApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [result, setResult] = useState<PassportResult | null>(null);
  const [registering, setRegistering] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase().replace(/\.maiat\.eth$/, '');
    if (q.length === 0) { setSearchState('idle'); setResult(null); return; }
    if (q.length < 3 || !/^[a-z0-9-]+$/.test(q)) { setSearchState('invalid'); setResult(null); return; }

    setSearchState('searching');
    setResult(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/passport/lookup?q=${encodeURIComponent(q)}`);
        if (res.status === 404) { setSearchState('available'); }
        else if (res.ok) { const data = await res.json(); setResult(data.passport); setSearchState('taken'); }
        else { setSearchState('error'); }
      } catch { setSearchState('error'); }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Register ──────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    const ensName = searchQuery.trim().toLowerCase().replace(/\.maiat\.eth$/, '');
    if (ensName.length < 3) return;
    setRegistering(true);
    try {
      const res = await fetch(`${API}/api/passport/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Maiat-Client': `passport-web:${ensName}` },
        body: JSON.stringify({ ensName, type: 'human' }),
      });
      const data = await res.json();
      if (res.ok && data.passport) { setResult(data.passport); setSearchState('taken'); }
    } catch (err) { console.error('Registration failed:', err); }
    finally { setRegistering(false); }
  };

  // ── Copy ──────────────────────────────────────────────────────────────────

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }, []);

  const snippets = {
    api: `curl -X POST ${EXTERNAL_API}/api/v1/passport/register \\
  -H "Content-Type: application/json" \\
  -d '{"ensName": "my-agent", "type": "agent"}'`,
    sdk: `import { withMaiatTrust } from '@maiat/viem-guard'

const client = withMaiatTrust(walletClient, {
  minScore: 60,
  antiPoison: true,
  reportThreats: true,
})`,
    lookup: `curl ${EXTERNAL_API}/api/v1/passport/lookup?q=my-agent`,
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 md:py-16 bg-[#0A0A0A] text-white relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* BG */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-blue-900/15" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none bg-purple-900/10" />

      {/* Nav */}
      <nav className="w-full max-w-3xl backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between mb-20 sticky top-4 z-50">
        <a href="https://maiat.io" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Globe className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-black text-lg tracking-tighter">Maiat</span>
        </a>
        <div className="flex items-center gap-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
          <a href="https://app.maiat.io/docs" className="hover:text-white transition-colors hidden sm:block">Docs</a>
          <a href="https://github.com/JhiNResH/maiat-protocol" className="hover:text-white transition-colors hidden sm:block">GitHub</a>
          <a href="https://app.maiat.io" className="px-5 py-2 rounded-full bg-white text-black font-black text-[10px] tracking-widest hover:bg-gray-200 transition-colors no-underline">App</a>
        </div>
      </nav>

      {/* Hero */}
      <main className="w-full max-w-3xl flex flex-col items-center text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl font-black tracking-[-0.06em] leading-[0.85] mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500"
        >
          name.maiat.eth
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-gray-500 text-lg md:text-xl font-medium max-w-xl mb-12"
        >
          Claim your on-chain identity. Free. No gas. Instant.
        </motion.p>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full mb-6"
        >
          <div className={`relative transition-all duration-500 ${isFocused ? 'scale-[1.01]' : ''}`}>
            {isFocused && <div className="absolute -inset-3 bg-blue-500/10 rounded-3xl blur-xl" />}
            <div className={`relative flex items-center border rounded-2xl px-5 md:px-8 py-4 md:py-5 bg-white/5 transition-all ${isFocused ? 'border-white/40' : 'border-white/10'}`}>
              {searchState === 'searching'
                ? <Loader2 className="w-5 h-5 mr-3 text-blue-500 animate-spin" />
                : <Search className={`w-5 h-5 mr-3 transition-colors ${isFocused ? 'text-white' : 'text-gray-600'}`} />
              }
              <input
                type="text"
                placeholder="Search or claim a name..."
                className="flex-1 bg-transparent outline-none text-lg md:text-xl font-bold text-white placeholder:text-gray-600"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="hidden sm:block px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-500 text-sm font-black">.maiat.eth</span>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <div className="min-h-[5rem] w-full flex items-center justify-center mb-16">
          <AnimatePresence mode="wait">
            {searchState === 'searching' && (
              <motion.p key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-bold text-blue-500 uppercase tracking-widest animate-pulse">
                Resolving...
              </motion.p>
            )}

            {searchState === 'available' && (
              <motion.div key="a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="w-full border border-white/10 bg-white/5 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-base block leading-tight">{searchQuery.trim().toLowerCase().replace(/\.maiat\.eth$/, '')}.maiat.eth</span>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Available</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button onClick={handleRegister} disabled={registering}
                    className="px-5 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    {registering ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering...</> : <>Register <ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                  <span className="text-[9px] text-gray-600 font-bold">Free · No gas · 10 🪲</span>
                </div>
              </motion.div>
            )}

            {searchState === 'taken' && result && (
              <motion.div key="t" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="w-full border border-white/10 bg-white/5 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${verdictColor(result.verdict)}15` }}>
                    <span className="text-base">{result.type === 'agent' ? '🤖' : '👤'}</span>
                  </div>
                  <div className="text-left">
                    <span className="font-black text-base block leading-tight">{result.ensFullName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black" style={{ color: verdictColor(result.verdict) }}>{result.trustScore}/100</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: verdictColor(result.verdict), backgroundColor: `${verdictColor(result.verdict)}15` }}>{result.verdict}</span>
                      <span className="text-[9px] text-gray-600">🪲 {result.scarabBalance}</span>
                    </div>
                  </div>
                </div>
                <a href={`${EXTERNAL_API}/passport/${result.walletAddress || result.ensName}`}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/15 hover:bg-white/5 flex items-center gap-1.5 transition-all"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            )}

            {searchState === 'invalid' && (
              <motion.p key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-gray-600 font-bold">
                3+ characters · lowercase · letters, numbers, hyphens
              </motion.p>
            )}

            {searchState === 'error' && (
              <motion.p key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-red-400 font-bold">
                Something went wrong. Try again.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Integration Guide ────────────────────────────────────────────── */}
        <div className="w-full text-left space-y-6">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Register via code</h2>
          <p className="text-gray-500 text-sm">For agents, bots, or automated systems — pick your method.</p>

          {/* API */}
          <CodeBlock
            title="API"
            label="One request. No SDK needed."
            code={snippets.api}
            id="api"
            copied={copiedSnippet}
            onCopy={handleCopy}
          />

          {/* SDK */}
          <CodeBlock
            title="@maiat/viem-guard"
            label="Trust-gated wallet. npm install @maiat/viem-guard"
            code={snippets.sdk}
            id="sdk"
            copied={copiedSnippet}
            onCopy={handleCopy}
            link={{ href: 'https://github.com/JhiNResH/maiat-guard', text: 'GitHub' }}
          />

          {/* Lookup */}
          <CodeBlock
            title="Lookup"
            label="Check any identity before transacting."
            code={snippets.lookup}
            id="lookup"
            copied={copiedSnippet}
            onCopy={handleCopy}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 pb-8 text-center">
        <div className="flex items-center justify-center gap-8 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          <a href="https://app.maiat.io/docs" className="hover:text-white transition-colors">Docs</a>
          <a href="https://github.com/JhiNResH/maiat-protocol" className="hover:text-white transition-colors">GitHub</a>
          <a href="https://x.com/0xmaiat" className="hover:text-white transition-colors">Twitter</a>
        </div>
        <p className="text-[10px] text-gray-700 mt-4">Powered by NameStone · CCIP-Read · Zero Gas</p>
      </footer>
    </div>
  );
}

function CodeBlock({ title, label, code, id, copied, onCopy, link }: {
  title: string; label: string; code: string; id: string;
  copied: string | null; onCopy: (text: string, id: string) => void;
  link?: { href: string; text: string };
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-black text-white uppercase tracking-wider">{title}</span>
          <span className="text-[10px] text-gray-600 ml-3">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {link && (
            <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-600 hover:text-blue-400 flex items-center gap-1 transition-colors">
              {link.text} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <button onClick={() => onCopy(code, id)} className="text-gray-600 hover:text-white transition-colors p-1">
            {copied === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <pre className="px-5 py-4 font-mono text-[11px] leading-relaxed text-gray-400 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
