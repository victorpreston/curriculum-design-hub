import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSignedInUser, useAuth } from '../lib/auth';
import { MetricIcon } from './MetricIcons';
import { WorkspaceSearch } from './WorkspaceSearch';

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
        <NavLink className="sidebar-brand" to="/dashboard" aria-label="Curriculum Design Hub home">
          <img className="sidebar-logo" src="/logo.png" alt="Curriculum Design Hub" />
        </NavLink>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Main">
          <NavLink to="/dashboard" className="sidebar-link">
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5ZM4 16a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3ZM14 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6Z"
                />
              </svg>
            </span>
            <span>Dashboard</span>
          </NavLink>
          {user.role === 'teacher' ? (
            <NavLink to="/plans" className="sidebar-link">
              <span className="nav-icon" aria-hidden="true">
                <MetricIcon name="plans" />
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
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16.5 7.063C16.5 10.258 14.57 13 12 13c-2.572 0-4.5-2.742-4.5-5.938C7.5 3.868 9.16 2 12 2s4.5 1.867 4.5 5.063zM4.102 20.142C4.487 20.6 6.145 22 12 22c5.855 0 7.512-1.4 7.898-1.857a.416.416 0 0 0 .09-.317C19.9 18.944 19.106 15 12 15s-7.9 3.944-7.989 4.826a.416.416 0 0 0 .091.317z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Teaching team</span>
            </NavLink>
          )}
          <NavLink to="/bank" className="sidebar-link">
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V11M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M19 9V11M19 17V17.8C19 18.9201 19 19.4802 18.782 19.908C18.5903 20.2843 18.2843 20.5903 17.908 20.782C17.4802 21 16.9201 21 15.8 21H8.2C7.0799 21 6.51984 21 6.09202 20.782C5.71569 20.5903 5.40973 20.2843 5.21799 19.908C5 19.4802 5 18.9201 5 17.8V17M3 14H6M9 14H15M18 14H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Lesson bank</span>
          </NavLink>
          <NavLink to="/guide" className="sidebar-link">
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10 9C10 8.60444 10.1173 8.21776 10.3371 7.88886C10.5568 7.55996 10.8692 7.30362 11.2346 7.15224C11.6001 7.00087 12.0022 6.96126 12.3902 7.03843C12.7781 7.1156 13.1345 7.30608 13.4142 7.58579C13.6939 7.86549 13.8844 8.22186 13.9616 8.60982C14.0387 8.99778 13.9991 9.39992 13.8478 9.76537C13.6964 10.1308 13.44 10.4432 13.1111 10.6629C12.7822 10.8827 12.3956 11 12 11V12M14.25 19L12.8 20.9333C12.4 21.4667 11.6 21.4667 11.2 20.9333L9.75 19H7C4.79086 19 3 17.2091 3 15V7C3 4.79086 4.79086 3 7 3H17C19.2091 3 21 4.79086 21 7V15C21 17.2091 19.2091 19 17 19H14.25Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="15" r="1" fill="currentColor" />
              </svg>
            </span>
            <span>How it works</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <strong>Curriculum Hub</strong>
          <span className="small">@2026</span>
        </div>
      </aside>

      <div className="app-frame">
        <header className="topbar">
          <WorkspaceSearch />
          <div className="account">
            <button type="button" className="account-trigger" aria-label="Open profile menu">
              <span className="profile-avatar" aria-hidden="true">
                {getInitials(user.name)}
              </span>
              <span className="profile-copy">
                <strong>{user.name}</strong>
                <span>{ROLE_LABEL[user.role]}</span>
              </span>
              <span className="profile-chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            <div className="account-dropdown" role="menu">
              <div className="account-dropdown-profile">
                <strong>{user.name}</strong>
                <span>{ROLE_LABEL[user.role]}</span>
              </div>
              <button
                type="button"
                className="account-sign-out"
                onClick={handleSignOut}
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main id="main" className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
