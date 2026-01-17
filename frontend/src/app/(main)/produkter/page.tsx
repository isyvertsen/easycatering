"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Search, CheckCircle, XCircle, Plus, Upload, Pencil } from "lucide-react"
import { MatinfoSearchDialog } from "@/components/produkter/matinfo-search-dialog"
import { BulkGtinUpdateDialog } from "@/components/produkter/bulk-gtin-update-dialog"
import { useProdukterListWithMeta } from "@/hooks/useProdukter"
import { useDebounce } from "@/hooks/useDebounce"
import { Produkt } from "@/lib/api/produkter"
import { formatGtin } from "@/lib/utils/gtin"

const columns: DataTableColumn<Produkt>[] = [
  {
    key: "produktid",
    label: "ID",
    sortable: true,
  },
  {
    key: "produktnavn",
    label: "Produktnavn",
    sortable: true,
  },
  {
    key: "ean_kode",
    label: "GTIN",
    sortable: true,
    render: (value, row) => {
      const hasAnyGtin = value || (row as any).gtin_fpak || (row as any).gtin_dpak
      if (!hasAnyGtin) {
        return (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Mangler</span>
          </div>
        )
      }
      return (
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          <div className="space-y-0.5 text-xs font-mono">
            {value && <div className="text-muted-foreground">Basis: {formatGtin(value)}</div>}
            {(row as any).gtin_fpak && <div>F-pak: {formatGtin((row as any).gtin_fpak)}</div>}
            {(row as any).gtin_dpak && <div>D-pak: {formatGtin((row as any).gtin_dpak)}</div>}
          </div>
        </div>
      )
    }
  },
  {
    key: "leverandorsproduktnr",
    label: "Lev.nr",
    render: (value) => value || "-"
  },
  {
    key: "pris",
    label: "Pris",
    sortable: true,
    render: (value) => value ? `${value.toFixed(2)} kr` : "-"
  },
  {
    key: "webshop",
    label: "Webshop",
    sortable: true,
    render: (value) => {
      return value ? (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ja
        </Badge>
      ) : (
        <Badge variant="secondary">
          <XCircle className="h-3 w-3 mr-1" />
          Nei
        </Badge>
      )
    }
  },
  {
    key: "rett_komponent",
    label: "Brukes i retter",
    sortable: true,
    render: (value) => {
      return value ? (
        <Badge variant="default" className="bg-blue-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ja
        </Badge>
      ) : (
        <Badge variant="outline">
          <XCircle className="h-3 w-3 mr-1" />
          Nei
        </Badge>
      )
    }
  },
]

export default function ProdukterPage() {
  const router = useRouter()
  const [gtinFilter, setGtinFilter] = useState<"all" | "with" | "without">("all")
  const [selectedProduct, setSelectedProduct] = useState<Produkt | null>(null)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Debounce search to avoid excessive API calls while typing
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Build query parameters for backend
  const queryParams = {
    skip: (currentPage - 1) * pageSize,
    limit: pageSize,
    aktiv: true,
    sok: debouncedSearchTerm || undefined,
    has_gtin: gtinFilter === "all" ? undefined : gtinFilter === "with",
    sort_by: sortBy,
    sort_order: sortOrder,
    include_stats: true, // Get stats from backend to avoid fetching all 10000 products
  }

  // Fetch produkter from backend with server-side filtering, search, sorting, and stats
  const { data: response, isLoading, refetch } = useProdukterListWithMeta(queryParams)

  // Extract data from response
  const produkter = response?.items || []

  // Get stats from backend response (avoids N+1 query for all products)
  const stats = {
    total: response?.stats?.total || 0,
    withGtin: response?.stats?.with_gtin || 0,
    withoutGtin: response?.stats?.without_gtin || 0,
  }

  // Reset to page 1 when filter or debounced search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [gtinFilter, debouncedSearchTerm])

  const handleParamsChange = (newParams: {
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    page_size?: number
  }) => {
    // Handle search
    if (newParams.search !== undefined) {
      setSearchTerm(newParams.search)
    }

    // Handle sorting
    if (newParams.sort_by !== undefined) {
      setSortBy(newParams.sort_by)
      setSortOrder(newParams.sort_order || 'asc')
    }

    // Handle pagination
    if (newParams.page !== undefined) {
      setCurrentPage(newParams.page)
    }
    if (newParams.page_size !== undefined) {
      setPageSize(newParams.page_size)
      setCurrentPage(1)
    }
  }

  const handleSearchGtin = (product: Produkt) => {
    setSelectedProduct(product)
    setSearchDialogOpen(true)
  }

  const handleGtinUpdated = () => {
    refetch()
    setSearchDialogOpen(false)
    setSelectedProduct(null)
  }

  const handleBulkUpdateComplete = () => {
    refetch()
    setBulkDialogOpen(false)
  }

  const rowActions = (row: Produkt) => [
    {
      label: "Rediger",
      icon: Pencil,
      onClick: () => router.push(`/produkter/${row.produktid}`),
    },
    {
      label: row.ean_kode ? "Endre GTIN" : "Søk GTIN",
      icon: Search,
      onClick: () => handleSearchGtin(row),
    },
  ]

  // Calculate total pages based on filtered count
  const filteredCount = gtinFilter === "all"
    ? stats.total
    : gtinFilter === "with"
      ? stats.withGtin
      : stats.withoutGtin
  const totalPages = Math.ceil(filteredCount / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produkter</h1>
          <p className="text-muted-foreground">
            Administrer produkter og GTIN-koder
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Masse-oppdatering
          </Button>
          <Button onClick={() => router.push("/produkter/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nytt produkt
          </Button>
        </div>
      </div>

      {/* Stats and filter */}
      <div className="flex items-center justify-between">
        <Tabs value={gtinFilter} onValueChange={(v) => setGtinFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              Alle ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="with" className="gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Med GTIN ({stats.withGtin})
            </TabsTrigger>
            <TabsTrigger value="without" className="gap-2">
              <XCircle className="h-3 w-3 text-red-500" />
              Uten GTIN ({stats.withoutGtin})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="text-sm text-muted-foreground">
          {stats.withGtin > 0 && (
            <span>
              {((stats.withGtin / stats.total) * 100).toFixed(1)}% har GTIN
            </span>
          )}
        </div>
      </div>

      <DataTable<Produkt>
        tableName="produkter"
        columns={columns}
        data={produkter}
        total={filteredCount}
        page={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onParamsChange={handleParamsChange}
        onDelete={() => {}}
        loading={isLoading}
        idField="produktid"
        searchPlaceholder="Søk etter produktid, produktnavn, GTIN eller lev.nr..."
        customActions={(row) => (
          <>
            {rowActions(row).map((action, idx) => (
              <DropdownMenuItem key={idx} onClick={action.onClick}>
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
        enableEdit={false}
        enableDelete={false}
      />

      {selectedProduct && (
        <MatinfoSearchDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
          product={selectedProduct}
          onGtinUpdated={handleGtinUpdated}
        />
      )}

      <BulkGtinUpdateDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onComplete={handleBulkUpdateComplete}
      />
    </div>
  )
}
