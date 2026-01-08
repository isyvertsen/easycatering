"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCombinedDishesList,
  useDeleteCombinedDish,
  useBulkDeleteCombinedDishes
} from "@/hooks/useCombinedDishes"
import { CombinedDish, CombinedDishListParams } from "@/lib/api/combined-dishes"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { UtensilsCrossed, ChefHat, Package } from "lucide-react"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { CrudListParams } from "@/hooks/useCrud"

const columns: DataTableColumn<CombinedDish>[] = [
  {
    key: "name",
    label: "Navn",
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{value}</span>
      </div>
    ),
  },
  {
    key: "recipe_components",
    label: "Komponenter",
    render: (_, item) => (
      <div className="flex gap-2">
        {item.recipe_components.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <ChefHat className="h-3 w-3" />
            {item.recipe_components.length} oppskrift{item.recipe_components.length !== 1 ? 'er' : ''}
          </Badge>
        )}
        {item.product_components.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            {item.product_components.length} produkt{item.product_components.length !== 1 ? 'er' : ''}
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "created_at",
    label: "Opprettet",
    sortable: true,
    render: (value) => (
      <span className="text-muted-foreground">
        {format(new Date(value), "d. MMM yyyy", { locale: nb })}
      </span>
    ),
  },
]

export default function DishesPage() {
  const router = useRouter()

  // Query parameters state
  const [params, setParams] = useState<CombinedDishListParams>({
    page: 1,
    page_size: 20,
  })

  // Hooks
  const { data, isLoading } = useCombinedDishesList(params)
  const deleteMutation = useDeleteCombinedDish()
  const bulkDeleteMutation = useBulkDeleteCombinedDishes()

  const dishes = data?.items || []
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
    router.push('/dishes/create')
  }

  const handleEdit = (dish: CombinedDish) => {
    router.push(`/dishes/create?id=${dish.id}`)
  }

  const handleDelete = (id: number | string) => {
    deleteMutation.mutate(Number(id))
  }

  const handleBulkDelete = (ids: (number | string)[]) => {
    bulkDeleteMutation.mutate(ids.map(Number))
  }

  if (isLoading && dishes.length === 0) {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sammensatte retter</h1>
        <p className="text-muted-foreground">
          Kombiner oppskrifter og produkter til komplette retter
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle retter</CardTitle>
          <CardDescription>
            {total} retter totalt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            tableName="dishes"
            columns={columns}
            data={dishes}
            total={total}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onParamsChange={handleParamsChange}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            loading={isLoading}
            idField="id"
            searchPlaceholder="Søk etter rett..."
            enableEdit={true}
            enableDelete={true}
            enableBulkOperations={true}
            onEdit={handleEdit}
            onCreate={handleCreate}
            createButtonLabel="Ny rett"
          />
        </CardContent>
      </Card>
    </div>
  )
}
