import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: '240px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        padding: '1.5rem 0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            SignalForge
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            SCADA Alarm Platform
          </p>
        </div>

        <div style={{ flex: 1 }}>
          {user?.role === 'admin' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                padding: '0 1.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-secondary)',
              }}>
                Admin
              </div>
              <SidebarLink to="/admin/connectors">Connectors</SidebarLink>
              <SidebarLink to="/admin/users">Users</SidebarLink>
              <SidebarLink to="/admin/settings">Settings</SidebarLink>
            </div>
          )}
        </div>

        <div style={{ padding: '0 1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
            {user?.email}
          </div>
          <button
            onClick={logout}
            className="btn-secondary"
            style={{ width: '100%', fontSize: '0.8125rem' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

function SidebarLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'block',
        padding: '0.5rem 1.5rem',
        fontSize: '0.875rem',
        color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
        backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
        borderRight: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
        transition: 'all 0.15s',
      })}
    >
      {children}
    </NavLink>
  )
}
