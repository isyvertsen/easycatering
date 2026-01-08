"use client"

import { useState } from "react"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { useProducts, useDeleteProduct } from "@/hooks/useProducts"
import { Product } from "@/types/models"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CrudListParams } from "@/hooks/useCrud"
import { Search } from "lucide-react"
import Link from "next/link"
import { ProductExport } from "@/components/products/ProductExport"

const columns: DataTableColumn<Product>[] = [
  {
    key: "produktnavn",
    label: "Produktnavn",
    sortable: true,
  },
  {
    key: "leverandorsproduktnr",
    label: "Leverandørens produktnr",
    sortable: true,
    render: (value) => value || "-"
  },
  {
    key: "visningsnavn",
    label: "Visningsnavn",
    sortable: true,
    render: (value) => value || "-"
  },
  {
    key: "pakningstype",
    label: "Pakningstype",
    render: (value) => value || "-"
  },
  {
    key: "pakningsstorrelse",
    label: "Pakningsstørrelse",
    render: (value) => value || "-"
  },
  {
    key: "pris",
    label: "Pris",
    sortable: true,
    render: (value) => value ? `kr ${value.toFixed(2)}` : "-"
  },
  {
    key: "lagermengde",
    label: "Lagermengde",
    sortable: true,
    render: (value) => value || "0"
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
  {
    key: "webshop",
    label: "Webshop",
    render: (value) => (
      <Badge variant={value ? "default" : "outline"}>
        {value ? "Ja" : "Nei"}
      </Badge>
    )
  },
]

export default function ProductsPage() {
  const [params, setParams] = useState({
    skip: 0,
    limit: 20,
    aktiv: true,
  })

  const {
    data,
    isLoading,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    categoryFilter,
    setCategoryFilter,
  } = useProducts(params)

  const deleteMutation = useDeleteProduct()

  const handleParamsChange = (newParams: CrudListParams) => {
    const page = Number(newParams.page) || 1
    const pageSize = Number(newParams.page_size) || 20

    setParams(prev => ({
      ...prev,
      skip: Math.max(0, (page - 1) * (pageSize || prev.limit)),
      limit: pageSize || prev.limit,
    }))
  }

  const handleDelete = (id: number | string) => {
    deleteMutation.mutate(Number(id))
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setParams(prev => ({ ...prev, sok: term, skip: 0 }))
  }

  const handleActiveFilterChange = (active: boolean) => {
    setActiveFilter(active)
    setParams(prev => ({ ...prev, aktiv: active, skip: 0 }))
  }

  const handleCategoryChange = (categoryId?: number) => {
    setCategoryFilter(categoryId)
    setParams(prev => ({ ...prev, kategori: categoryId, skip: 0 }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Produkter</h1>
        <p className="text-muted-foreground">
          Administrer produkter og deres informasjon
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            placeholder="Søk etter produktnavn, visningsnavn eller leverandørens produktnr..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <Link href="/products/search">
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Avansert søk
            </Button>
          </Link>
          <ProductExport />
          <select
            value={activeFilter ? "active" : "inactive"}
            onChange={(e) => handleActiveFilterChange(e.target.value === "active")}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="active">Aktive produkter</option>
            <option value="inactive">Utgåtte produkter</option>
          </select>
        </div>
      </div>

      <DataTable<Product>
        tableName="products"
        columns={columns}
        data={data || []}
        total={data?.length || 0}
        page={1}
        pageSize={20}
        totalPages={1}
        onParamsChange={handleParamsChange}
        onDelete={handleDelete}
        loading={isLoading}
        idField="produktid"
      />
    </div>
  )
}