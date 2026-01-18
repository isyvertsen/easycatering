"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Package, ChefHat, Search } from "lucide-react"

interface Product {
  produktid: number
  produktnavn: string
  enhet?: string
}

interface Recipe {
  kalkylekode: number
  kalkylenavn: string
}

interface ProductSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (item: { produktid?: number; kalkyleid?: number; navn: string }) => void
  excludeIds?: number[]
}

export function ProductSelector({ open, onClose, onSelect, excludeIds = [] }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("products")

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-selector', search],
    queryFn: async () => {
      const response = await apiClient.get('/v1/produkter/', {
        params: { search, limit: 50 }
      })
      return response.data.items || response.data
    },
    enabled: open && activeTab === "products",
  })

  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes-for-selector', search],
    queryFn: async () => {
      const response = await apiClient.get('/v1/oppskrifter/', {
        params: { search, limit: 50 }
      })
      return response.data.items || response.data
    },
    enabled: open && activeTab === "recipes",
  })

  const handleSelect = (item: { produktid?: number; kalkyleid?: number; navn: string }) => {
    onSelect(item)
    setSearch("")
  }

  const filteredProducts = (products || []).filter(
    (p: Product) => !excludeIds.includes(p.produktid)
  )

  return (
    <Dialog open={open} onOpenChange={onClose} modal={false}>
      <DialogContent className="max-w-2xl" onPointerDownOutside={onClose}>
        <DialogHeader>
          <DialogTitle>Velg produkt eller oppskrift</DialogTitle>
          <DialogDescription>
            Søk og velg produkter eller oppskrifter å legge til i templaten
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Søk etter navn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produkter
              </TabsTrigger>
              <TabsTrigger value="recipes" className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Oppskrifter
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <ScrollArea className="h-[300px] border rounded-md">
                {productsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Ingen produkter funnet
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredProducts.map((product: Product) => (
                      <Button
                        key={product.produktid}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleSelect({
                          produktid: product.produktid,
                          navn: product.produktnavn
                        })}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        <span className="truncate">{product.produktnavn}</span>
                        {product.enhet && (
                          <span className="ml-auto text-muted-foreground text-sm">
                            {product.enhet}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recipes">
              <ScrollArea className="h-[300px] border rounded-md">
                {recipesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (recipes || []).length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Ingen oppskrifter funnet
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {(recipes || []).map((recipe: Recipe) => (
                      <Button
                        key={recipe.kalkylekode}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleSelect({
                          kalkyleid: recipe.kalkylekode,
                          navn: recipe.kalkylenavn
                        })}
                      >
                        <ChefHat className="mr-2 h-4 w-4" />
                        <span className="truncate">{recipe.kalkylenavn}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
