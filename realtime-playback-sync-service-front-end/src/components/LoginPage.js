import React, { useState } from 'react';

const inputCls = 'w-full bg-surface-2 border border-surface-3 rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink-3 outline-none focus:border-accent-2/50 transition-colors duration-150';
const pwdInputType = 'password';

function LoginPage({ onAuth }) {
  const [mode, setMode]         = useState('login');
  const [username, setUsername] = useState('');
  const [userPass, setUserPass] = useState('');
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    if (!username.trim() || !userPass.trim()) { setError('Username and password are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`http://localhost:8080/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: userPass.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      onAuth(data);
    } catch (e) { setError('Cannot connect to server'); }
    finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base/95 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-sm mx-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ink">Wavesync</h1>
          <p className="text-xs text-ink-3 mt-1">Sync your music in real-time</p>
        </div>

        <div className="bg-surface border border-surface-3 rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex bg-surface-2 rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  mode === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2'
                }`}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-4 text-sm text-danger">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-3 mb-1.5">Username</label>
              <input
                value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKey}
                placeholder="your_username" autoFocus
                className={inputCls}
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-ink-3 mb-1.5">
                  Email <span className="text-ink-3/60">(optional)</span>
                </label>
                <input
                  value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-ink-3 mb-1.5">Password</label>
              <input
                type={pwdInputType} value={userPass} onChange={e => setUserPass(e.target.value)} onKeyDown={handleKey}
                placeholder="enter your password"
                className={inputCls}
              />
            </div>
          </div>

          <button
            onClick={submit} disabled={loading}
            className="w-full mt-5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-150 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div className="mt-4 text-center">
            <button onClick={() => onAuth(null)}
              className="text-xs text-ink-3 hover:text-ink-2 transition-colors duration-150 underline underline-offset-2">
              Continue without account
            </button>
            <span className="text-xs text-ink-3/40 ml-1.5">(rooms disabled)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
