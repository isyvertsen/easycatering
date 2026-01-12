"use client"

import { useState, useCallback, useEffect } from 'react'
import { Search, Sparkles, Database, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { productSearchApi, ProductSearchResult } from '@/lib/api/product-search'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ProductSearchProps {
  onProductSelect?: (product: ProductSearchResult) => void
  showLinkedProducts?: boolean
}

export function ProductSearch({ onProductSelect, showLinkedProducts = true }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [useLLM, setUseLLM] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [searchSource, setSearchSource] = useState<'database' | 'llm' | 'hybrid'>('database')
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      if (useLLM) {
        // Use hybrid search when LLM is enabled
        const response = await productSearchApi.hybridSearch({
          query: debouncedQuery,
          use_llm: true,
          limit: 20
        })
        
        if (response.success) {
          setResults(response.items)
          setSearchSource(response.source as any)
          
          if (response.llm_response) {
            toast.info('LLM Response', {
              description: response.llm_response.substring(0, 150) + '...'
            })
          }
        } else {
          setError(response.error || 'Search failed')
        }
      } else {
        // Regular database search
        const response = await productSearchApi.search(
          debouncedQuery,
          'database',
          20,
          0,
          true
        )
        
        if (response.success) {
          setResults(response.items)
          setSearchSource('database')
        } else {
          setError(response.error || 'Search failed')
        }
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to perform search')
      toast.error('Søk feilet', {
        description: 'Kunne ikke utføre søket. Prøv igjen.'
      })
    } finally {
      setIsSearching(false)
    }
  }, [debouncedQuery, useLLM])

  useEffect(() => {
    performSearch()
  }, [performSearch])

  const handleProductClick = (product: ProductSearchResult) => {
    if (onProductSelect) {
      onProductSelect(product)
    }
  }

  const getSourceIcon = () => {
    switch (searchSource) {
      case 'llm':
        return <Sparkles className="h-4 w-4" />
      case 'hybrid':
        return (
          <>
            <Database className="h-4 w-4" />
            <Sparkles className="h-4 w-4" />
          </>
        )
      default:
        return <Database className="h-4 w-4" />
    }
  }

  const getSourceLabel = () => {
    switch (searchSource) {
      case 'llm':
        return 'AI-søk'
      case 'hybrid':
        return 'Hybrid søk'
      default:
        return 'Database søk'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Produktsøk</CardTitle>
          <CardDescription>
            Søk etter produkter i databasen eller bruk AI for smartere søk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="use-llm" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Bruk AI-søk
            </Label>
            <Switch
              id="use-llm"
              checked={useLLM}
              onCheckedChange={setUseLLM}
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={useLLM ? "Søk med naturlig språk, f.eks. 'veganske produkter med høyt proteininnhold'" : "Søk etter navn, GTIN, produsent eller ingredienser..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
            )}
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                {getSourceIcon()}
                {getSourceLabel()}
              </span>
              <span>•</span>
              <span>{results.length} resultater</span>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((product, index) => (
            <Card
              key={product.gtin || index}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => handleProductClick(product)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        GTIN: {product.gtin} • {product.producer}
                      </p>
                    </div>
                    {product.brand && (
                      <Badge variant="outline">{product.brand}</Badge>
                    )}
                  </div>

                  {product.ingredients && (
                    <p className="text-sm line-clamp-2">
                      <span className="font-medium">Ingredienser:</span>{' '}
                      {product.ingredients.replace(/<[^>]*>/g, '')}
                    </p>
                  )}

                  {showLinkedProducts && product.linked_product && (
                    <div className="flex items-center gap-4 rounded-md bg-muted p-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{product.linked_product.produktnavn}</p>
                        <p className="text-muted-foreground">
                          Pris: kr {product.linked_product.pris?.toFixed(2) || '0.00'} • 
                          Lager: {product.linked_product.lagermengde || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {product.allergens && product.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.allergens
                        .filter(a => a.level === 1) // Only show "CONTAINS"
                        .map((allergen) => (
                          <Badge key={allergen.code} variant="secondary" className="text-xs">
                            {allergen.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}