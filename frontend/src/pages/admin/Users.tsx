import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type User, type UserCreate } from '../../lib/api'

export default function Users() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: UserCreate) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    createMutation.mutate({
      email: form.get('email') as string,
      password: form.get('password') as string,
      full_name: form.get('full_name') as string,
      role: form.get('role') as string,
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Users</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Manage user accounts and roles
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>New User</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Full Name
                </label>
                <input name="full_name" required placeholder="John Smith" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Email
                </label>
                <input name="email" type="email" required placeholder="john@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Password
                </label>
                <input name="password" type="password" required placeholder="Minimum 6 characters" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Role
                </label>
                <select name="role">
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading users...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: User) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.full_name || '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn-danger"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => {
                        if (confirm(`Delete user "${u.email}"?`)) {
                          deleteMutation.mutate(u.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
