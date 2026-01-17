'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Upload,
  FileText,
  Trash2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

interface VarebokProduct {
  varenummer: string
  nytt_varenummer: string | null
  varenavn: string
  ean_d_pakn: string | null
  ean_f_pakn: string | null
  kategori_navn: string | null
  hovedvaregruppe_navn: string | null
  mengde: number | null
  maleenhet: string | null
  pris: number | null
  leverandor_navn: string | null
}

interface MatchResult {
  varebok_product: VarebokProduct
  match_type: 'ean_exact' | 'varenr_exact' | 'name_fuzzy' | 'combined'
  confidence: number
  changes: Record<string, [string | null, string | null]>
}

interface RecipeProductWithMatches {
  produktid: number
  produktnavn: string | null
  ean_kode: string | null
  leverandorsproduktnr: string | null
  recipe_count: number
  matches: MatchResult[]
  best_match: MatchResult | null
  has_exact_match: boolean
}

interface VarebokStats {
  total_recipe_products: number
  matched_products: number
  partial_matches: number
  no_matches: number
  total_varebok_products: number
}

interface UploadedFileInfo {
  supplier_name: string
  products_count: number
}

type StatusFilter = 'all' | 'exact' | 'partial' | 'none'

export default function VarebokMatchingPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('products')
  const [selectedProduct, setSelectedProduct] = useState<RecipeProductWithMatches | null>(null)
  const [deleteSupplier, setDeleteSupplier] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 100

  // Match confirmation state
  const [pendingMatch, setPendingMatch] = useState<{
    produktid: number
    varebok_varenummer: string
    productName: string
    matchName: string
  } | null>(null)
  const skipConfirmationRef = useRef(false)
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false)

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<VarebokStats>({
    queryKey: ['varebok-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/varebok/status')
      return response.data
    },
  })

  // Fetch uploaded suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<UploadedFileInfo[]>({
    queryKey: ['varebok-suppliers'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/varebok/suppliers')
      return response.data
    },
  })

  // Fetch recipe products with matches
  const { data: allProducts = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<RecipeProductWithMatches[]>({
    queryKey: ['varebok-recipe-products'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/varebok/recipe-products?limit=1000')
      return response.data
    },
  })

  // Filter products by status
  const filteredProducts = allProducts.filter((product) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'exact') return product.has_exact_match
    if (statusFilter === 'partial') return !product.has_exact_match && product.best_match
    if (statusFilter === 'none') return !product.has_exact_match && !product.best_match
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Reset page when filter changes
  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter)
    setCurrentPage(1)
  }

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiClient.delete(`/v1/varebok/suppliers/${encodeURIComponent(name)}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['varebok-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['varebok-stats'] })
      toast.success('Leverandorfil slettet')
      setDeleteSupplier(null)
    },
    onError: () => {
      toast.error('Kunne ikke slette leverandorfil')
    },
  })

  // Apply match mutation
  const applyMatchMutation = useMutation({
    mutationFn: async ({ produktid, varebok_varenummer }: { produktid: number; varebok_varenummer: string }) => {
      const response = await apiClient.post('/v1/varebok/apply-match', {
        produktid,
        varebok_varenummer,
        update_ean: true,
        update_name: true,
        update_leverandorsproduktnr: true,
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['varebok-recipe-products'] })
      queryClient.invalidateQueries({ queryKey: ['varebok-stats'] })
      toast.success('Match anvendt', {
        description: `Produktet er oppdatert med ${Object.keys(data.changes_applied).length} endringer`,
      })
      setPendingMatch(null)
      setSelectedProduct(null)
    },
    onError: () => {
      toast.error('Kunne ikke anvende match')
      setPendingMatch(null)
    },
  })

  // Handle selecting a match - either show confirmation or apply directly
  const handleSelectMatch = (
    produktid: number,
    varebok_varenummer: string,
    productName: string,
    matchName: string
  ) => {
    if (skipConfirmationRef.current) {
      // Skip confirmation, apply directly
      applyMatchMutation.mutate({ produktid, varebok_varenummer })
    } else {
      // Close the product dialog FIRST to avoid stacking modals
      setSelectedProduct(null)
      // Then show confirmation dialog (after a micro-delay to ensure cleanup)
      setTimeout(() => {
        setPendingMatch({ produktid, varebok_varenummer, productName, matchName })
      }, 0)
    }
  }

  // Confirm and apply the pending match
  const confirmApplyMatch = () => {
    if (dontShowAgainChecked) {
      skipConfirmationRef.current = true
    }
    if (pendingMatch) {
      applyMatchMutation.mutate({
        produktid: pendingMatch.produktid,
        varebok_varenummer: pendingMatch.varebok_varenummer,
      })
    }
    setDontShowAgainChecked(false)
  }

  // Handle file upload
  const handleFileUpload = useCallback(async () => {
    if (!uploadFile || !supplierName.trim()) {
      toast.error('Velg en fil og angi leverandornavn')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('supplier_name', supplierName.trim())

    try {
      await apiClient.post('/v1/varebok/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['varebok-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['varebok-stats'] })
      toast.success('Fil lastet opp', {
        description: `Leverandorfil fra ${supplierName} er lastet opp`,
      })
      setUploadFile(null)
      setSupplierName('')
    } catch (error: any) {
      toast.error('Opplasting feilet', {
        description: error.response?.data?.detail || 'Kunne ikke laste opp filen',
      })
    } finally {
      setIsUploading(false)
    }
  }, [uploadFile, supplierName, queryClient])

  const getMatchTypeBadge = (matchType: string, confidence: number) => {
    if (matchType === 'ean_exact') {
      return <Badge className="bg-green-600">EAN Match</Badge>
    }
    if (matchType === 'varenr_exact') {
      return <Badge className="bg-blue-600">Varenr Match</Badge>
    }
    if (confidence >= 0.9) {
      return <Badge className="bg-yellow-600">Navnematch ({Math.round(confidence * 100)}%)</Badge>
    }
    return <Badge variant="secondary">Mulig match ({Math.round(confidence * 100)}%)</Badge>
  }

  const getProductStatusBadge = (product: RecipeProductWithMatches) => {
    if (product.has_exact_match) {
      return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Eksakt match</Badge>
    }
    if (product.best_match) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><AlertCircle className="h-3 w-3 mr-1" />Mulig match</Badge>
    }
    return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Ingen match</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produktmatching</h1>
          <p className="text-muted-foreground mt-1">
            Match produkter i oppskrifter med leverandordata
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchProducts()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Oppdater
        </Button>
      </div>

      {/* Stats cards - clickable for filtering */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produkter i oppskrifter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_recipe_products ?? '-'}</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'exact' ? 'ring-2 ring-green-600' : ''}`}
          onClick={() => handleFilterChange('exact')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eksakt match</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.matched_products ?? '-'}</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'partial' ? 'ring-2 ring-yellow-600' : ''}`}
          onClick={() => handleFilterChange('partial')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delvis match</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.partial_matches ?? '-'}</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'none' ? 'ring-2 ring-red-600' : ''}`}
          onClick={() => handleFilterChange('none')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingen match</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.no_matches ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Produkter ({filteredProducts.length})
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Last opp ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Produkter brukt i oppskrifter</CardTitle>
              <CardDescription>
                Produkter sortert etter antall oppskrifter de brukes i. Klikk for a se matchforslag.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {statusFilter === 'all'
                    ? 'Ingen produkter funnet. Last opp en leverandorfil først.'
                    : `Ingen produkter med "${statusFilter === 'exact' ? 'eksakt match' : statusFilter === 'partial' ? 'delvis match' : 'ingen match'}" status.`}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produkt</TableHead>
                        <TableHead>GTIN</TableHead>
                        <TableHead>Leverandornr</TableHead>
                        <TableHead className="text-right">Oppskrifter</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                        <TableRow
                          key={product.produktid}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <TableCell className="font-medium">
                            {product.produktnavn || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <div className="space-y-0.5">
                              {product.ean_kode && <div className="text-muted-foreground">Basis: {product.ean_kode}</div>}
                              {(product as any).gtin_fpak && <div>F-pak: {(product as any).gtin_fpak}</div>}
                              {(product as any).gtin_dpak && <div>D-pak: {(product as any).gtin_dpak}</div>}
                              {!product.ean_kode && !(product as any).gtin_fpak && !(product as any).gtin_dpak && <div>-</div>}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {product.leverandorsproduktnr || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.recipe_count}
                          </TableCell>
                          <TableCell>
                            {getProductStatusBadge(product)}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Viser {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredProducts.length)} av {filteredProducts.length} produkter
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Forrige
                        </Button>
                        <span className="text-sm">
                          Side {currentPage} av {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Neste
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          {/* Upload form */}
          <Card>
            <CardHeader>
              <CardTitle>Last opp leverandorfil</CardTitle>
              <CardDescription>
                Last opp en CSV-fil med produktdata fra en leverandor. Filen ma vere semikolonseparert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Leverandornavn</Label>
                  <Input
                    id="supplier"
                    placeholder="F.eks. VOIS, ASKO, etc."
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">CSV-fil</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <Button
                onClick={handleFileUpload}
                disabled={!uploadFile || !supplierName.trim() || isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Last opp
              </Button>
            </CardContent>
          </Card>

          {/* Uploaded files list */}
          <Card>
            <CardHeader>
              <CardTitle>Opplastede filer</CardTitle>
              <CardDescription>
                Leverandorfiler som er lastet opp og tilgjengelig for matching.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suppliersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Ingen leverandorfiler lastet opp enna.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leverandor</TableHead>
                      <TableHead className="text-right">Antall produkter</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.supplier_name}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {supplier.supplier_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {supplier.products_count}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteSupplier(supplier.supplier_name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product match dialog */}
      {selectedProduct && (
        <Dialog open={true} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Matchforslag</DialogTitle>
              <DialogDescription>
                Velg en match for a oppdatere produktet.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Current product info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Gjeldende produkt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Navn:</span>{' '}
                      <span className="font-medium">{selectedProduct.produktnavn || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">EAN (Basis):</span>{' '}
                      <span className="font-mono">{selectedProduct.ean_kode || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GTIN F-pak:</span>{' '}
                      <span className="font-mono">{(selectedProduct as any).gtin_fpak || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GTIN D-pak:</span>{' '}
                      <span className="font-mono">{(selectedProduct as any).gtin_dpak || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leverandornr:</span>{' '}
                      <span className="font-mono">{selectedProduct.leverandorsproduktnr || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Brukt i:</span>{' '}
                      <span className="font-medium">{selectedProduct.recipe_count} oppskrifter</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Match suggestions */}
              {selectedProduct.matches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  Ingen matchforslag funnet for dette produktet.
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium">Matchforslag ({selectedProduct.matches.length})</h4>
                  {selectedProduct.matches.map((match, index) => (
                    <Card key={index} className={index === 0 ? 'border-primary' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getMatchTypeBadge(match.match_type, match.confidence)}
                              {index === 0 && <Badge variant="outline">Beste match</Badge>}
                            </div>
                            <div className="font-medium">{match.varebok_product.varenavn}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div>
                                Varenr: <span className="font-mono">{match.varebok_product.varenummer}</span>
                              </div>
                              <div>
                                GTIN F-pak: <span className="font-mono">{match.varebok_product.ean_f_pakn || '-'}</span>
                              </div>
                              <div>
                                GTIN D-pak: <span className="font-mono">{match.varebok_product.ean_d_pakn || '-'}</span>
                              </div>
                              {match.varebok_product.leverandor_navn && (
                                <div>Leverandor: {match.varebok_product.leverandor_navn}</div>
                              )}
                              {match.varebok_product.pris && (
                                <div>Pris: {match.varebok_product.pris.toFixed(2)} kr</div>
                              )}
                            </div>

                            {/* Show changes */}
                            {Object.keys(match.changes).length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-sm font-medium mb-1">Endringer som vil bli gjort:</div>
                                <div className="space-y-1 text-sm">
                                  {Object.entries(match.changes).map(([field, [oldVal, newVal]]) => (
                                    <div key={field} className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{field}:</span>
                                      <span className="line-through text-red-600">{oldVal || '(tom)'}</span>
                                      <ChevronRight className="h-3 w-3" />
                                      <span className="text-green-600">{newVal}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleSelectMatch(
                              selectedProduct.produktid,
                              match.varebok_product.varenummer,
                              selectedProduct.produktnavn || 'Ukjent produkt',
                              match.varebok_product.varenavn
                            )}
                            disabled={applyMatchMutation.isPending}
                          >
                            {applyMatchMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Velg
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                Lukk
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      {deleteSupplier && (
        <AlertDialog open={true} onOpenChange={(open) => !open && setDeleteSupplier(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Slett leverandorfil?</AlertDialogTitle>
              <AlertDialogDescription>
                Er du sikker pa at du vil slette leverandorfilen fra <strong>{deleteSupplier}</strong>?
                Dette vil fjerne alle produktene fra denne leverandoren fra matchingsystemet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteSupplierMutation.mutate(deleteSupplier)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Slett
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Match confirmation dialog */}
      {pendingMatch && (
        <AlertDialog open={true} onOpenChange={(open) => {
          if (!open) {
            setPendingMatch(null)
            setDontShowAgainChecked(false)
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bekreft valg</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Er du sikker pa at du vil oppdatere <strong>{pendingMatch.productName}</strong> med
                    data fra <strong>{pendingMatch.matchName}</strong>?
                  </p>
                  <p className="text-sm">
                    Dette vil overskrive EAN-kode, produktnavn og leverandorproduktnummer.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="dontShowAgain"
                checked={dontShowAgainChecked}
                onCheckedChange={(checked) => setDontShowAgainChecked(checked === true)}
              />
              <Label htmlFor="dontShowAgain" className="text-sm text-muted-foreground cursor-pointer">
                Ikke vis denne meldingen igjen i denne okten
              </Label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmApplyMatch}
                disabled={applyMatchMutation.isPending}
              >
                {applyMatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Bekreft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
