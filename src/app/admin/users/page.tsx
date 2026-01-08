'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { UserForm, BrukerFormValues } from '@/components/users/user-form'
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

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBruker, setEditingBruker] = useState<Bruker | undefined>()
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
      render: (value) => (
        <Badge variant={value === 'admin' ? 'default' : 'secondary'}>
          {value === 'admin' ? 'Administrator' : 'Bruker'}
        </Badge>
      ),
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

  const handleCreate = () => {
    setEditingBruker(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (bruker: Bruker) => {
    setEditingBruker(bruker)
    setIsFormOpen(true)
  }

  const handleDelete = (id: number) => {
    const bruker = data?.items.find((b) => b.id === id)
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

  const handleFormSubmit = (formData: BrukerFormValues) => {
    // Convert null to undefined for ansattid to match API types
    const data = {
      ...formData,
      ansattid: formData.ansattid ?? undefined,
    }

    if (editingBruker) {
      updateMutation.mutate(
        { id: editingBruker.id, data },
        {
          onSuccess: () => setIsFormOpen(false),
        }
      )
    } else {
      createMutation.mutate(data as any, {
        onSuccess: () => setIsFormOpen(false),
      })
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
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Ny bruker
        </Button>
      </div>

      <DataTable<Bruker>
        tableName="admin/brukere"
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={params.page || 1}
        pageSize={params.page_size || 20}
        totalPages={data?.total_pages || 1}
        onParamsChange={handleParamsChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        idField="id"
        searchPlaceholder="Sok etter navn eller e-post..."
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBruker ? 'Rediger bruker' : 'Opprett ny bruker'}
            </DialogTitle>
            <DialogDescription>
              {editingBruker
                ? 'Oppdater informasjon om brukeren'
                : 'Fyll inn informasjon for den nye brukeren'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            bruker={editingBruker}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
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
