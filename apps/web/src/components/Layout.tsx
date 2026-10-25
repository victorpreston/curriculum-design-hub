import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSignedInUser, useAuth } from '../lib/auth';

const ROLE_LABEL = { teacher: 'Teacher', curriculum_lead: 'Curriculum Lead' } as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Layout() {
  const user = useSignedInUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <div>
            <span className="brand">Curriculum Hub</span>
            <span className="brand-subtitle">Design workspace</span>
          </div>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Main">
          <NavLink to="/dashboard" className="sidebar-link">
            <span className="nav-icon" aria-hidden="true">
              ◉
            </span>
            <span>Overview</span>
          </NavLink>
          {user.role === 'teacher' ? (
            <NavLink to="/plans" className="sidebar-link">
              <span className="nav-icon" aria-hidden="true">
                ◫
              </span>
              <span>My plans</span>
            </NavLink>
          ) : (
            <NavLink to="/review" className="sidebar-link">
              <span className="nav-icon" aria-hidden="true">
                ✓
              </span>
              <span>Review queue</span>
            </NavLink>
          )}
          {user.role === 'curriculum_lead' && (
            <NavLink to="/team" className="sidebar-link">
              <span className="nav-icon" aria-hidden="true">
                ◎
              </span>
              <span>Teaching team</span>
            </NavLink>
          )}
          <NavLink to="/bank" className="sidebar-link">
            <span className="nav-icon" aria-hidden="true">
              ▤
            </span>
            <span>Lesson bank</span>
          </NavLink>
          <NavLink to="/guide" className="sidebar-link">
            <span className="nav-icon" aria-hidden="true">
              ?
            </span>
            <span>How it works</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-label">Signed in as</div>
          <strong>{ROLE_LABEL[user.role]}</strong>
          <span className="small">Secure curriculum workspace</span>
        </div>
      </aside>

      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-context">
            <span className="eyebrow">Curriculum workspace</span>
            <span className="topbar-title">Plan, review, publish</span>
          </div>
          <div className="account">
            <div className="profile-avatar" aria-hidden="true">
              {getInitials(user.name)}
            </div>
            <div className="profile-copy">
              <strong>{user.name}</strong>
              <span>{ROLE_LABEL[user.role]}</span>
            </div>
            <button type="button" className="link-button sign-out" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>
        <main id="main" className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
