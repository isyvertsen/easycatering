"use client"

import { useState } from 'react'
import { ProductSearch } from '@/components/products/product-search'
import { ProductSearchResult } from '@/lib/api/product-search'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, FileText, Search } from 'lucide-react'
import Link from 'next/link'
import { productSearchApi } from '@/lib/api/product-search'
import { toast } from 'sonner'

export default function ProductSearchPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleProductSelect = (product: ProductSearchResult) => {
    setSelectedProduct(product)
  }

  const handleExportForRAG = async () => {
    setIsExporting(true)
    try {
      const result = await productSearchApi.exportForRAG()
      if (result.success) {
        toast.success('Eksport fullført', {
          description: `${result.total_products} produkter eksportert til ${result.files_created} filer`
        })
      } else {
        toast.error('Eksport feilet', {
          description: result.message
        })
      }
    } catch (error) {
      toast.error('Eksport feilet', {
        description: 'Kunne ikke eksportere produkter'
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produktsøk</h1>
          <p className="text-muted-foreground">
            Søk i produktdatabasen med standard søk eller AI-drevet søk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportForRAG}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Eksporterer...' : 'Eksporter for RAG'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbake til produktliste
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <ProductSearch onProductSelect={handleProductSelect} />
        </div>

        <div>
          {selectedProduct ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedProduct.name}</CardTitle>
                <CardDescription>
                  GTIN: {selectedProduct.gtin} • {selectedProduct.producer}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProduct.brand && (
                  <div>
                    <h3 className="font-medium">Merke</h3>
                    <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
                  </div>
                )}

                {selectedProduct.ingredients && (
                  <div>
                    <h3 className="font-medium">Ingredienser</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.ingredients.replace(/<[^>]*>/g, '')}
                    </p>
                  </div>
                )}

                {selectedProduct.allergens && selectedProduct.allergens.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Allergener</h3>
                    <div className="space-y-1">
                      {selectedProduct.allergens.map((allergen) => (
                        <div key={allergen.code} className="flex items-center justify-between">
                          <span className="text-sm">{allergen.name}</span>
                          <Badge
                            variant={
                              allergen.level === 1 ? 'destructive' :
                              allergen.level === 2 ? 'secondary' :
                              'outline'
                            }
                          >
                            {allergen.level === 1 ? 'Inneholder' :
                             allergen.level === 2 ? 'Kan inneholde' :
                             'Fri for'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProduct.nutrients && selectedProduct.nutrients.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Næringsinnhold</h3>
                    <div className="space-y-1">
                      {selectedProduct.nutrients.map((nutrient) => (
                        <div key={nutrient.code} className="flex items-center justify-between text-sm">
                          <span>{nutrient.name}</span>
                          <span className="font-medium">
                            {nutrient.measurement} {nutrient.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProduct.linked_product && (
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Koblet produkt i system
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Navn:</span>{' '}
                        {selectedProduct.linked_product.produktnavn}
                      </p>
                      <p>
                        <span className="font-medium">Pris:</span>{' '}
                        kr {selectedProduct.linked_product.pris?.toFixed(2) || '0.00'}
                      </p>
                      <p>
                        <span className="font-medium">Lagerbeholdning:</span>{' '}
                        {selectedProduct.linked_product.lagermengde || 0}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        asChild
                      >
                        <Link href={`/products/${selectedProduct.linked_product.produktid}`}>
                          Se produkt
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex min-h-[400px] items-center justify-center text-center">
                <div className="space-y-2">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Velg et produkt fra søkeresultatene for å se detaljer
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}