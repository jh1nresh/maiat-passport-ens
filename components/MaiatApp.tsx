'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Search, Globe, Shield, Zap, Cpu, Activity, Copy, Check, Loader2, Sun, Moon, Menu, X, ExternalLink, Wallet, Twitter } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const API = process.env.NEXT_PUBLIC_API_BASE || '';

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
  erc8004Status?: 'registered' | 'pending' | 'failed' | 'skipped';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCompact = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return n.toLocaleString();
};

const CountUp = ({ end, duration = 2, compact = false }: { end: number; duration?: number; compact?: boolean }) => {
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
  return <>{compact ? formatCompact(count) : count.toLocaleString()}</>;
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

// ─── macOS Dock magnification for passport nav ──────────────────────────────

const passportNavLinks = [
  { label: 'Docs', href: 'https://app.maiat.io/docs' },
  { label: 'API', href: 'https://app.maiat.io/docs#api' },
];

function PassportDockNav({ isDarkMode }: { isDarkMode: boolean }) {
  const mouseX = useMotionValue(-Infinity);
  return (
    <motion.div
      className="hidden md:flex items-center gap-0.5"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(-Infinity)}
    >
      {passportNavLinks.map((item) => (
        <PassportDockItem key={item.label} item={item} mouseX={mouseX} isDarkMode={isDarkMode} />
      ))}
    </motion.div>
  );
}

