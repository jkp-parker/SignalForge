import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type User, type UserCreate } from '../../lib/api'
import { Plus, X } from 'lucide-react'

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
      username: form.get('username') as string,
      password: form.get('password') as string,
      full_name: form.get('full_name') as string,
      role: form.get('role') as string,
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Users</h1>
          <p className="text-sm text-gray-400 mt-1">Manage user accounts and roles</p>
        </div>
        <button
          className={showForm ? 'btn-secondary' : 'btn-primary'}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <><X className="h-4 w-4" />Cancel</> : <><Plus className="h-4 w-4" />Add User</>}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">New User</h3>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Full Name</label>
                <input name="full_name" className="input" required placeholder="John Smith" />
              </div>
              <div>
                <label className="label">Username</label>
                <input name="username" className="input" required placeholder="jsmith" />
              </div>
              <div>
                <label className="label">Password</label>
                <input name="password" type="password" className="input" required placeholder="Minimum 6 characters" />
              </div>
              <div>
                <label className="label">Role</label>
                <select name="role" className="input">
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
          <p className="text-sm text-gray-500 text-center py-8">Loading users...</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="table-th">Name</th>
                <th className="table-th">Username</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Created</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((u: User) => (
                <tr key={u.id} className="hover:bg-gray-700/30">
                  <td className="table-td font-medium">{u.full_name || '—'}</td>
                  <td className="table-td font-mono text-xs text-gray-400">{u.username}</td>
                  <td className="table-td">
                    <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-gray'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="table-td text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="table-td">
                    <button
                      className="btn-danger text-xs py-1 px-2"
                      onClick={() => {
                        if (confirm(`Delete user "${u.username}"?`)) {
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
