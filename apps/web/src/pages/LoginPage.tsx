import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@hub/shared';
import { ErrorNotice } from '../components/ErrorNotice';
import { useAuth } from '../lib/auth';

const ROLE_LABEL = { teacher: 'Teacher', curriculum_lead: 'Curriculum Lead' } as const;

export function LoginPage() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

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
  }

  return (
    <main id="main" className="login">
      <h1>Curriculum Design Hub</h1>
      <p className="muted">
        Draft curriculum-grounded lesson plans, refine them, and share approved lessons.
      </p>
      <form onSubmit={handleSubmit} className="card stack">
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <ErrorNotice error={error} />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <section className="card" aria-labelledby="demo-heading">
        <h2 id="demo-heading">Demo accounts</h2>
        <p className="muted">Password for all: {DEMO_PASSWORD}</p>
        <ul className="plain">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                className="link-button"
                onClick={() => fillDemoAccount(account.email)}
              >
                Use {account.name}, {ROLE_LABEL[account.role]}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
