"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  useMatinfoProducts,
  useDeleteMatinfoProduct,
  useSyncProducts,
  useUpdatedGtins,
  useNewProducts,
} from "@/hooks/useMatinfo"
import { MatinfoProduct, MatinfoListParams } from "@/lib/api/matinfo"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  Loader2,
  Database,
  Download,
  Beaker
} from "lucide-react"

const columns: DataTableColumn<MatinfoProduct>[] = [
  {
    key: "gtin",
    label: "GTIN",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-sm">{value}</span>
    ),
  },
  {
    key: "name",
    label: "Produktnavn",
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium max-w-[300px] truncate">{value}</span>
      </div>
    ),
  },
  {
    key: "brandName",
    label: "Merke",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "allergens",
    label: "Allergener",
    render: (_, item) => {
      const containsAllergens = item.allergens.filter(a => a.level === "CONTAINS")
      if (containsAllergens.length === 0) {
        return <Badge variant="outline" className="text-xs">Ingen</Badge>
      }
      return (
        <div className="flex gap-1 flex-wrap max-w-[200px]">
          {containsAllergens.slice(0, 3).map(a => (
            <Badge key={a.code} variant="destructive" className="text-xs">
              {a.name}
            </Badge>
          ))}
          {containsAllergens.length > 3 && (
            <Badge variant="outline" className="text-xs">+{containsAllergens.length - 3}</Badge>
          )}
        </div>
      )
    },
  },
  {
    key: "nutrients",
    label: "Næring",
    render: (_, item) => (
      <Badge variant="secondary" className="text-xs">
        <Beaker className="h-3 w-3 mr-1" />
        {item.nutrients.length} verdier
      </Badge>
    ),
  },
]

export default function MatinfoPage() {
  const router = useRouter()
  const [params, setParams] = useState<MatinfoListParams>({
    page: 1,
    size: 20,
  })

  // Data hooks
  const { data, isLoading } = useMatinfoProducts(params)
  const { data: updatedGtins, isLoading: loadingUpdated } = useUpdatedGtins(7)
  const { data: newProducts, isLoading: loadingNew } = useNewProducts(30)

  // Mutation hooks
  const deleteMutation = useDeleteMatinfoProduct()
  const syncMutation = useSyncProducts()

  const products = data?.items || []
  const total = data?.total || 0
  const page = data?.page || 1
  const pageSize = data?.size || 20
  const totalPages = Math.ceil(total / pageSize)

  const handleParamsChange = useCallback((newParams: { page?: number; page_size?: number; search?: string }) => {
    setParams(prev => ({
      ...prev,
      page: newParams.page || prev.page,
      size: newParams.page_size || prev.size,
      search: newParams.search,
    }))
  }, [])

  const handleEdit = (product: MatinfoProduct) => {
    router.push(`/matinfo/${product.id}`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleSync = () => {
    syncMutation.mutate(7)
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matinfo Administrasjon</h1>
          <p className="text-muted-foreground">
            Administrer produktinformasjon, allergener og næringsverdier
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Synkroniser
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt produkter</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              produkter i databasen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oppdatert (7 dager)</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingUpdated ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{updatedGtins?.count || 0}</div>
                <p className="text-xs text-muted-foreground">
                  produkter med oppdateringer
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nye produkter</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingNew ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{newProducts?.count || 0}</div>
                <p className="text-xs text-muted-foreground">
                  nye i Matinfo (30 dager)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      {syncMutation.isSuccess && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Synkronisering fullført</p>
              <p className="text-sm text-muted-foreground">
                {syncMutation.data?.synced} produkter synkronisert
                {syncMutation.data?.failed ? `, ${syncMutation.data.failed} feilet` : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {syncMutation.isError && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Synkronisering feilet</p>
              <p className="text-sm text-muted-foreground">
                Kunne ikke synkronisere med Matinfo.no
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matinfo-produkter</CardTitle>
          <CardDescription>
            Produkter med næringsinformasjon og allergener fra Matinfo.no
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            tableName="matinfo"
            columns={columns}
            data={products}
            total={total}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onParamsChange={handleParamsChange}
            onDelete={(id) => handleDelete(String(id))}
            loading={isLoading}
            idField="id"
            searchPlaceholder="Søk etter produkt, GTIN eller merke..."
            enableEdit={true}
            enableDelete={true}
            enableBulkOperations={false}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>
    </div>
  )
}
