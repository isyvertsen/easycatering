"use client"

import { useState, useCallback } from "react"
import {
  useKategorierList,
  useCreateKategori,
  useUpdateKategori,
  useDeleteKategori,
  useBulkDeleteKategorier
} from "@/hooks/useKategorier"
import { Kategori, KategoriListParams } from "@/lib/api/kategorier"
import { KategoriDialog, KategoriFormValues } from "@/components/kategorier/kategori-dialog"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CrudListParams } from "@/hooks/useCrud"

const columns: DataTableColumn<Kategori>[] = [
  {
    key: "kategori",
    label: "Navn",
    sortable: true,
  },
  {
    key: "beskrivelse",
    label: "Beskrivelse",
    sortable: true,
    render: (value) => value || "-",
  },
]

export default function KategorierPage() {
  // Query parameters state
  const [params, setParams] = useState<KategoriListParams>({
    page: 1,
    page_size: 20,
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKategori, setEditingKategori] = useState<Kategori | null>(null)

  // Hooks
  const { data, isLoading } = useKategorierList(params)
  const createMutation = useCreateKategori()
  const updateMutation = useUpdateKategori()
  const deleteMutation = useDeleteKategori()
  const bulkDeleteMutation = useBulkDeleteKategorier()

  const kategorier = data?.items || []
  const total = data?.total || 0
  const page = data?.page || 1
  const pageSize = data?.page_size || 20
  const totalPages = data?.total_pages || 1

  const handleParamsChange = useCallback((newParams: CrudListParams) => {
    setParams(prev => ({
      ...prev,
      ...newParams,
    }))
  }, [])

  const handleCreate = () => {
    setEditingKategori(null)
    setDialogOpen(true)
  }

  const handleEdit = (kategori: Kategori) => {
    setEditingKategori(kategori)
    setDialogOpen(true)
  }

  const handleDelete = (id: number | string) => {
    deleteMutation.mutate(Number(id))
  }

  const handleBulkDelete = (ids: (number | string)[]) => {
    bulkDeleteMutation.mutate(ids.map(Number))
  }

  const handleSubmit = (data: KategoriFormValues) => {
    if (editingKategori) {
      updateMutation.mutate(
        { id: editingKategori.kategoriid, data },
        {
          onSuccess: () => {
            setDialogOpen(false)
            setEditingKategori(null)
          },
        }
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false)
        },
      })
    }
  }

  if (isLoading && kategorier.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kategorier</h1>
        <p className="text-muted-foreground">
          Administrer produktkategorier
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle kategorier</CardTitle>
          <CardDescription>
            {total} kategorier totalt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            tableName="kategorier"
            columns={columns}
            data={kategorier}
            total={total}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onParamsChange={handleParamsChange}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            loading={isLoading}
            idField="kategoriid"
            searchPlaceholder="Søk etter kategori..."
            enableEdit={true}
            enableDelete={true}
            enableBulkOperations={true}
            onEdit={handleEdit}
            onCreate={handleCreate}
            createButtonLabel="Ny kategori"
          />
        </CardContent>
      </Card>

      <KategoriDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kategori={editingKategori}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
