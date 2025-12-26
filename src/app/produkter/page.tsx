"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Search, CheckCircle, XCircle, Plus, Upload } from "lucide-react"
import { MatinfoSearchDialog } from "@/components/produkter/matinfo-search-dialog"
import { BulkGtinUpdateDialog } from "@/components/produkter/bulk-gtin-update-dialog"
import { useProdukterList } from "@/hooks/useProdukter"
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
    label: "GTIN/EAN",
    sortable: true,
    render: (value, row) => {
      if (!value) {
        return (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Mangler</span>
          </div>
        )
      }
      const formatted = formatGtin(value)
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <code className="text-sm font-mono">{formatted}</code>
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

  // Build query parameters for backend
  const queryParams = {
    skip: (currentPage - 1) * pageSize,
    limit: pageSize,
    aktiv: true,
    sok: searchTerm || undefined,
    has_gtin: gtinFilter === "all" ? undefined : gtinFilter === "with",
    sort_by: sortBy,
    sort_order: sortOrder,
  }

  // Fetch produkter from backend with server-side filtering, search, and sorting
  const { data: produkter = [], isLoading, refetch } = useProdukterList(queryParams)

  // Fetch stats separately (all products without pagination)
  const { data: allProdukter = [] } = useProdukterList({
    skip: 0,
    limit: 10000,
    aktiv: true,
  })

  // Calculate stats from all products
  const stats = {
    total: allProdukter.length,
    withGtin: allProdukter.filter((p) => !!p.ean_kode).length,
    withoutGtin: allProdukter.filter((p) => !p.ean_kode).length,
  }

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [gtinFilter, searchTerm])

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
        <Button onClick={() => setBulkDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Masse-oppdatering
        </Button>
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
