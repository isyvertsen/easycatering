"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { RecipeIngredient } from "@/types/models"
import { useRecipeIngredients } from "@/hooks/useRecipes"
import { useProducts } from "@/hooks/useProducts"
import { recipesApi } from "@/lib/api/recipes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Edit, CheckCircle, XCircle } from "lucide-react"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"

const ingredientSchema = z.object({
  produktid: z.coerce.number().min(1, "Produkt er påkrevd"),
  porsjonsmengde: z.coerce.number().optional().nullable(),
  enh: z.string().optional().nullable(),
  kostpris: z.string().optional().nullable(),
  svinnprosent: z.string().optional().nullable(),
})

type IngredientFormData = z.infer<typeof ingredientSchema>

interface RecipeIngredientsProps {
  recipeId: number
  nutritionData?: any
}

export function RecipeIngredients({ recipeId, nutritionData }: RecipeIngredientsProps) {
  const { data: ingredients, isLoading } = useRecipeIngredients(recipeId)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredient | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Extract unique produktid values from ingredients
  const produktIds = useMemo(() => {
    if (!ingredients) return []
    return [...new Set(ingredients.map(ing => ing.produktid))]
  }, [ingredients])

  // Fetch only the products used in this recipe
  const { data: products } = useQuery({
    queryKey: ['products-by-ids', produktIds],
    queryFn: async () => {
      if (produktIds.length === 0) return []
      const response = await apiClient.post<any[]>('/v1/produkter/by-ids', produktIds)
      return response.data
    },
    enabled: produktIds.length > 0,
    staleTime: 30000,
  })

  // Fetch products for the dropdown - only dish components (rett_komponent = true)
  const { data: allProducts } = useProducts({ skip: 0, limit: 1000, rett_komponent: true })

  // Helper function to check if ingredient has GTIN and nutrition data
  const hasGtinWithNutrition = (produktId: number): boolean => {
    if (!nutritionData?.ingredients_nutrition) return false

    // Find the ingredient in nutrition data
    const ingredientData = nutritionData.ingredients_nutrition.find(
      (ing: any) => ing.product_id === produktId
    )

    // Find the product to check if it has ean_kode
    const product = products?.find(p => p.produktid === produktId)

    // Only show green if:
    // 1. Product has ean_kode (GTIN)
    // 2. Nutrition data was found (meaning GTIN matched in matinfo and has data)
    // 3. Nutrition object is not empty
    return !!(product?.ean_kode &&
              ingredientData?.nutrition &&
              typeof ingredientData.nutrition === 'object' &&
              Object.keys(ingredientData.nutrition).length > 0)
  }

  // Helper to check if product has GTIN but no nutrition data
  const hasGtinButNoNutrition = (produktId: number): boolean => {
    if (!nutritionData?.ingredients_nutrition) return false

    const product = products?.find(p => p.produktid === produktId)
    const ingredientData = nutritionData.ingredients_nutrition.find(
      (ing: any) => ing.product_id === produktId
    )

    // Has GTIN but no nutrition data found or empty nutrition object
    return !!(product?.ean_kode &&
              (!ingredientData?.nutrition ||
               Object.keys(ingredientData.nutrition || {}).length === 0))
  }

  const form = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      produktid: 0,
      porsjonsmengde: null,
      enh: "",
      kostpris: "",
      svinnprosent: "",
    },
  })

  const handleAdd = async (data: IngredientFormData) => {
    try {
      await recipesApi.addIngredient(recipeId, data)
      queryClient.invalidateQueries({ queryKey: ['recipes', recipeId, 'ingredients'] })
      setIsAddOpen(false)
      form.reset()
      toast({
        title: "Ingrediens lagt til",
        description: "Ingrediensen ble lagt til oppskriften",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke legge til ingrediens",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async (data: IngredientFormData) => {
    if (!editingIngredient) return
    
    try {
      await recipesApi.updateIngredient(recipeId, editingIngredient.tblkalkyledetaljerid, data)
      queryClient.invalidateQueries({ queryKey: ['recipes', recipeId, 'ingredients'] })
      setEditingIngredient(null)
      form.reset()
      toast({
        title: "Ingrediens oppdatert",
        description: "Ingrediensen ble oppdatert",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere ingrediens",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (ingredientId: number) => {
    try {
      await recipesApi.deleteIngredient(recipeId, ingredientId)
      queryClient.invalidateQueries({ queryKey: ['recipes', recipeId, 'ingredients'] })
      toast({
        title: "Ingrediens slettet",
        description: "Ingrediensen ble fjernet fra oppskriften",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke slette ingrediens",
        variant: "destructive",
      })
    }
  }

  const calculateTotalNutrition = () => {
    if (!ingredients || ingredients.length === 0) return null

    const totals = ingredients.reduce((acc, ing) => {
      return {
        energikj: acc.energikj + (parseFloat(ing.energikj || "0") || 0),
        kalorier: acc.kalorier + (parseFloat(ing.kalorier || "0") || 0),
        fett: acc.fett + (parseFloat(ing.fett || "0") || 0),
        mettetfett: acc.mettetfett + (parseFloat(ing.mettetfett || "0") || 0),
        karbohydrater: acc.karbohydrater + (parseFloat(ing.karbohydrater || "0") || 0),
        sukkerarter: acc.sukkerarter + (parseFloat(ing.sukkerarter || "0") || 0),
        kostfiber: acc.kostfiber + (parseFloat(ing.kostfiber || "0") || 0),
        protein: acc.protein + (parseFloat(ing.protein || "0") || 0),
        salt: acc.salt + (parseFloat(ing.salt || "0") || 0),
      }
    }, {
      energikj: 0,
      kalorier: 0,
      fett: 0,
      mettetfett: 0,
      karbohydrater: 0,
      sukkerarter: 0,
      kostfiber: 0,
      protein: 0,
      salt: 0,
    })

    return totals
  }

  const totals = calculateTotalNutrition()

  if (isLoading) {
    return <div>Laster ingredienser...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ingredienser</CardTitle>
              <CardDescription>
                Administrer oppskriftens ingredienser og beregn næringsverdier
              </CardDescription>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Legg til ingrediens
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Legg til ingrediens</DialogTitle>
                  <DialogDescription>
                    Velg produkt og angi mengde
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="produktid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produkt</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Velg produkt" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allProducts?.map((product) => (
                                <SelectItem
                                  key={product.produktid}
                                  value={product.produktid.toString()}
                                >
                                  {product.produktnavn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="porsjonsmengde"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mengde</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enh"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Enhet</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''}
                                placeholder="f.eks. g, ml, stk"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="svinnprosent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Svinnprosent</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''}
                              placeholder="f.eks. 10%"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                        Avbryt
                      </Button>
                      <Button type="submit">Legg til</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[350px]">Produkt</TableHead>
                <TableHead className="w-[120px]">Produkt-ID</TableHead>
                <TableHead className="w-[180px]">EAN-kode</TableHead>
                <TableHead className="w-[120px]">Mengde</TableHead>
                <TableHead className="w-[120px]">Enhet</TableHead>
                <TableHead className="w-[100px]">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients?.map((ingredient) => {
                const hasGtin = hasGtinWithNutrition(ingredient.produktid)
                const hasGtinNoData = hasGtinButNoNutrition(ingredient.produktid)
                const product = products?.find(p => p.produktid === ingredient.produktid)

                return (
                  <TableRow key={ingredient.tblkalkyledetaljerid}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{ingredient.produktnavn}</span>
                        {nutritionData && (
                          hasGtin ? (
                            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3" />
                              GTIN OK
                            </Badge>
                          ) : product?.ean_kode ? (
                            <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                              <XCircle className="h-3 w-3" />
                              GTIN uten data
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200">
                              <XCircle className="h-3 w-3" />
                              Mangler GTIN
                            </Badge>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ingredient.produktid}</TableCell>
                    <TableCell>{product?.ean_kode || '-'}</TableCell>
                    <TableCell>{ingredient.porsjonsmengde || '-'}</TableCell>
                    <TableCell>{ingredient.enh || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingIngredient(ingredient)
                            form.reset({
                              produktid: ingredient.produktid,
                              porsjonsmengde: ingredient.porsjonsmengde,
                              enh: ingredient.enh || "",
                              kostpris: ingredient.kostpris || "",
                              svinnprosent: ingredient.svinnprosent || "",
                            })
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(ingredient.tblkalkyledetaljerid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!ingredients || ingredients.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Ingen ingredienser lagt til
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totals && (
        <Card>
          <CardHeader>
            <CardTitle>Næringsverdier totalt</CardTitle>
            <CardDescription>
              Beregnet basert på alle ingredienser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Energi</p>
                <p className="text-lg font-semibold">{totals.energikj.toFixed(0)} kJ</p>
                <p className="text-sm text-muted-foreground">{totals.kalorier.toFixed(0)} kcal</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fett</p>
                <p className="text-lg font-semibold">{totals.fett.toFixed(1)} g</p>
                <p className="text-sm text-muted-foreground">hvorav mettet: {totals.mettetfett.toFixed(1)} g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Karbohydrater</p>
                <p className="text-lg font-semibold">{totals.karbohydrater.toFixed(1)} g</p>
                <p className="text-sm text-muted-foreground">hvorav sukker: {totals.sukkerarter.toFixed(1)} g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kostfiber</p>
                <p className="text-lg font-semibold">{totals.kostfiber.toFixed(1)} g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Protein</p>
                <p className="text-lg font-semibold">{totals.protein.toFixed(1)} g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salt</p>
                <p className="text-lg font-semibold">{totals.salt.toFixed(1)} g</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingIngredient} onOpenChange={(open) => !open && setEditingIngredient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger ingrediens</DialogTitle>
            <DialogDescription>
              Oppdater mengde og enhet for ingrediensen
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="porsjonsmengde"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mengde</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enhet</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''}
                          placeholder="f.eks. g, ml, stk"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="svinnprosent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Svinnprosent</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''}
                        placeholder="f.eks. 10%"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setEditingIngredient(null)}>
                  Avbryt
                </Button>
                <Button type="submit">Oppdater</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}