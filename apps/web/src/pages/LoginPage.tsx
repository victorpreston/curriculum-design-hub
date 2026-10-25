import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, SUPPORTED_GRADES } from '@hub/shared';
import { ErrorNotice } from '../components/ErrorNotice';
import { useAuth } from '../lib/auth';

const ROLE_LABEL = { teacher: 'Teacher', curriculum_lead: 'Curriculum Lead' } as const;

export function LoginPage() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Sign in failed'));
    } finally {
      setBusy(false);
    }
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="login-page">
      <aside className="login-story" aria-labelledby="login-story-heading">
        <img className="login-logo" src="/logo.png" alt="Curriculum Design Hub" />
        <div className="login-story-content">
          <span className="login-eyebrow">A workspace for better teaching</span>
          <h2 id="login-story-heading">Good lessons start with the right evidence.</h2>
        </div>
        <footer className="login-story-footer">
          <span>Integrated Science</span>
          <div>
            {SUPPORTED_GRADES.map((grade) => (
              <span key={grade}>Grade {grade}</span>
            ))}
          </div>
        </footer>
      </aside>

      <main id="main" className="login-main">
        <div className="login-content">
          <header className="login-heading">
            <h1>Welcome back</h1>
          </header>
          <form
            onSubmit={handleSubmit}
            className="login-form"
            aria-label="Sign in"
            aria-busy={busy}
          >
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy}
              required
            />
            <label htmlFor="login-password">Password</label>
            <div className="login-password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={busy}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
                disabled={busy}
              >
                {showPassword ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
            <ErrorNotice error={error} />
            <button type="submit" className="login-submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <section className="login-demo" aria-labelledby="demo-heading">
            <div className="login-demo-heading">
              <h2 id="demo-heading">Explore with a demo account</h2>
              <span>Choose a role</span>
            </div>
            <p className="login-demo-description">
              Select an account to fill in the sign-in details.
            </p>
            <ul className="login-demo-accounts">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    className="login-demo-account"
                    aria-label={`Use ${account.name}, ${ROLE_LABEL[account.role]}`}
                    aria-pressed={email === account.email}
                    disabled={busy}
                    onClick={() => fillDemoAccount(account.email)}
                  >
                    <span className="login-demo-avatar" aria-hidden="true">
                      {account.name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span className="login-demo-copy">
                      <strong>{account.name}</strong>
                      <span>{ROLE_LABEL[account.role]}</span>
                    </span>
                    {email === account.email ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <ArrowRight size={15} aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
