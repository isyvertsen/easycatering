"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { Loader2, Check, X, AlertCircle, Search, Wrench, Plus, Zap } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatGtin } from "@/lib/utils/gtin"
import { MatinfoCreateDialog } from "@/components/produkter/matinfo-create-dialog"
import {
  AutoSyncPreviewDialog,
  PreviewProduct,
  SearchResult,
  SearchPhase,
  SearchSource,
} from "@/components/produkter/auto-sync-preview-dialog"

interface ProductMissingEan {
  produktid: number
  produktnavn: string
  ean_kode: string | null
  kalkylenavn: string | null
  kalkylekode: number | null
}

interface ProductMatch {
  gtin: string
  name: string
  brandname: string | null
  producername: string | null
  packagesize: string | null
  similarity: number
  matched_variation: string
}

export default function EanManagementPage() {
  const [products, setProducts] = useState<ProductMissingEan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [fixing, setFixing] = useState(false)
  const [editingEan, setEditingEan] = useState<Record<number, string>>({})
  const [filter, setFilter] = useState<"all" | "missing" | "no-match">("all")
  const [matchDialog, setMatchDialog] = useState<{
    open: boolean
    product: ProductMissingEan | null
    matches: ProductMatch[]
    source?: 'matinfo' | 'vetduat'
  }>({ open: false, product: null, matches: [] })
  const [excludeNumbered, setExcludeNumbered] = useState(true)
  const [createDialog, setCreateDialog] = useState<{
    open: boolean
    prefillGtin?: string
    prefillName?: string
  }>({ open: false })

  // Preview dialog state for Auto-søk with approval
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean
    product: PreviewProduct | null
    searchPhase: SearchPhase
    searchSource: SearchSource
    searchResult: SearchResult | null
    hasNutrients: boolean
    errorMessage?: string
    isSaving: boolean
  }>({
    open: false,
    product: null,
    searchPhase: "idle",
    searchSource: null,
    searchResult: null,
    hasNutrients: false,
    isSaving: false,
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchProducts()
  }, [excludeNumbered])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get("/v1/ean-management/missing-ean", {
        params: { exclude_numbered: excludeNumbered }
      })
      setProducts(response.data)
    } catch (error) {
      console.error("Feil ved henting av produkter:", error)
      toast({
        title: "Feil",
        description: "Kunne ikke hente produkter med manglende EAN-kode",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEanChange = (produktid: number, value: string) => {
    setEditingEan((prev) => ({
      ...prev,
      [produktid]: value,
    }))
  }

  const handleSaveEan = async (produktid: number) => {
    const eanValue = editingEan[produktid]
    if (!eanValue || eanValue.trim() === "") {
      toast({
        title: "Feil",
        description: "EAN-kode kan ikke være tom",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(produktid)
      await apiClient.patch("/v1/ean-management/update-ean", {
        produktid,
        ean_kode: eanValue,
      })

      toast({
        title: "Suksess",
        description: "EAN-kode oppdatert",
      })

      // Remove the product from the list (it now has an EAN code)
      setProducts((prev) => prev.filter(p => p.produktid !== produktid))

      // Clear the editing state
      setEditingEan((prev) => {
        const newState = { ...prev }
        delete newState[produktid]
        return newState
      })
    } catch (error: any) {
      console.error("Feil ved oppdatering av EAN:", error)
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke oppdatere EAN-kode",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
  }

  const handleCancelEdit = (produktid: number) => {
    setEditingEan((prev) => {
      const newState = { ...prev }
      delete newState[produktid]
      return newState
    })
  }

  const handleSyncMatinfo = async (product: ProductMissingEan) => {
    try {
      setSyncing(product.produktid)

      // Try GTIN first if available
      if (product.ean_kode && product.ean_kode.trim()) {
        try {
          await apiClient.post(`/v1/matinfo/sync/product/${product.ean_kode.trim()}`)
          toast({
            title: "Suksess",
            description: `Produktet er hentet fra Matinfo og lagret i databasen`,
          })
          // Remove product from list (it now has nutrition data)
          setProducts((prev) => prev.filter(p => p.produktid !== product.produktid))
          return
        } catch {
          // If GTIN search fails, fall through to name search
        }
      }

      // Try name search with AI-powered variations
      const searchResponse = await apiClient.post(`/v1/matinfo/search/name?name=${encodeURIComponent(product.produktnavn)}&limit=10`)

      if (!searchResponse.data.success || searchResponse.data.total_matches === 0) {
        toast({
          title: "Ikke funnet",
          description: "Produktet ble ikke funnet i Matinfo-databasen",
          variant: "destructive",
        })
        return
      }

      const matches: ProductMatch[] = searchResponse.data.matches

      // Check if we have a clear winner (high similarity and significantly better than others)
      const topMatch = matches[0]
      const hasClearWinner = matches.length === 1 ||
        (topMatch.similarity >= 0.9 && (matches.length === 1 || matches[1].similarity < topMatch.similarity - 0.2))

      if (hasClearWinner) {
        // Auto-select the top match and sync
        await syncProductWithGtin(product, topMatch.gtin)
      } else {
        // Show dialog to let user choose
        setMatchDialog({
          open: true,
          product,
          matches,
          source: 'matinfo'
        })
      }

    } catch (error: any) {
      console.error("Feil ved synkronisering med Matinfo:", error)
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke synkronisere med Matinfo",
        variant: "destructive",
      })
    } finally {
      setSyncing(null)
    }
  }

  const syncProductWithGtin = async (product: ProductMissingEan, gtin: string) => {
    try {
      setSyncing(product.produktid)

      // Sync the product from Matinfo
      await apiClient.post(`/v1/matinfo/sync/product/${gtin}`)

      toast({
        title: "Suksess",
        description: `Produktet er hentet fra Matinfo og lagret i databasen`,
      })

      // Remove product from list (it now has nutrition data)
      setProducts((prev) => prev.filter(p => p.produktid !== product.produktid))

    } catch (error: any) {
      console.error("Feil ved synkronisering:", error)
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke synkronisere produkt",
        variant: "destructive",
      })
    } finally {
      setSyncing(null)
      setMatchDialog({ open: false, product: null, matches: [] })
    }
  }

  const handleSyncVetDuAt = async (product: ProductMissingEan) => {
    try {
      setSyncing(product.produktid)

      // Try name search with AI-powered variations
      const searchResponse = await apiClient.post(`/v1/vetduat/search/name-with-variations?name=${encodeURIComponent(product.produktnavn)}&limit=5`)

      if (!searchResponse.data.success || searchResponse.data.total_matches === 0) {
        toast({
          title: "Ikke funnet",
          description: "Produktet ble ikke funnet i VetDuAt-databasen",
          variant: "destructive",
        })
        return
      }

      const matches: ProductMatch[] = searchResponse.data.matches

      // Check if we have a clear winner (high similarity and significantly better than others)
      const topMatch = matches[0]
      const hasClearWinner = matches.length === 1 ||
        (topMatch.similarity >= 0.9 && (matches.length === 1 || matches[1].similarity < topMatch.similarity - 0.2))

      if (hasClearWinner) {
        // Auto-select the top match and sync
        await syncProductWithVetDuAt(product, topMatch.gtin)
      } else {
        // Show dialog to let user choose
        setMatchDialog({
          open: true,
          product,
          matches,
          source: 'vetduat'
        })
      }

    } catch (error: any) {
      console.error("Feil ved synkronisering med VetDuAt:", error)

      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke synkronisere med VetDuAt",
        variant: "destructive",
        })
    } finally {
      setSyncing(null)
    }
  }

  const syncProductWithVetDuAt = async (product: ProductMissingEan, gtin: string) => {
    try {
      setSyncing(product.produktid)

      // Sync the product from VetDuAt
      const response = await apiClient.post("/v1/vetduat/sync/product", {
        gtin: gtin,
        name: product.produktnavn,
        produkt_id: product.produktid,
      })

      if (response.data.success) {
        toast({
          title: "Suksess",
          description: `Produktet er hentet fra VetDuAt og lagret i databasen`,
        })

        // Remove product from list (it now has nutrition data)
        setProducts((prev) => prev.filter(p => p.produktid !== product.produktid))
      } else {
        toast({
          title: "Feil",
          description: "Kunne ikke synkronisere produkt fra VetDuAt",
          variant: "destructive",
        })
      }

    } catch (error: any) {
      console.error("Feil ved synkronisering:", error)
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke synkronisere produkt",
        variant: "destructive",
      })
    } finally {
      setSyncing(null)
      setMatchDialog({ open: false, product: null, matches: [] })
    }
  }

  // New handleHybridSync with preview dialog
  const handleHybridSync = async (product: ProductMissingEan) => {
    // Open preview dialog and start searching
    setPreviewDialog({
      open: true,
      product: {
        produktid: product.produktid,
        produktnavn: product.produktnavn,
        ean_kode: product.ean_kode,
      },
      searchPhase: "searching-matinfo",
      searchSource: null,
      searchResult: null,
      hasNutrients: false,
      isSaving: false,
    })

    try {
      // Step 1: Search Matinfo first
      let foundInMatinfo = false
      let matinfoResult: SearchResult | null = null
      let matinfoNutrients: any[] = []
      let matinfoAllergens: any[] = []

      // Try GTIN search in Matinfo if available
      if (product.ean_kode && product.ean_kode.trim()) {
        try {
          const gtinResponse = await apiClient.get(`/v1/matinfo/products/${product.ean_kode.trim()}`)
          if (gtinResponse.data) {
            const data = gtinResponse.data
            matinfoResult = {
              gtin: data.gtin,
              name: data.name,
              brandname: data.brand || null,
              producername: data.producer || null,
              packagesize: data.package_size || null,
              similarity: 1.0,
              matched_variation: "GTIN-match",
              ingredients: data.ingredients || null,
              allergens: data.allergens || [],
              nutrients: data.nutrients || [],
            }
            matinfoNutrients = data.nutrients || []
            matinfoAllergens = data.allergens || []
            foundInMatinfo = true
          }
        } catch {
          // GTIN search failed, will try name search
        }
      }

      // Try name search in Matinfo if GTIN didn't work
      if (!foundInMatinfo) {
        try {
          const nameResponse = await apiClient.post(
            `/v1/matinfo/search/name?name=${encodeURIComponent(product.produktnavn)}&limit=1`
          )
          if (nameResponse.data.success && nameResponse.data.total_matches > 0) {
            const match = nameResponse.data.matches[0]
            // Get full product details including nutrients
            const detailResponse = await apiClient.get(`/v1/matinfo/products/${match.gtin}`)
            if (detailResponse.data) {
              const data = detailResponse.data
              matinfoResult = {
                gtin: match.gtin,
                name: match.name,
                brandname: match.brandname || null,
                producername: match.producername || null,
                packagesize: match.packagesize || null,
                similarity: match.similarity,
                matched_variation: match.matched_variation,
                ingredients: data.ingredients || null,
                allergens: data.allergens || [],
                nutrients: data.nutrients || [],
              }
              matinfoNutrients = data.nutrients || []
              matinfoAllergens = data.allergens || []
              foundInMatinfo = true
            }
          }
        } catch {
          // Name search failed in Matinfo
        }
      }

      // If found in Matinfo, show result
      if (foundInMatinfo && matinfoResult) {
        setPreviewDialog(prev => ({
          ...prev,
          searchPhase: "found",
          searchSource: "matinfo",
          searchResult: matinfoResult,
          hasNutrients: matinfoNutrients.length > 0,
        }))
        return
      }

      // Step 2: Search VetDuAt
      setPreviewDialog(prev => ({
        ...prev,
        searchPhase: "searching-vetduat",
      }))

      try {
        const vetduatResponse = await apiClient.post(
          `/v1/vetduat/search/name-with-variations?name=${encodeURIComponent(product.produktnavn)}&limit=1`
        )

        if (vetduatResponse.data.success && vetduatResponse.data.total_matches > 0) {
          const match = vetduatResponse.data.matches[0]
          const vetduatResult: SearchResult = {
            gtin: match.gtin,
            name: match.name,
            brandname: match.brandname || null,
            producername: match.producername || null,
            packagesize: match.packagesize || null,
            similarity: match.similarity,
            matched_variation: match.matched_variation,
            ingredients: null,
            allergens: [],
            nutrients: [],
          }

          setPreviewDialog(prev => ({
            ...prev,
            searchPhase: "found",
            searchSource: "vetduat",
            searchResult: vetduatResult,
            hasNutrients: false, // VetDuAt typically doesn't have nutrients
          }))
          return
        }
      } catch {
        // VetDuAt search failed
      }

      // Not found anywhere
      setPreviewDialog(prev => ({
        ...prev,
        searchPhase: "not-found",
      }))

    } catch (error: any) {
      console.error("Feil ved hybrid søk:", error)
      setPreviewDialog(prev => ({
        ...prev,
        searchPhase: "error",
        errorMessage: error.response?.data?.detail || "Kunne ikke søke etter produkt",
      }))
    }
  }

  // Handle approval - actually save the data
  const handleApproveSync = async () => {
    if (!previewDialog.product || !previewDialog.searchResult) return

    setPreviewDialog(prev => ({ ...prev, isSaving: true }))

    try {
      if (previewDialog.searchSource === "matinfo") {
        // Sync from Matinfo
        await apiClient.post(`/v1/matinfo/sync/product/${previewDialog.searchResult.gtin}`)
      } else if (previewDialog.searchSource === "vetduat") {
        // Sync from VetDuAt
        await apiClient.post("/v1/vetduat/sync/product", {
          gtin: previewDialog.searchResult.gtin,
          name: previewDialog.product.produktnavn,
          produkt_id: previewDialog.product.produktid,
        })
      }

      const sourceName = previewDialog.searchSource === "matinfo" ? "Matinfo" : "VetDuAt"
      toast({
        title: "Lagret!",
        description: `Produktet er hentet fra ${sourceName} og lagret i databasen`,
      })

      // Remove product from list
      setProducts(prev => prev.filter(p => p.produktid !== previewDialog.product?.produktid))

      // Close dialog
      setPreviewDialog(prev => ({
        ...prev,
        open: false,
        isSaving: false,
      }))

    } catch (error: any) {
      console.error("Feil ved lagring:", error)
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke lagre produktet",
        variant: "destructive",
      })
      setPreviewDialog(prev => ({ ...prev, isSaving: false }))
    }
  }

  // Handle rejection - close without saving
  const handleRejectSync = () => {
    setPreviewDialog({
      open: false,
      product: null,
      searchPhase: "idle",
      searchSource: null,
      searchResult: null,
      hasNutrients: false,
      isSaving: false,
    })
  }

  // Handle manual creation from preview dialog
  const handleCreateManualFromPreview = () => {
    if (previewDialog.product) {
      setCreateDialog({
        open: true,
        prefillGtin: previewDialog.product.ean_kode || undefined,
        prefillName: previewDialog.product.produktnavn,
      })
    }
    handleRejectSync()
  }

  const handleOpenCreateDialog = (product?: ProductMissingEan) => {
    setCreateDialog({
      open: true,
      prefillGtin: product?.ean_kode || undefined,
      prefillName: product?.produktnavn || undefined,
    })
  }

  const handleFixNegativeEan = async () => {
    try {
      setFixing(true)

      const response = await apiClient.post("/v1/ean-management/fix-negative-ean")

      toast({
        title: "Suksess",
        description: `Fjernet '-' fra ${response.data.updated_count} EAN-koder`,
      })

      // Refresh the list to show updated EAN codes
      await fetchProducts()

    } catch (error: any) {
      console.error("Feil ved reparasjon av EAN-koder:", error)

      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke reparere EAN-koder",
        variant: "destructive",
      })
    } finally {
      setFixing(false)
    }
  }

  const getEanInputValue = (product: ProductMissingEan) => {
    if (editingEan[product.produktid] !== undefined) {
      return editingEan[product.produktid]
    }
    return formatGtin(product.ean_kode) || ""
  }

  // Filter products based on selected filter
  const filteredProducts = products.filter((product) => {
    if (filter === "all") return true
    if (filter === "missing") return !product.ean_kode || product.ean_kode.trim() === ""
    if (filter === "no-match") return product.ean_kode && product.ean_kode.trim() !== ""
    return true
  })

  // Calculate counts for each category
  const counts = {
    all: products.length,
    missing: products.filter(p => !p.ean_kode || p.ean_kode.trim() === "").length,
    noMatch: products.filter(p => p.ean_kode && p.ean_kode.trim() !== "").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">EAN-kodestyring</h1>
        <p className="text-muted-foreground">
          Administrer manglende EAN-koder for produkter brukt i oppskrifter
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              Alle ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="missing" className="gap-2">
              <X className="h-3 w-3 text-red-500" />
              Mangler EAN ({counts.missing})
            </TabsTrigger>
            <TabsTrigger value="no-match" className="gap-2">
              <AlertCircle className="h-3 w-3 text-orange-500" />
              Har EAN, ikke match i Matinfo ({counts.noMatch})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Exclude numbered products checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exclude-numbered"
            checked={excludeNumbered}
            onCheckedChange={(checked) => setExcludeNumbered(checked as boolean)}
          />
          <Label
            htmlFor="exclude-numbered"
            className="text-sm font-normal cursor-pointer"
          >
            Skjul produkter i kategori 12 (nummermønstre som 01-, 02-, 0x-)
          </Label>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Check className="h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Alle produkter har EAN-koder!</h2>
          <p className="text-muted-foreground">
            Det er ingen produkter som mangler EAN-kode for øyeblikket.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt-ID</TableHead>
                <TableHead>Produktnavn</TableHead>
                <TableHead>Brukt i oppskrift</TableHead>
                <TableHead>EAN-kode</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={`${product.produktid}-${product.kalkylekode || 'none'}`}>
                  <TableCell className="font-medium">
                    {product.produktid}
                  </TableCell>
                  <TableCell>{product.produktnavn}</TableCell>
                  <TableCell>
                    {product.kalkylenavn ? (
                      <Badge variant="outline">{product.kalkylenavn}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="Legg til EAN-kode"
                      value={getEanInputValue(product)}
                      onChange={(e) => handleEanChange(product.produktid, e.target.value)}
                      className="max-w-xs"
                      disabled={saving === product.produktid}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {editingEan[product.produktid] !== undefined && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelEdit(product.produktid)}
                            disabled={saving === product.produktid}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEan(product.produktid)}
                            disabled={saving === product.produktid}
                          >
                            {saving === product.produktid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                      {editingEan[product.produktid] === undefined && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleHybridSync(product)}
                            disabled={syncing === product.produktid}
                            title="Søk i Matinfo først, deretter VetDuAt"
                          >
                            {syncing === product.produktid ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Zap className="h-4 w-4 mr-2" />
                            )}
                            Auto-søk
                          </Button>
                          {product.ean_kode && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncMatinfo(product)}
                              disabled={syncing === product.produktid}
                            >
                              {syncing === product.produktid ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Search className="h-4 w-4 mr-2" />
                              )}
                              Matinfo
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncVetDuAt(product)}
                            disabled={syncing === product.produktid}
                          >
                            {syncing === product.produktid ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Search className="h-4 w-4 mr-2" />
                            )}
                            VetDuAt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreateDialog(product)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Manuelt
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEanChange(product.produktid, product.ean_kode || "")}
                          >
                            Rediger EAN
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between items-center pt-4">
        <p className="text-sm text-muted-foreground">
          Totalt {products.length} produkter mangler EAN-kode
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleFixNegativeEan}
            variant="outline"
            disabled={fixing}
          >
            {fixing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wrench className="h-4 w-4 mr-2" />
            )}
            Fjern '-' fra EAN-koder
          </Button>
          <Button onClick={fetchProducts} variant="outline">
            Oppdater liste
          </Button>
        </div>
      </div>

      {/* Product Match Selection Dialog */}
      <Dialog open={matchDialog.open} onOpenChange={(open) => setMatchDialog({ ...matchDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Velg riktig produkt</DialogTitle>
            <DialogDescription>
              Flere produkter ble funnet for "{matchDialog.product?.produktnavn}". Velg det som passer best:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {matchDialog.matches.map((match, index) => (
              <div
                key={match.gtin}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  if (matchDialog.product) {
                    if (matchDialog.source === 'vetduat') {
                      syncProductWithVetDuAt(matchDialog.product, match.gtin)
                    } else {
                      syncProductWithGtin(matchDialog.product, match.gtin)
                    }
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{match.name}</h4>
                      {index === 0 && (
                        <Badge variant="default">Beste match</Badge>
                      )}
                      <Badge variant="outline">
                        {(match.similarity * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1 mt-2">
                      {match.brandname && (
                        <div><span className="font-medium">Merke:</span> {match.brandname}</div>
                      )}
                      {match.producername && (
                        <div><span className="font-medium">Produsent:</span> {match.producername}</div>
                      )}
                      {match.packagesize && (
                        <div><span className="font-medium">Pakkestørrelse:</span> {match.packagesize}</div>
                      )}
                      <div><span className="font-medium">GTIN:</span> <code className="font-mono">{formatGtin(match.gtin)}</code></div>
                      <div className="text-xs"><span className="font-medium">Matchet med:</span> {match.matched_variation}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMatchDialog({ open: false, product: null, matches: [] })}
            >
              Avbryt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Product Creation Dialog */}
      <MatinfoCreateDialog
        open={createDialog.open}
        onOpenChange={(open) => setCreateDialog({ ...createDialog, open })}
        prefillGtin={createDialog.prefillGtin}
        prefillName={createDialog.prefillName}
        onSuccess={(productId, gtin) => {
          toast({
            title: "Produkt opprettet!",
            description: `Produktet med GTIN ${gtin} er nå lagret i databasen`,
          })
          fetchProducts()
        }}
      />

      {/* Auto-Sync Preview Dialog with Approval */}
      <AutoSyncPreviewDialog
        open={previewDialog.open}
        onOpenChange={(open) => {
          if (!open) handleRejectSync()
        }}
        product={previewDialog.product}
        searchPhase={previewDialog.searchPhase}
        searchSource={previewDialog.searchSource}
        searchResult={previewDialog.searchResult}
        hasNutrients={previewDialog.hasNutrients}
        errorMessage={previewDialog.errorMessage}
        onApprove={handleApproveSync}
        onReject={handleRejectSync}
        onCreateManual={handleCreateManualFromPreview}
        isSaving={previewDialog.isSaving}
      />
    </div>
  )
}
