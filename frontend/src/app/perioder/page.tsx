"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  usePerioderList,
  useCreatePeriode,
  useUpdatePeriode,
  useDeletePeriode,
  useBulkDeletePerioder
} from "@/hooks/usePerioder"
import { Periode, PeriodeListParams } from "@/lib/api/perioder"
import { PeriodeDialog, PeriodeFormValues } from "@/components/perioder/periode-dialog"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CrudListParams } from "@/hooks/useCrud"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Eye } from "lucide-react"

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("nb-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  } catch {
    return "-"
  }
}

const columns: DataTableColumn<Periode>[] = [
  {
    key: "ukenr",
    label: "Ukenummer",
    sortable: true,
    render: (value) => value ? `Uke ${value}` : "-",
  },
  {
    key: "fradato",
    label: "Fra dato",
    sortable: true,
    render: (value) => formatDate(value),
  },
  {
    key: "tildato",
    label: "Til dato",
    sortable: true,
    render: (value) => formatDate(value),
  },
]

export default function PerioderPage() {
  const router = useRouter()

  // Query parameters state
  const [params, setParams] = useState<PeriodeListParams>({
    page: 1,
    page_size: 20,
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPeriode, setEditingPeriode] = useState<Periode | null>(null)

  // Hooks
  const { data, isLoading } = usePerioderList(params)
  const createMutation = useCreatePeriode()
  const updateMutation = useUpdatePeriode()
  const deleteMutation = useDeletePeriode()
  const bulkDeleteMutation = useBulkDeletePerioder()

  const perioder = data?.items || []
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
    setEditingPeriode(null)
    setDialogOpen(true)
  }

  const handleEdit = (periode: Periode) => {
    setEditingPeriode(periode)
    setDialogOpen(true)
  }

  const handleDelete = (id: number | string) => {
    deleteMutation.mutate(Number(id))
  }

  const handleBulkDelete = (ids: (number | string)[]) => {
    bulkDeleteMutation.mutate(ids.map(Number))
  }

  const handleSubmit = (data: PeriodeFormValues) => {
    if (editingPeriode) {
      updateMutation.mutate(
        { id: editingPeriode.menyperiodeid, data },
        {
          onSuccess: () => {
            setDialogOpen(false)
            setEditingPeriode(null)
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

  if (isLoading && perioder.length === 0) {
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
        <h1 className="text-3xl font-bold tracking-tight">Perioder</h1>
        <p className="text-muted-foreground">
          Administrer menyperioder
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle perioder</CardTitle>
          <CardDescription>
            {total} perioder totalt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            tableName="perioder"
            columns={columns}
            data={perioder}
            total={total}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onParamsChange={handleParamsChange}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            loading={isLoading}
            idField="menyperiodeid"
            searchPlaceholder="Sok etter ukenummer..."
            enableEdit={true}
            enableDelete={true}
            enableBulkOperations={true}
            onEdit={handleEdit}
            onCreate={handleCreate}
            createButtonLabel="Ny periode"
            customActions={(periode) => (
              <DropdownMenuItem
                onClick={() => router.push(`/perioder/${periode.menyperiodeid}/view`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Vis struktur
              </DropdownMenuItem>
            )}
          />
        </CardContent>
      </Card>

      <PeriodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        periode={editingPeriode}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
