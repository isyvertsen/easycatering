"use client"

import { useState, useEffect } from "react"
import DOMPurify from "dompurify"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, CheckCircle, Loader2, Package } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { MatinfoSearchResult } from "@/lib/api/produkter"
import { AllergenList } from "./allergen-badge"
import { NutritionSummary } from "./nutrition-info"
import { apiClient } from "@/lib/api-client"

interface Product {
  produktid: number
  produktnavn: string
  ean_kode: string | null
}

interface MatinfoSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
  onGtinUpdated: () => void
}

export function MatinfoSearchDialog({
  open,
  onOpenChange,
  product,
  onGtinUpdated,
}: MatinfoSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<MatinfoSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<MatinfoSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Hent automatiske forslag når dialogen åpnes
  useEffect(() => {
    if (open && product.produktid) {
      fetchSuggestions()
    }
  }, [open, product.produktid])

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const response = await apiClient.get(
        `/v1/produkter/${product.produktid}/matinfo-suggestions?limit=5`
      )
      setSuggestions(response.data)
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await apiClient.get(
        `/v1/produkter/matinfo/search?query=${encodeURIComponent(
          searchQuery
        )}&limit=10`
      )
      setResults(response.data)
    } catch (error) {
      toast({
        title: "Søkefeil",
        description: error instanceof Error ? error.message : "Kunne ikke søke i Matinfo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectGtin = async (gtin: string) => {
    setUpdating(true)
    try {
      const response = await apiClient.patch(
        `/v1/produkter/${product.produktid}/gtin`,
        { gtin }
      )

      toast({
        title: "GTIN oppdatert!",
        description: (
          <div className="space-y-1">
            <p>Ny GTIN: <code className="font-mono text-sm">{response.data.new_gtin}</code></p>
            {response.data.matinfo_match?.found && (
              <p className="text-green-600">✓ Matinfo-match funnet</p>
            )}
          </div>
        ),
        variant: "default",
      })

      onGtinUpdated()
    } catch (error) {
      toast({
        title: "Feil ved oppdatering",
        description: error instanceof Error ? error.message : "Kunne ikke oppdatere GTIN",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const getSimilarityColor = (score: number | null) => {
    if (!score) return "bg-gray-500"
    if (score >= 0.7) return "bg-green-500"
    if (score >= 0.4) return "bg-yellow-500"
    return "bg-orange-500"
  }

  const getSimilarityText = (score: number | null) => {
    if (!score) return "Ukjent"
    if (score >= 0.7) return "Høy match"
    if (score >= 0.4) return "Middels match"
    return "Lav match"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Søk GTIN i Matinfo
          </DialogTitle>
          <DialogDescription>
            Produkt: <span className="font-medium">{product.produktnavn}</span>
            {product.ean_kode && (
              <span className="ml-2 text-xs">
                (Nåværende GTIN: <code>{product.ean_kode}</code>)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="flex gap-2">
          <Input
            placeholder="Søk etter produktnavn, merke eller ingredienser..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Søk</span>
          </Button>
        </div>

        {/* Automatic suggestions */}
        {suggestions.length > 0 && results.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Forslag basert på produktnavn:</h3>
              {loadingSuggestions && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <div className="space-y-2">
              {suggestions.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onSelect={handleSelectGtin}
                  updating={updating}
                  getSimilarityColor={getSimilarityColor}
                  getSimilarityText={getSimilarityText}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Søkeresultater ({results.length}):</h3>
            <div className="space-y-2">
              {results.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onSelect={handleSelectGtin}
                  updating={updating}
                  getSimilarityColor={getSimilarityColor}
                  getSimilarityText={getSimilarityText}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadingSuggestions && results.length === 0 && suggestions.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Søk etter produkter i Matinfo-databasen</p>
            <p className="text-sm mt-2">Over 54,000 produkter tilgjengelig</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ResultCard({
  result,
  onSelect,
  updating,
  getSimilarityColor,
  getSimilarityText,
}: {
  result: MatinfoSearchResult
  onSelect: (gtin: string) => void
  updating: boolean
  getSimilarityColor: (score: number | null) => string
  getSimilarityText: (score: number | null) => string
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{result.name}</h4>
            {result.similarity_score !== null && (
              <Badge className={`${getSimilarityColor(result.similarity_score)} text-white text-xs`}>
                {getSimilarityText(result.similarity_score)} ({(result.similarity_score * 100).toFixed(0)}%)
              </Badge>
            )}
          </div>

          {result.brand && (
            <p className="text-sm text-muted-foreground">Merke: {result.brand}</p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <code className="bg-muted px-2 py-1 rounded">{result.gtin}</code>
          </div>

          {/* Nutrition Summary */}
          {result.nutrients && result.nutrients.length > 0 && (
            <div className="bg-muted/50 p-2 rounded">
              <NutritionSummary nutrients={result.nutrients} />
            </div>
          )}

          {/* Allergens */}
          {result.allergens && result.allergens.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Allergener:</p>
              <AllergenList allergens={result.allergens} maxDisplay={3} />
            </div>
          )}

          {result.ingredients && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Ingredienser
              </summary>
              <p
                className="mt-1 pl-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.ingredients.substring(0, 200) + (result.ingredients.length > 200 ? "..." : "")) }}
              />
            </details>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => onSelect(result.gtin)}
          disabled={updating}
          className="flex-shrink-0"
        >
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <span className="ml-2">Velg</span>
        </Button>
      </div>
    </div>
  )
}