function PassportDockItem({ item, mouseX, isDarkMode }: { item: { label: string; href: string }; mouseX: ReturnType<typeof useMotionValue<number>>; isDarkMode: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });
  const scale = useTransform(distance, [-120, 0, 120], [1, 1.35, 1]);
  const springScale = useSpring(scale, { mass: 0.1, stiffness: 200, damping: 12 });

  return (
    <a ref={ref} href={item.href} className="relative">
      <motion.div style={{ scale: springScale }} className="px-5 py-2 rounded-full">
        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
          {item.label}
        </span>
      </motion.div>
    </a>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function MaiatApp() {
  const { login, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = wallets.find(w => w.walletClientType !== 'privy') ?? wallets[0];
  const walletAddress = connectedWallet?.address ?? null;

  const [referrer, setReferrer] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferrer(ref);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [result, setResult] = useState<PassportResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [stats, setStats] = useState({ passports: 0, queries: 0, agents: 0 });
  const [showAgentFlow, setShowAgentFlow] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setNavVisible(currentY < 50 || currentY < lastScrollY.current);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const [registering, setRegistering] = useState(false);
  const [pendingRegister, setPendingRegister] = useState(false);
  const [shared, setShared] = useState(false);

  // Theme toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch real passport stats
  useEffect(() => {
    fetch(`/api/passport/stats`).then(r => r.json()).then(d => {
      if (d.passports !== undefined) setStats(d);
    }).catch(() => {});
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
        const res = await fetch(`/api/passport/lookup?q=${encodeURIComponent(q)}`);
        if (res.status === 404) {
          setSearchState('available');
        } else if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setSearchState('available');
          } else if (data.passport) {
            setResult(data.passport);
            setSearchState('taken');
          } else {
            setSearchState('available');
          }
        } else {
          setSearchState('error');
        }
      } catch {
        setSearchState('error');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Register (requires wallet) ─────────────────────────────────────────

  // If user just connected wallet and had a pending register, fire it
  // Retry with a short delay to ensure walletAddress is populated
  useEffect(() => {
    if (!pendingRegister || !authenticated) return;
    
    if (walletAddress) {
      setPendingRegister(false);
      doRegister(walletAddress);
      return;
    }

    // walletAddress might not be available yet — retry after a tick
    const retry = setTimeout(() => {
      if (walletAddress) {
        setPendingRegister(false);
        doRegister(walletAddress);
      }
    }, 1500);

    return () => clearTimeout(retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRegister, authenticated, walletAddress]);

  const handleRegister = async () => {
    if (!authenticated || !walletAddress) {
      setPendingRegister(true);
      login();
      return;
    }
    await doRegister(walletAddress);
  };

  const doRegister = async (wallet: string) => {
    const ensName = searchQuery.trim().toLowerCase().replace(/\.maiat\.eth$/, '');
    if (ensName.length < 3) return;

    setRegistering(true);
    try {
      const res = await fetch(`/api/passport/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Maiat-Client': `passport-web:${ensName}`,
        },
        body: JSON.stringify({
          ensName,
          walletAddress: wallet,
          type: 'human',
          ...(referrer ? { referredBy: referrer } : {}),
        }),
      });
      const data = await res.json();
      if (data.passport) {
        setResult(data.passport);
        setSearchState('taken');
      } else {
        console.error('Registration response missing passport:', data);
        setSearchState('error');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setSearchState('error');
    } finally {
      setRegistering(false);
    }
  };

  // ── Copy ──────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`curl -X POST https://app.maiat.io/api/v1/passport/register \\
  -H "Content-Type: application/json" \\
  -H "X-Maiat-Client: your-agent-id" \\
  -d '{"ensName": "myagent", "type": "agent"}'`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center px-3 sm:px-4 py-6 sm:py-8 md:py-16 transition-colors duration-700 ${isDarkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#FDFDFB] text-black'} relative overflow-hidden selection:bg-blue-500 selection:text-white`}>
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
      <motion.nav
        initial={{ y: -100, x: '-50%', opacity: 0 }}
        animate={{ y: navVisible ? 0 : -100, x: '-50%', opacity: navVisible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-4 sm:top-6 left-1/2 z-50 w-[95%] max-w-5xl rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between border transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/[0.08] shadow-[inset_0_0_30px_rgba(255,255,255,0.02),0_30px_100px_rgba(0,0,0,0.3)]' : 'bg-white/70 border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.05)]'}`}
        style={{ backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)' }}
      >
        <a href="https://maiat.io" className="flex items-center gap-2.5 group cursor-pointer shrink-0">
          <img src="/maiat-logo.jpg" alt="Maiat" className="w-7 h-7 rounded-full object-cover" />
          <span className={`font-mono font-bold text-base tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>maiat</span>
        </a>

        <PassportDockNav isDarkMode={isDarkMode} />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-90 ${isDarkMode ? 'bg-white/10 border-white/10 text-yellow-400' : 'bg-black/5 border-black/5 text-gray-500'}`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center border transition-all ${isDarkMode ? 'bg-white/10 border-white/10' : 'bg-black/5 border-black/5'}`}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {authenticated && walletAddress ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={async () => { await logout(); window.location.reload(); }}
                className={`text-[10px] font-mono font-bold px-3 py-2 rounded-full border transition-all cursor-pointer active:scale-95 hover:scale-105 ${isDarkMode ? 'border-white/10 text-white/60 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10' : 'border-black/10 text-black/60 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10'}`}
                title="Click to disconnect wallet"
              >
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
              </button>
              <a href="https://app.maiat.io" className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] no-underline transition-all shadow-lg ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                Launch App
              </a>
            </div>
          ) : (
            <button
              onClick={() => login()}
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all shadow-lg ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
            >
              <Wallet className="w-3.5 h-3.5" /> Connect
            </button>
          )}
        </div>
      </motion.nav>

      {/* Spacer for fixed nav */}
      <div className="h-24 mb-12" />

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed inset-x-4 top-24 z-40 p-6 rounded-2xl border md:hidden ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/5'}`}
            style={{ backdropFilter: 'blur(40px)' }}
          >
            <div className="flex flex-col gap-4">
              {passportNavLinks.map((item) => (
                <a key={item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-sm font-bold rounded-xl hover:bg-white/5 transition-all">
                  {item.label}
                </a>
              ))}
              {authenticated ? (
                <>
                  <a href="https://app.maiat.io" className={`w-full py-3 rounded-full text-center text-[10px] font-bold uppercase tracking-widest no-underline ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>Launch App</a>
                  <button onClick={async () => { await logout(); setIsMobileMenuOpen(false); window.location.reload(); }} className={`w-full py-3 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-red-400 border border-red-500/20' : 'text-red-500 border border-red-500/20'}`}>Disconnect</button>
                </>
              ) : (
                <button onClick={() => { login(); setIsMobileMenuOpen(false); }} className={`w-full py-3 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>Connect Wallet</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <main className="w-full max-w-6xl flex flex-col items-center text-center mb-16 sm:mb-24 relative z-10 mt-16 sm:mt-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <h1 className={`text-[4rem] sm:text-[6rem] md:text-[14rem] font-black tracking-[-0.06em] leading-tight mb-6 sm:mb-12 bg-clip-text text-transparent transition-all duration-1000 ${isDarkMode ? 'bg-gradient-to-b from-white to-gray-500' : 'bg-gradient-to-b from-black to-gray-700'}`}>
            maiat.eth
          </h1>
          <div className={`absolute -top-4 -right-8 text-[10px] font-black px-3 py-1 rounded-full rotate-12 shadow-lg transition-colors duration-500 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>BETA</div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-gray-400 text-base sm:text-xl md:text-3xl font-medium max-w-4xl mb-10 sm:mb-20 tracking-tight leading-relaxed px-2"
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
                    {registering ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</>
                    ) : !authenticated ? (
                      <><Wallet className="w-4 h-4" /> Connect & Register</>
                    ) : (
                      <>Register <ArrowRight className="w-4 h-4" /></>
                    )}
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
                      {result.type === 'agent' && (
                        <>
                          <span className="text-xs font-black" style={{ color: verdictColor(result.verdict) }}>
                            {result.trustScore}/100
                          </span>
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                            style={{ color: verdictColor(result.verdict), backgroundColor: `${verdictColor(result.verdict)}15` }}
                          >
                            {result.verdict}
                          </span>
                        </>
                      )}
                      {result.type !== 'agent' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase text-emerald-500 bg-emerald-500/10">
                          Verified
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">🪲 {result.scarabBalance}</span>
                      {result.erc8004Status === 'registered' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase text-purple-500 bg-purple-500/10">
                          On-Chain ✓
                        </span>
                      )}
                      {result.erc8004Status === 'pending' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase text-yellow-500 bg-yellow-500/10">
                          Confirming…
                        </span>
                      )}
                      {walletAddress && result.walletAddress && walletAddress.toLowerCase() === result.walletAddress.toLowerCase() ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase text-blue-500 bg-blue-500/10">Your Passport</span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase text-gray-400 bg-gray-500/10">Already Claimed</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just claimed my Maiat Trust Passport 🛡️\n\n${result.ensFullName} — my verifiable identity is live.\n\nClaim yours →`)}&url=${encodeURIComponent(`https://passport.maiat.io/share/${result.ensName}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShared(true)}
                      className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all no-underline border ${
                        shared
                          ? (isDarkMode ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-emerald-500/30 text-emerald-600 bg-emerald-50')
                          : (isDarkMode ? 'border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'border-blue-500/30 text-blue-600 bg-blue-50 hover:bg-blue-100')
                      }`}
                    >
                      {shared ? <><Check className="w-3.5 h-3.5" /> Shared</> : <><Twitter className="w-3.5 h-3.5" /> Share</>}
                    </a>
                    <a
                      href={`https://app.maiat.io/passport/${result.ensName}`}
                      className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all no-underline ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:shadow-xl'}`}
                    >
                      Launch App <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                  {!shared && (
                    <span className="text-[10px] text-blue-500 font-bold animate-pulse">Share your referral link → earn 5 🪲 per signup</span>
                  )}
                  {shared && (
                    <span className="text-[10px] text-emerald-500 font-bold">Referral link shared! You earn 5 🪲 per signup</span>
                  )}
                </div>
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
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 mb-16 sm:mb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -10, rotateX: 2, rotateY: -2 }}
          className={`md:col-span-7 border rounded-[2rem] sm:rounded-[3.5rem] p-8 sm:p-12 md:p-20 flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 shadow-black/40' : 'bg-white border-black/5 shadow-black/5'}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ${isDarkMode ? 'from-blue-500/10 to-purple-500/10' : 'from-blue-500/5 to-orange-500/5'}`} />
          <div className="relative z-10">
            <h2 className="text-5xl sm:text-7xl md:text-[10rem] font-black tracking-[-0.08em] mb-4 leading-none">
              <CountUp end={stats.agents} compact />+
            </h2>
            <p className="text-gray-400 text-base sm:text-xl md:text-2xl font-bold tracking-tight uppercase">Agents Scored & Verified</p>
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
                &nbsp;&nbsp;&quot;type&quot;: &quot;agent&quot;<br />
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
                      whileInView={{ strokeDasharray: "67, 100" }}
                      viewport={{ once: true }}
                      transition={{ duration: 2, delay: 1 }}
                      className="text-blue-500 stroke-current"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      cx="18" cy="18" r="16"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black">67</div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-xl font-black text-blue-500">Proceed</p>
                </div>
              </div>
              <div className={`h-1 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="h-full w-[67%] bg-blue-500" />
              </div>
            </motion.div>

            {/* Analytics CTA */}
            <motion.a
              href="https://app.maiat.io/analytics"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.02 }}
              className={`border rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-500 cursor-pointer group ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/30' : 'bg-white border-black/5 hover:border-black/20 shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <Activity className="w-6 h-6 text-blue-500" />
                </div>
                <span className={`text-xl font-black group-hover:translate-x-1 transition-transform ${isDarkMode ? 'text-white' : 'text-black'}`}>→</span>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">View Analytics</p>
            </motion.a>
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
        <h2 className={`text-3xl sm:text-4xl md:text-6xl font-black tracking-[-0.04em] mb-10 sm:mb-16 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Give your agent an identity
        </h2>

        {/* Toggle Switch */}
        <div className="flex justify-center mb-12">
          <div className={`relative flex rounded-full p-1 backdrop-blur-xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-black/[0.08] shadow-[0_2px_20px_rgba(0,0,0,0.06)]'}`}>
            <button
              onClick={() => setShowAgentFlow(false)}
              className={`relative z-10 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${!showAgentFlow ? (isDarkMode ? 'text-white' : 'text-black') : 'text-gray-400'}`}
            >
              {!showAgentFlow && <motion.div layoutId="switchBg" className={`absolute inset-0 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-white shadow-[0_1px_8px_rgba(0,0,0,0.08)]'}`} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
              <span className="relative">For Humans</span>
            </button>
            <button
              onClick={() => setShowAgentFlow(true)}
              className={`relative z-10 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${showAgentFlow ? (isDarkMode ? 'text-white' : 'text-black') : 'text-gray-400'}`}
            >
              {showAgentFlow && <motion.div layoutId="switchBg" className={`absolute inset-0 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-white shadow-[0_1px_8px_rgba(0,0,0,0.08)]'}`} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
              <span className="relative">For Agents</span>
            </button>
          </div>
        </div>

        {/* Steps Grid */}
        <AnimatePresence mode="wait">
          {!showAgentFlow ? (
            <motion.div key="humans" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '1', title: 'Connect Wallet', desc: 'Sign in with your wallet above. We support all major wallets via Privy.', delay: 0 },
                { step: '2', title: 'Pick Your Name', desc: null, delay: 0.1 },
                { step: '✓', title: "You're Verified", desc: null, delay: 0.2 },
              ].map((card, i) => (
                <motion.div
                  key={card.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className={`relative border rounded-[2.5rem] p-10 transition-all duration-500 overflow-hidden group cursor-default ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]' : 'bg-white/70 backdrop-blur-xl border-white/80 shadow-[0_4px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:border-black/10'}`}
                >
                  {/* Glass shimmer on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${isDarkMode ? 'bg-gradient-to-br from-white/5 via-transparent to-white/5' : 'bg-gradient-to-br from-white/80 via-transparent to-blue-50/30'}`} />
                  <div className="relative z-10">
                    {i === 2 ? (
                      <>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-lg font-black ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>✓</div>
                        <h3 className="text-xl font-black mb-3">You&apos;re Verified</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-blue-500 shrink-0" /><span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>On-chain ENS identity</span></div>
                          <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-emerald-500 shrink-0" /><span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Trust score from day 1</span></div>
                          <div className="flex items-center gap-3"><Zap className="w-4 h-4 text-orange-400 shrink-0" /><span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>10 🪲 bonus credits</span></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-lg font-black ${isDarkMode ? 'bg-white/10' : 'bg-black/[0.04]'}`}>{card.step}</div>
                        <h3 className="text-xl font-black mb-3">{card.title}</h3>
                        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {i === 0 ? 'Sign in with your wallet above. We support all major wallets via Privy.' : <>Choose a unique name. You&apos;ll get <span className="font-bold">yourname.maiat.eth</span> — a gasless ENS subname, no fees ever.</>}
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="agents" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex justify-center">
              <motion.div
                whileHover={{ y: -4 }}
                className={`relative border rounded-[2.5rem] p-10 md:p-14 max-w-2xl w-full text-center transition-all duration-500 overflow-hidden group ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/70 backdrop-blur-xl border-white/80 shadow-[0_4px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)]'}`}
              >
                {/* Glass shimmer */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${isDarkMode ? 'bg-gradient-to-br from-white/5 via-transparent to-white/5' : 'bg-gradient-to-br from-white/80 via-transparent to-emerald-50/20'}`} />
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl ${isDarkMode ? 'bg-white/10' : 'bg-black/[0.04]'}`}>🤖</div>
                  <h3 className="text-2xl font-black mb-3">Add this to your agent</h3>
                  <p className={`text-sm mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Point your agent to our skill file. It handles registration, trust checks, and wallet protection automatically.</p>
                  <div
                    className={`rounded-2xl p-6 font-mono text-sm md:text-base text-left cursor-pointer group/code relative active:scale-[0.98] transition-all ${isDarkMode ? 'bg-[#0D0E12] border border-white/10 hover:border-white/20' : 'bg-black/[0.03] border border-black/[0.06] hover:border-black/10 hover:bg-black/[0.05]'}`}
                    onClick={() => { navigator.clipboard.writeText('https://app.maiat.io/skill.md'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>fetch</span>({`"`}<span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>https://app.maiat.io/skill.md</span>{`"`})
                      </span>
                      <span className={`transition-colors ${isDarkMode ? 'text-white/40 group-hover/code:text-white' : 'text-black/30 group-hover/code:text-black'}`}>
                        {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>
                  <p className={`text-[11px] mt-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Your agent reads the skill file and follows the instructions automatically.</p>
                  <div className={`flex items-center justify-center gap-6 mt-8 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-blue-500" /> ENS Identity</div>
                    <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-500" /> Trust Score</div>
                    <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-orange-400" /> Wallet Guard</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
