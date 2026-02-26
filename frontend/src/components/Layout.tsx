import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Activity, LayoutDashboard, Plug, Users, Settings, LogOut, ArrowRightLeft, Bell } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-56 bg-gray-950 flex flex-col h-screen shrink-0 border-r border-gray-800">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
          <Activity className="h-5 w-5 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight">SignalForge</p>
            <p className="text-xs text-gray-500 leading-tight">SCADA Alarm Platform</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
          {/* Overview */}
          <div className="space-y-0.5">
            <SidebarLink to="/" icon={<LayoutDashboard className="h-4 w-4" />} end>
              Dashboard
            </SidebarLink>
          </div>

          {/* Alarms — visible to all */}
          <div className="space-y-0.5">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Alarms
            </p>
            <SidebarLink to="/alarms/transform" icon={<ArrowRightLeft className="h-4 w-4" />}>
              Transformation
            </SidebarLink>
            <SidebarLink to="/alarms/explorer" icon={<Bell className="h-4 w-4" />} disabled>
              Explorer
              <span className="ml-auto text-[10px] text-gray-600">Phase 3</span>
            </SidebarLink>
          </div>

          {user?.role === 'admin' && (
            <div className="space-y-0.5">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Admin
              </p>
              <SidebarLink to="/admin/connectors" icon={<Plug className="h-4 w-4" />}>
                Connectors
              </SidebarLink>
              <SidebarLink to="/admin/users" icon={<Users className="h-4 w-4" />}>
                Users
              </SidebarLink>
              <SidebarLink to="/admin/settings" icon={<Settings className="h-4 w-4" />}>
                Settings
              </SidebarLink>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 mb-2 truncate">{user?.username}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-900">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function SidebarLink({
  to,
  children,
  icon,
  end,
  disabled,
}: {
  to: string
  children: React.ReactNode
  icon: React.ReactNode
  end?: boolean
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-gray-600 cursor-not-allowed">
        {icon}
        {children}
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}
