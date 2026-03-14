'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Search, Globe, Shield, Zap, Cpu, Activity, Copy, Check, Loader2, Sun, Moon, Menu, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://app.maiat.io';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const CountUp = ({ end, duration = 2 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <>{count.toLocaleString()}</>;
};

const verdictColor = (v: string) => {
  switch (v) {
    case 'trusted': return '#34D399';
    case 'proceed': return '#3B82F6';
    case 'caution': return '#FBBF24';
    case 'avoid': return '#EF4444';
    default: return '#9CA3AF';
  }
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function MaiatApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [result, setResult] = useState<PassportResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [liveClaims, setLiveClaims] = useState(253);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Theme toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Simulate live claims counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setLiveClaims(prev => prev + 1);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Search (debounced, real API) ──────────────────────────────────────────

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase().replace(/\.maiat\.eth$/, '');
    if (q.length === 0) {
      setSearchState('idle');
      setResult(null);
      return;
    }
    if (q.length < 3 || !/^[a-z0-9-]+$/.test(q)) {
      setSearchState('invalid');
      setResult(null);
      return;
    }

    setSearchState('searching');
    setResult(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/v1/passport/lookup?q=${encodeURIComponent(q)}`);
        if (res.status === 404) {
          setSearchState('available');
        } else if (res.ok) {
          const data = await res.json();
          setResult(data.passport);
          setSearchState('taken');
        } else {
          setSearchState('error');
        }
      } catch {
        setSearchState('error');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Register ──────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    const ensName = searchQuery.trim().toLowerCase().replace(/\.maiat\.eth$/, '');
    if (ensName.length < 3) return;

    setRegistering(true);
    try {
      const res = await fetch(`${API}/api/v1/passport/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Maiat-Client': `passport-web:${ensName}`,
        },
        body: JSON.stringify({
          ensName,
          type: 'human',
        }),
      });
      const data = await res.json();
      if (res.ok && data.passport) {
        setResult(data.passport);
        setSearchState('taken');
      }
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setRegistering(false);
    }
  };

  // ── Copy ──────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`curl -X POST ${API}/api/v1/passport/register \\
  -H "Content-Type: application/json" \\
  -H "X-Maiat-Client: your-agent-id" \\
  -d '{"ensName": "myagent", "walletAddress": "0x..."}'`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 py-8 md:py-16 transition-colors duration-700 ${isDarkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#FDFDFB] text-black'} relative overflow-hidden selection:bg-blue-500 selection:text-white`}>
      {/* Atmospheric Backgrounds */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], x: [0, 20, 0], y: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100/30'}`}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000 ${isDarkMode ? 'bg-purple-900/10' : 'bg-orange-50/40'}`}
      />

      {/* Navbar */}
      <nav className={`w-full max-w-4xl backdrop-blur-2xl border rounded-[2.5rem] px-6 md:px-8 py-4 flex items-center justify-between shadow-lg mb-28 sticky top-8 z-50 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 shadow-black/20' : 'bg-white/40 border-white/20 shadow-black/5'}`}>
        <a href="https://maiat.io" className="flex items-center gap-3 group cursor-pointer">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 ${isDarkMode ? 'bg-white' : 'bg-black'}`}>
            <Globe className={`w-4 h-4 ${isDarkMode ? 'text-black' : 'text-white'}`} />
          </div>
          <span className="font-black text-xl tracking-tighter">Maiat</span>
        </a>

        <div className="hidden md:flex items-center gap-10 text-[13px] font-bold text-gray-400 uppercase tracking-widest">
          <a href="https://app.maiat.io/monitor" className="hover:text-current transition-all hover:tracking-[0.2em]">Monitor</a>
          <a href="https://app.maiat.io/docs" className="hover:text-current transition-all hover:tracking-[0.2em]">Docs</a>
          <a href="https://app.maiat.io/docs#api" className="hover:text-current transition-all hover:tracking-[0.2em]">API</a>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            className={`p-2.5 rounded-full border transition-all active:scale-90 ${isDarkMode ? 'bg-white/10 border-white/10 text-yellow-400 hover:bg-white/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            className={`md:hidden p-2.5 rounded-full border transition-all ${isDarkMode ? 'bg-white/10 border-white/10' : 'bg-black/5 border-black/5'}`}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <motion.a
            href="https://app.maiat.io"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`hidden sm:block px-7 py-3 rounded-full text-[11px] font-black tracking-[0.2em] transition-all uppercase no-underline ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:shadow-xl'}`}
          >
            Launch App
          </motion.a>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed inset-x-4 top-28 z-40 p-8 rounded-3xl border backdrop-blur-3xl md:hidden shadow-2xl ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/5'}`}
          >
            <div className="flex flex-col gap-6 text-center font-black uppercase tracking-widest text-sm">
              <a href="https://app.maiat.io/monitor" onClick={() => setIsMobileMenuOpen(false)}>Monitor</a>
              <a href="https://app.maiat.io/docs" onClick={() => setIsMobileMenuOpen(false)}>Docs</a>
              <a href="https://app.maiat.io/docs#api" onClick={() => setIsMobileMenuOpen(false)}>API</a>
              <a href="https://app.maiat.io" className={`w-full py-4 rounded-2xl block ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>Launch App</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <main className="w-full max-w-6xl flex flex-col items-center text-center mb-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <h1 className={`text-[8rem] md:text-[14rem] font-black tracking-[-0.06em] leading-[0.8] mb-12 bg-clip-text text-transparent transition-all duration-1000 ${isDarkMode ? 'bg-gradient-to-b from-white to-gray-500' : 'bg-gradient-to-b from-black to-gray-700'}`}>
            maiat.eth
          </h1>
          <div className={`absolute -top-4 -right-8 text-[10px] font-black px-3 py-1 rounded-full rotate-12 shadow-lg transition-colors duration-500 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>BETA</div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-gray-400 text-xl md:text-3xl font-medium max-w-4xl mb-20 tracking-tight leading-relaxed"
        >
          The verifiable identity layer for <span className={`${isDarkMode ? 'text-white' : 'text-black'} font-bold`}>autonomous agents</span>.
          One name. Trust score. On-chain reputation.
        </motion.p>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-3xl relative mb-8"
        >
          <div className={`relative transition-all duration-700 ${isFocused ? 'scale-[1.02]' : 'scale-100'}`}>
            <div className={`absolute -inset-4 bg-blue-500/10 rounded-[3rem] blur-2xl transition-opacity duration-700 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`relative flex items-center border rounded-[2.5rem] px-6 md:px-10 py-5 md:py-7 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.02)]'} ${isFocused ? (isDarkMode ? 'border-white' : 'border-black shadow-[0_20px_50px_rgba(0,0,0,0.08)]') : ''}`}>
              {searchState === 'searching' ? (
                <Loader2 className="w-6 h-6 mr-4 text-blue-500 animate-spin" />
              ) : (
                <Search className={`w-6 h-6 mr-4 transition-colors duration-500 ${isFocused ? (isDarkMode ? 'text-white' : 'text-black') : 'text-gray-300'}`} />
              )}
              <input
                type="text"
                placeholder="Search or register a name..."
                className={`flex-1 bg-transparent outline-none text-xl md:text-2xl font-bold placeholder:text-gray-200 ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-black'}`}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className={`hidden sm:flex items-center gap-3 px-6 py-2.5 rounded-full text-lg font-black border transition-colors ${isDarkMode ? 'bg-white/10 border-white/10 text-white/40' : 'bg-gray-50 border-black/5 text-gray-400'}`}>
                <span className="hidden sm:inline">.maiat.eth</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search Results */}
        <div className="min-h-[6rem] w-full max-w-2xl flex items-center justify-center mb-8">
          <AnimatePresence mode="wait">
            {searchState === 'searching' && (
              <motion.div
                key="searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse"
              >
                Resolving on-chain...
              </motion.div>
            )}

            {searchState === 'available' && (
              <motion.div
                key="available"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`w-full border rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl ${isDarkMode ? 'bg-white/10 border-white/10' : 'bg-white border-black/10'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                    <Shield className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-lg block leading-none mb-1">
                      {searchQuery.trim().toLowerCase().replace(/\.maiat\.eth$/, '')}.maiat.eth
                    </span>
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Available for registration</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all disabled:opacity-50 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
                  >
                    {registering ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <>Register <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <span className="text-[10px] text-gray-400 font-bold">Free · No gas · 10 🪲 bonus</span>
                </div>
              </motion.div>
            )}

            {searchState === 'taken' && result && (
              <motion.div
                key="taken"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`w-full border rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5 shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center`} style={{ backgroundColor: `${verdictColor(result.verdict)}15` }}>
                    <span className="text-lg">{result.type === 'agent' ? '🤖' : '👤'}</span>
                  </div>
                  <div className="text-left">
                    <span className="font-black text-lg block leading-none mb-1">{result.ensFullName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black" style={{ color: verdictColor(result.verdict) }}>
                        {result.trustScore}/100
                      </span>
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                        style={{ color: verdictColor(result.verdict), backgroundColor: `${verdictColor(result.verdict)}15` }}
                      >
                        {result.verdict}
                      </span>
                      <span className="text-[10px] text-gray-400">{result.totalQueries} queries · 🪲 {result.scarabBalance}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={`https://app.maiat.io/passport/${result.walletAddress || result.ensName}`}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${isDarkMode ? 'border-white/20 hover:bg-white/10' : 'border-black/10 hover:bg-black/5'}`}
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            )}

            {searchState === 'invalid' && (
              <motion.div
                key="invalid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-gray-400 font-bold"
              >
                Names must be 3+ characters, lowercase letters, numbers, or hyphens only.
              </motion.div>
            )}

            {searchState === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-400 font-bold"
              >
                Something went wrong. Try again.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2"><Zap className="w-3 h-3 text-orange-400" /> Free Registration</div>
          <div className="flex items-center gap-2"><Cpu className="w-3 h-3 text-blue-400" /> Zero Gas Fees</div>
          <div className="flex items-center gap-2">🪲 10 Bonus Credits</div>
        </div>
      </main>

      {/* Bento Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-8 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -10, rotateX: 2, rotateY: -2 }}
          className={`md:col-span-7 border rounded-[3.5rem] p-12 md:p-20 flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 shadow-black/40' : 'bg-white border-black/5 shadow-black/5'}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ${isDarkMode ? 'from-blue-500/10 to-purple-500/10' : 'from-blue-500/5 to-orange-500/5'}`} />
          <div className="relative z-10">
            <h2 className="text-7xl md:text-[10rem] font-black tracking-[-0.08em] mb-4 leading-none">
              <CountUp end={14600} />+
            </h2>
            <p className="text-gray-400 text-xl md:text-2xl font-bold tracking-tight uppercase">Agents Scored & Verified</p>
          </div>
        </motion.div>

        <div className="md:col-span-5 flex flex-col gap-8">
          {/* Code Block */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[2.5rem] p-8 shadow-2xl border relative group overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-500 bg-[#0D0E12] border-white/5"
            onClick={handleCopy}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="text-white/40 group-hover:text-white transition-colors">
                {isCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </div>
            </div>
            <div className="font-mono text-base md:text-lg space-y-2">
              <div className="flex gap-4">
                <span className="text-emerald-400 font-bold">POST</span>
                <span className="text-gray-500">/v1/passport/register</span>
              </div>
              <div className="text-gray-600 text-sm pl-4 border-l border-white/10 mt-4">
                {"{"}<br />
                &nbsp;&nbsp;&quot;ensName&quot;: &quot;myagent&quot;,<br />
                &nbsp;&nbsp;&quot;walletAddress&quot;: &quot;0x71C...3a2&quot;<br />
                {"}"}
              </div>
              <div className="text-gray-700 text-xs mt-3">
                → myagent.maiat.eth + passport + 10 🪲
              </div>
            </div>
          </motion.div>

          {/* Bottom 2 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 flex-1">
            {/* Trust Ring */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`border rounded-[2.5rem] p-8 flex flex-col justify-between group transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-white' : 'bg-white border-black/5 hover:border-black shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <div className="relative w-16 h-16 md:w-20 md:h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle className={`${isDarkMode ? 'text-white/5' : 'text-gray-50'} stroke-current`} strokeWidth="4" fill="none" cx="18" cy="18" r="16" />
                    <motion.circle
                      initial={{ strokeDasharray: "0, 100" }}
                      whileInView={{ strokeDasharray: "73, 100" }}
                      viewport={{ once: true }}
                      transition={{ duration: 2, delay: 1 }}
                      className="text-blue-500 stroke-current"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      cx="18" cy="18" r="16"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black">73</div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-xl font-black text-blue-500">Proceed</p>
                </div>
              </div>
              <div className={`h-1 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="h-full w-[73%] bg-blue-500" />
              </div>
            </motion.div>

            {/* Live Claims */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`border rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5 shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative ${isDarkMode ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <Activity className="w-6 h-6 text-red-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Live</p>
                  <motion.p
                    key={liveClaims}
                    initial={{ scale: 1.2, color: '#ef4444' }}
                    animate={{ scale: 1, color: isDarkMode ? '#ffffff' : '#000000' }}
                    className="text-3xl font-black tracking-tighter"
                  >
                    {liveClaims}
                  </motion.p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">New claims today</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* For Agent Builders */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl mb-32"
      >
        <h2 className={`text-4xl md:text-6xl font-black tracking-[-0.04em] mb-16 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Give your agent an identity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className={`border rounded-[2.5rem] p-10 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-lg font-black ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>1</div>
            <h3 className="text-xl font-black mb-3">Install Guard</h3>
            <div className="bg-[#0D0E12] rounded-2xl p-5 font-mono text-sm mb-4">
              <span className="text-emerald-400">npm</span> <span className="text-gray-400">install @maiat/viem-guard</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Wallet-level protection. Anti-poisoning, trust checks, threat reporting.
            </p>
          </div>

          {/* Step 2 */}
          <div className={`border rounded-[2.5rem] p-10 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-lg font-black ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>2</div>
            <h3 className="text-xl font-black mb-3">One-line setup</h3>
            <div className="bg-[#0D0E12] rounded-2xl p-5 font-mono text-[11px] leading-relaxed mb-4">
              <span className="text-blue-400">import</span> <span className="text-gray-400">{'{'}</span> <span className="text-orange-300">createMaiatAgentWallet</span> <span className="text-gray-400">{'}'}</span><br />
              <span className="text-blue-400">from</span> <span className="text-emerald-400">&apos;@maiat/viem-guard&apos;</span><br /><br />
              <span className="text-gray-500">const</span> <span className="text-gray-300">wallet</span> <span className="text-gray-500">=</span> <span className="text-orange-300">createMaiatAgentWallet</span><span className="text-gray-400">(client)</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Every transaction is now trust-checked automatically.
            </p>
          </div>

          {/* Step 3 */}
          <div className={`border rounded-[2.5rem] p-10 transition-all duration-500 relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-lg font-black ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>✓</div>
            <h3 className="text-xl font-black mb-3">You&apos;re live</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-sm text-gray-400">ENS identity auto-registered</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-gray-400">Trust score tracking from day 1</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-sm text-gray-400">Earn 🪲 on every outcome report</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your agent gets a passport automatically. No extra steps.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className={`mt-auto py-16 w-full max-w-6xl border-t flex flex-col md:flex-row items-center justify-between gap-8 transition-colors duration-500 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
        <div className="flex items-center gap-8 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
          <a href="https://app.maiat.io/docs" className="hover:text-current transition-colors">Docs</a>
          <a href="https://github.com/JhiNResH/maiat-protocol" className="hover:text-current transition-colors">GitHub</a>
          <a href="https://x.com/0xmaiat" className="hover:text-current transition-colors">Twitter</a>
        </div>
        <p className="text-sm text-gray-400 font-bold">
          Powered by <span className={`${isDarkMode ? 'text-white' : 'text-black'} font-black`}>NameStone</span> · CCIP-Read · Zero Gas
        </p>
      </footer>
    </div>
  );
}
