"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Check, X, Search, Database, AlertTriangle, Zap } from "lucide-react"
import { NutritionInfo } from "./nutrition-info"
import { AllergenList } from "./allergen-badge"
import { formatGtin } from "@/lib/utils/gtin"
import { MatinfoAllergenInfo, MatinfoNutrientInfo } from "@/lib/api/produkter"

export interface PreviewProduct {
  produktid: number
  produktnavn: string
  ean_kode: string | null
}

export interface SearchResult {
  gtin: string
  name: string
  brandname: string | null
  producername: string | null
  packagesize: string | null
  similarity: number
  matched_variation: string
  ingredients?: string | null
  allergens?: MatinfoAllergenInfo[]
  nutrients?: MatinfoNutrientInfo[]
}

export type SearchPhase = "idle" | "searching-matinfo" | "searching-vetduat" | "found" | "not-found" | "error"
export type SearchSource = "matinfo" | "vetduat" | null

interface AutoSyncPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: PreviewProduct | null
  searchPhase: SearchPhase
  searchSource: SearchSource
  searchResult: SearchResult | null
  hasNutrients: boolean
  errorMessage?: string
  onApprove: () => void
  onReject: () => void
  onCreateManual: () => void
  isSaving: boolean
}

export function AutoSyncPreviewDialog({
  open,
  onOpenChange,
  product,
  searchPhase,
  searchSource,
  searchResult,
  hasNutrients,
  errorMessage,
  onApprove,
  onReject,
  onCreateManual,
  isSaving,
}: AutoSyncPreviewDialogProps) {
  const isSearching = searchPhase === "searching-matinfo" || searchPhase === "searching-vetduat"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Auto-sok forhåndsvisning
          </DialogTitle>
          <DialogDescription>
            Sok etter næringsdata for: <strong>{product?.produktnavn}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Progress */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Søkestatus</h4>
            <div className="flex items-center gap-4">
              {/* Matinfo status */}
              <div className="flex items-center gap-2">
                {searchPhase === "searching-matinfo" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : searchSource === "matinfo" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : searchPhase === "searching-vetduat" || searchPhase === "found" || searchPhase === "not-found" ? (
                  <X className="h-4 w-4 text-gray-400" />
                ) : (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
                <span className={searchPhase === "searching-matinfo" ? "font-medium" : "text-muted-foreground"}>
                  Matinfo
                </span>
              </div>

              <span className="text-muted-foreground">→</span>

              {/* VetDuAt status */}
              <div className="flex items-center gap-2">
                {searchPhase === "searching-vetduat" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : searchSource === "vetduat" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : searchPhase === "found" && searchSource === "matinfo" ? (
                  <span className="text-muted-foreground text-xs">Ikke nodvendig</span>
                ) : searchPhase === "not-found" ? (
                  <X className="h-4 w-4 text-red-500" />
                ) : (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
                <span className={searchPhase === "searching-vetduat" ? "font-medium" : "text-muted-foreground"}>
                  VetDuAt
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Search Result */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-muted-foreground">
                Soker i {searchPhase === "searching-matinfo" ? "Matinfo" : "VetDuAt"}...
              </p>
            </div>
          )}

          {searchPhase === "not-found" && (
            <div className="flex flex-col items-center justify-center py-8">
              <X className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ikke funnet</h3>
              <p className="text-muted-foreground text-center">
                Produktet ble ikke funnet i Matinfo eller VetDuAt.
              </p>
              <Button variant="outline" className="mt-4" onClick={onCreateManual}>
                Opprett manuelt
              </Button>
            </div>
          )}

          {searchPhase === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Feil oppstod</h3>
              <p className="text-muted-foreground text-center">
                {errorMessage || "En feil oppstod under soket"}
              </p>
            </div>
          )}

          {searchPhase === "found" && searchResult && (
            <div className="space-y-4">
              {/* Source Badge */}
              <div className="flex items-center gap-2">
                <Badge variant={searchSource === "matinfo" ? "default" : "secondary"}>
                  <Database className="h-3 w-3 mr-1" />
                  Funnet i {searchSource === "matinfo" ? "Matinfo" : "VetDuAt"}
                </Badge>
                <Badge variant="outline">
                  {(searchResult.similarity * 100).toFixed(0)}% match
                </Badge>
                {!hasNutrients && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Ingen næringsdata
                  </Badge>
                )}
              </div>

              {/* Product Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-lg">{searchResult.name}</h4>
                  {searchResult.brandname && (
                    <p className="text-sm text-muted-foreground">Merke: {searchResult.brandname}</p>
                  )}
                  {searchResult.producername && (
                    <p className="text-sm text-muted-foreground">Produsent: {searchResult.producername}</p>
                  )}
                  {searchResult.packagesize && (
                    <p className="text-sm text-muted-foreground">Pakkestørrelse: {searchResult.packagesize}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">GTIN:</span>
                  <code className="font-mono text-sm bg-background px-2 py-1 rounded">
                    {formatGtin(searchResult.gtin)}
                  </code>
                </div>

                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Matchet med:</span> "{searchResult.matched_variation}"
                </div>
              </div>

              {/* Allergens */}
              {searchResult.allergens && searchResult.allergens.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Allergener</h4>
                  <AllergenList allergens={searchResult.allergens} maxDisplay={10} />
                </div>
              )}

              {/* Nutrients */}
              {searchResult.nutrients && searchResult.nutrients.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Næringsinnhold per 100g</h4>
                  <NutritionInfo nutrients={searchResult.nutrients} compact />
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Ingen næringsdata tilgjengelig</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Produktet vil bli lagret uten næringsinnhold.
                  </p>
                </div>
              )}

              {/* Ingredients */}
              {searchResult.ingredients && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Ingredienser</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    {searchResult.ingredients}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {searchPhase === "found" && (
            <>
              <Button variant="outline" onClick={onReject} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Avbryt
              </Button>
              <Button onClick={onApprove} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Godkjenn og lagre
              </Button>
            </>
          )}
          {(searchPhase === "not-found" || searchPhase === "error") && (
            <Button variant="outline" onClick={onReject}>
              Lukk
            </Button>
          )}
          {isSearching && (
            <Button variant="outline" onClick={onReject}>
              Avbryt sok
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
