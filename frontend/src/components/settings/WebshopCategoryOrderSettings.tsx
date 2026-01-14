"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWebshopCategoryOrder, useUpdateWebshopCategoryOrder } from "@/hooks/useSystemSettings"
import { useKategorierList } from "@/hooks/useKategorier"
import { ShoppingCart, GripVertical, ArrowUp, ArrowDown, X, Plus, Loader2, Save } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryItem {
  kategoriid: number
  kategori: string
}

export function WebshopCategoryOrderSettings() {
  const { data: categoryOrderData, isLoading: isLoadingOrder } = useWebshopCategoryOrder()
  const { data: kategorierData, isLoading: isLoadingKategorier } = useKategorierList({ page_size: 100 })
  const updateCategoryOrder = useUpdateWebshopCategoryOrder()

  const [orderedCategories, setOrderedCategories] = useState<CategoryItem[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize ordered categories when data loads
  useEffect(() => {
    if (categoryOrderData && kategorierData) {
      const categoryMap = new Map(
        kategorierData.items.map((k) => [k.kategoriid, k.kategori])
      )

      // Build ordered list from saved IDs
      const ordered: CategoryItem[] = []
      for (const id of categoryOrderData.category_ids) {
        const name = categoryMap.get(id)
        if (name) {
          ordered.push({ kategoriid: id, kategori: name })
        }
      }
      setOrderedCategories(ordered)
      setHasChanges(false)
    }
  }, [categoryOrderData, kategorierData])

  // Get categories not yet in the ordered list
  const availableCategories = kategorierData?.items.filter(
    (k) => !orderedCategories.some((o) => o.kategoriid === k.kategoriid)
  ) || []

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...orderedCategories]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setOrderedCategories(newOrder)
    setHasChanges(true)
  }

  const moveDown = (index: number) => {
    if (index === orderedCategories.length - 1) return
    const newOrder = [...orderedCategories]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setOrderedCategories(newOrder)
    setHasChanges(true)
  }

  const removeCategory = (index: number) => {
    const newOrder = orderedCategories.filter((_, i) => i !== index)
    setOrderedCategories(newOrder)
    setHasChanges(true)
  }

  const addCategory = (category: CategoryItem) => {
    setOrderedCategories([...orderedCategories, category])
    setHasChanges(true)
  }

  const handleSave = () => {
    const categoryIds = orderedCategories.map((c) => c.kategoriid)
    updateCategoryOrder.mutate(categoryIds, {
      onSuccess: () => setHasChanges(false)
    })
  }

  if (isLoadingOrder || isLoadingKategorier) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Webshop Kategori-rekkefølge
        </CardTitle>
        <CardDescription>
          Prioriterte kategorier vises før andre i webshoppen (etter kundens
          mest bestilte produkter). Kategorier som ikke er i listen vises
          alfabetisk til slutt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ordered categories */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Prioriterte kategorier:</p>
          {orderedCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
              Ingen kategorier er prioritert. Legg til kategorier nedenfor.
            </p>
          ) : (
            <div className="space-y-1">
              {orderedCategories.map((category, index) => (
                <div
                  key={category.kategoriid}
                  className="flex items-center gap-2 p-2 bg-accent/50 rounded-md"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium w-6 text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="flex-1">{category.kategori}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveDown(index)}
                      disabled={index === orderedCategories.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeCategory(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available categories to add */}
        {availableCategories.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Tilgjengelige kategorier:</p>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((category) => (
                <Button
                  key={category.kategoriid}
                  variant="outline"
                  size="sm"
                  onClick={() => addCategory({
                    kategoriid: category.kategoriid,
                    kategori: category.kategori
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {category.kategori}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateCategoryOrder.isPending}
          >
            {updateCategoryOrder.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lagre rekkefølge
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
