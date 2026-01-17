'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTable, DataTableColumn } from '@/components/crud/data-table'
import {
  useBrukereList,
  useCreateBruker,
  useUpdateBruker,
  useDeleteBruker,
  useActivateBruker,
} from '@/hooks/useBrukere'
import { Bruker } from '@/types/models'
import { BrukerListParams } from '@/lib/api/brukere'
import { Plus, UserCheck } from 'lucide-react'

export default function AdminUsersPage() {
  const [params, setParams] = useState<BrukerListParams>({
    page: 1,
    page_size: 20,
    sort_by: 'id',
    sort_order: 'desc',
  })

  const { data, isLoading } = useBrukereList(params)
  const createMutation = useCreateBruker()
  const updateMutation = useUpdateBruker()
  const deleteMutation = useDeleteBruker()
  const activateMutation = useActivateBruker()

  const [deleteConfirm, setDeleteConfirm] = useState<Bruker | null>(null)

  const columns: DataTableColumn<Bruker>[] = [
    {
      key: 'full_name',
      label: 'Navn',
      sortable: true,
    },
    {
      key: 'email',
      label: 'E-post',
      sortable: true,
      render: (value) => (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      ),
    },
    {
      key: 'ansatt',
      label: 'Tilknyttet ansatt',
      render: (value, row) => {
        if (row.ansatt) {
          return `${row.ansatt.fornavn || ''} ${row.ansatt.etternavn || ''}`.trim() || '-'
        }
        return '-'
      },
    },
    {
      key: 'rolle',
      label: 'Rolle',
      sortable: true,
      render: (value) => {
        const rolleLabels: Record<string, string> = {
          admin: 'Administrator',
          bruker: 'Bruker',
          webshop: 'Webshop',
        }
        return (
          <Badge variant={value === 'admin' ? 'default' : value === 'webshop' ? 'outline' : 'secondary'}>
            {rolleLabels[value] || value}
          </Badge>
        )
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value, row) => {
        if (!value) {
          return (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Inaktiv
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  activateMutation.mutate(row.id)
                }}
                className="h-6 px-2"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Aktiver
              </Button>
            </div>
          )
        }
        return (
          <Badge variant="default" className="bg-green-600">
            Aktiv
          </Badge>
        )
      },
    },
    {
      key: 'created_at',
      label: 'Opprettet',
      sortable: true,
      render: (value) =>
        value ? new Date(value).toLocaleDateString('no-NO') : '-',
    },
  ]

  const handleParamsChange = (newParams: Partial<BrukerListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }))
  }


  const handleDelete = (id: string | number) => {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id
    const bruker = data?.items.find((b) => b.id === numericId)
    if (bruker) {
      setDeleteConfirm(bruker)
    }
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brukeradministrasjon</h1>
          <p className="text-muted-foreground mt-1">
            Administrer brukere og tilganger i systemet
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4 mr-2" />
            Ny bruker
          </Link>
        </Button>
      </div>

      <DataTable<Bruker>
        tableName="admin/users"
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={params.page || 1}
        pageSize={params.page_size || 20}
        totalPages={data?.total_pages || 1}
        onParamsChange={handleParamsChange}
        onDelete={handleDelete}
        loading={isLoading}
        idField="id"
        searchPlaceholder="Sok etter navn eller e-post..."
        hideAddButton
        enableEdit={true}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktiver bruker?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker pa at du vil deaktivere brukeren{' '}
              <strong>{deleteConfirm?.full_name}</strong>? Brukeren vil ikke
              kunne logge inn, men dataene beholdes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deaktiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
