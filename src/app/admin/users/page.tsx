'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Shield, ShieldOff } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/admin/users')
      setUsers(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feil ved henting av brukere')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.accessToken) {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken])

  const activateUser = async (userId: number) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/activate`)
      fetchUsers()
    } catch (err) {
      alert('Feil ved aktivering av bruker')
    }
  }

  const deactivateUser = async (userId: number) => {
    if (!confirm('Er du sikker på at du vil deaktivere denne brukeren?')) {
      return
    }

    try {
      await apiClient.patch(`/admin/users/${userId}/deactivate`)
      fetchUsers()
    } catch (err) {
      alert('Feil ved deaktivering av bruker')
    }
  }

  const makeAdmin = async (userId: number) => {
    if (!confirm('Er du sikker på at du vil gi denne brukeren administratorrettigheter?')) {
      return
    }

    try {
      await apiClient.patch(`/admin/users/${userId}/make-admin`)
      fetchUsers()
    } catch (err) {
      alert('Feil ved tildeling av administratorrettigheter')
    }
  }

  const removeAdmin = async (userId: number) => {
    if (!confirm('Er du sikker på at du vil fjerne administratorrettigheter fra denne brukeren?')) {
      return
    }

    try {
      await apiClient.patch(`/admin/users/${userId}/remove-admin`)
      fetchUsers()
    } catch (err) {
      alert('Feil ved fjerning av administratorrettigheter')
    }
  }

  if (loading) {
    return <div className="p-6">Laster...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Brukeradministrasjon</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Navn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-post
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rolle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Opprettet
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Handlinger
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.is_active ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Aktiv
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Venter godkjenning
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.is_superuser ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      Administrator
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Bruker
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('no-NO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {!user.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateUser(user.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aktiver
                    </Button>
                  )}
                  {user.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deactivateUser(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deaktiver
                    </Button>
                  )}
                  {!user.is_superuser && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => makeAdmin(user.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Gjør admin
                    </Button>
                  )}
                  {user.is_superuser && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeAdmin(user.id)}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      <ShieldOff className="h-4 w-4 mr-1" />
                      Fjern admin
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
