"use client"

import { useState } from "react"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { useLeverandorerList, useDeleteLeverandor, useBulkDeleteLeverandorer } from "@/hooks/useLeverandorer"
import { Leverandor } from "@/types/models"
import { Badge } from "@/components/ui/badge"
import { CrudListParams } from "@/hooks/useCrud"

const columns: DataTableColumn<Leverandor>[] = [
  {
    key: "leverandornavn",
    label: "Navn",
    sortable: true,
  },
  {
    key: "refkundenummer",
    label: "Vårt kundenr.",
    sortable: true,
    render: (value) => value || "-"
  },
  {
    key: "telefonnummer",
    label: "Telefon",
    render: (value) => value || "-"
  },
  {
    key: "e_post",
    label: "E-post",
    render: (value) => value ? (
      <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
        {value}
      </a>
    ) : "-"
  },
  {
    key: "poststed",
    label: "Sted",
    render: (value) => value || "-"
  },
  {
    key: "utgatt",
    label: "Status",
    render: (value) => (
      <Badge variant={!value ? "default" : "secondary"}>
        {!value ? "Aktiv" : "Utgått"}
      </Badge>
    )
  },
]

export default function LeverandorerPage() {
  const [params, setParams] = useState({
    page: 1,
    page_size: 20,
    aktiv: true,
  })

  const { data, isLoading } = useLeverandorerList(params)
  const deleteMutation = useDeleteLeverandor()
  const bulkDeleteMutation = useBulkDeleteLeverandorer()

  const handleParamsChange = (newParams: CrudListParams) => {
    setParams(prev => ({
      ...prev,
      page: newParams.page ?? prev.page,
      page_size: newParams.page_size ?? prev.page_size,
      search: newParams.search || undefined,
      sort_by: newParams.sort_by,
      sort_order: newParams.sort_order,
    }))
  }

  const handleDelete = (id: number | string) => {
    deleteMutation.mutate(Number(id))
  }

  const handleBulkDelete = (ids: (number | string)[]) => {
    bulkDeleteMutation.mutate(ids.map(Number))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leverandører</h1>
        <p className="text-muted-foreground">
          Administrer leverandører og deres kontaktinformasjon
        </p>
      </div>

      <DataTable<Leverandor>
        tableName="leverandorer"
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={data?.page || 1}
        pageSize={data?.page_size || 20}
        totalPages={data?.total_pages || 1}
        onParamsChange={handleParamsChange}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        loading={isLoading}
        idField="leverandorid"
        searchPlaceholder="Søk etter leverandør..."
        enableDelete={true}
        enableBulkOperations={true}
      />
    </div>
  )
}
