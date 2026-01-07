"use client"

import { Suspense, useMemo } from "react"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { useEmployeesList, useDeleteEmployee, useBulkDeleteEmployees } from "@/hooks/useEmployees"
import { Employee } from "@/types/models"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CrudListParams } from "@/hooks/useCrud"
import { useUrlParams } from "@/hooks/useUrlParams"
import { Download } from "lucide-react"

const columns: DataTableColumn<Employee>[] = [
  {
    key: "fornavn",
    label: "Fornavn",
    sortable: true,
  },
  {
    key: "etternavn",
    label: "Etternavn",
    sortable: true,
  },
  {
    key: "tittel",
    label: "Tittel",
    sortable: true,
    render: (value) => value || "-"
  },
  {
    key: "avdeling",
    label: "Avdeling",
    sortable: true,
    render: (value) => value || "-"
  },
  {
    key: "e_postjobb",
    label: "E-post",
    render: (value) => value ? (
      <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
        {value}
      </a>
    ) : "-"
  },
  {
    key: "tlfprivat",
    label: "Telefon",
    render: (value) => value || "-"
  },
  {
    key: "sluttet",
    label: "Status",
    render: (value) => (
      <Badge variant={!value ? "default" : "secondary"}>
        {!value ? "Aktiv" : "Sluttet"}
      </Badge>
    )
  },
]

type EmployeeListParams = {
  page: number
  page_size: number
  aktiv: boolean
  avdeling?: string
  search?: string
}

const defaultParams: EmployeeListParams = {
  page: 1,
  page_size: 20,
  aktiv: true,
}

const bulkExportColumns = [
  { key: 'fornavn', label: 'Fornavn' },
  { key: 'etternavn', label: 'Etternavn' },
  { key: 'tittel', label: 'Tittel' },
  { key: 'avdeling', label: 'Avdeling' },
  { key: 'e_postjobb', label: 'E-post' },
  { key: 'tlfprivat', label: 'Telefon' },
]

function EmployeesPageContent() {
  const { params, setParams } = useUrlParams<EmployeeListParams>(defaultParams)
  const deleteMutation = useDeleteEmployee()
  const bulkDeleteMutation = useBulkDeleteEmployees()

  // Convert page/page_size to skip/limit for API
  const apiParams = {
    skip: ((params.page || 1) - 1) * (params.page_size || 20),
    limit: params.page_size || 20,
    aktiv: params.aktiv,
    avdeling: params.avdeling,
    search: params.search,
  }

  const { data, isLoading } = useEmployeesList(apiParams)

  // Get unique departments from all employees for filter
  const departments = useMemo(() => {
    if (!data?.items) return []
    const depts = data.items
      .map(e => e.avdeling)
      .filter((d): d is string => !!d)
    return [...new Set(depts)].sort()
  }, [data?.items])

  const handleParamsChange = (newParams: CrudListParams) => {
    setParams({
      page: newParams.page,
      page_size: newParams.page_size,
      search: newParams.search || undefined,
    })
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleBulkDelete = (ids: number[]) => {
    bulkDeleteMutation.mutate(ids)
  }

  const handleExportCSV = () => {
    if (!data?.items) return

    const headers = ['Fornavn', 'Etternavn', 'Tittel', 'Avdeling', 'E-post', 'Telefon', 'Status']
    const rows = data.items.map(e => [
      e.fornavn || '',
      e.etternavn || '',
      e.tittel || '',
      e.avdeling || '',
      e.e_postjobb || '',
      e.tlfprivat || '',
      e.sluttet ? 'Sluttet' : 'Aktiv'
    ])

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ansatte-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ansatte</h1>
          <p className="text-muted-foreground">
            Administrer ansatte og deres informasjon
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={!data?.items?.length}>
          <Download className="mr-2 h-4 w-4" />
          Eksporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Switch
            id="aktiv-filter"
            checked={params.aktiv}
            onCheckedChange={(checked) => setParams({ aktiv: checked, page: 1 })}
          />
          <Label htmlFor="aktiv-filter">Kun aktive ansatte</Label>
        </div>

        <div className="flex items-center gap-2">
          <Label>Avdeling:</Label>
          <Select
            value={params.avdeling || "all"}
            onValueChange={(value) => setParams({
              avdeling: value === "all" ? undefined : value,
              page: 1
            })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle avdelinger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle avdelinger</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable<Employee>
        tableName="employees"
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={params.page || 1}
        pageSize={params.page_size || 20}
        totalPages={data?.total_pages || 1}
        onParamsChange={handleParamsChange}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        loading={isLoading}
        idField="ansattid"
        searchPlaceholder="Søk etter navn, e-post eller telefon..."
        bulkExportColumns={bulkExportColumns}
      />
    </div>
  )
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div className="p-6">Laster...</div>}>
      <EmployeesPageContent />
    </Suspense>
  )
}
