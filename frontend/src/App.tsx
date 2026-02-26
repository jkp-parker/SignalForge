import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Connectors from './pages/admin/Connectors'
import ConnectorDetail from './pages/admin/ConnectorDetail'
import Users from './pages/admin/Users'
import Settings from './pages/admin/Settings'

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
    </div>
  }

  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/connectors" replace />} />
        <Route path="admin/connectors" element={<Connectors />} />
        <Route path="admin/connectors/:id" element={<ConnectorDetail />} />
        <Route path="admin/users" element={
          <ProtectedRoute requiredRole="admin"><Users /></ProtectedRoute>
        } />
        <Route path="admin/settings" element={
          <ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}
