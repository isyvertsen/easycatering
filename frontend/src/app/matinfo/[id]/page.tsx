"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useMatinfoProduct,
  useUpdateMatinfoProduct,
  useLinkedProduct,
  useSyncSingleProduct,
  useUpdateAllergen,
  useDeleteAllergen,
} from "@/hooks/useMatinfo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  RefreshCw,
  Package,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Link2,
  Wheat,
  Beaker,
} from "lucide-react"

const allergenLevelColors: Record<string, string> = {
  CONTAINS: "destructive",
  MAY_CONTAIN: "secondary",
  CROSS_CONTAMINATION: "outline",
  FREE_FROM: "default",
} as const

const allergenLevelLabels: Record<string, string> = {
  CONTAINS: "Inneholder",
  MAY_CONTAIN: "Kan inneholde",
  CROSS_CONTAMINATION: "Spor av",
  FREE_FROM: "Fri for",
}

export default function MatinfoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const { data: product, isLoading } = useMatinfoProduct(id)
  const { data: linkedProduct, isLoading: loadingLinked } = useLinkedProduct(product?.gtin)
  const syncMutation = useSyncSingleProduct()
  const updateMutation = useUpdateMatinfoProduct()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/matinfo">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Link>
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p>Produkt ikke funnet</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSync = () => {
    if (product?.gtin) {
      syncMutation.mutate(product.gtin)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/matinfo">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbake
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground font-mono">{product.gtin}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Oppdater fra Matinfo
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produktinformasjon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Merke</p>
                <p className="font-medium">{product.brandName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produsent</p>
                <p className="font-medium">{product.producerName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leverandør</p>
                <p className="font-medium">{product.providerName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pakningsstørrelse</p>
                <p className="font-medium">{product.packageSize || "-"}</p>
              </div>
            </div>

            {product.ingredientStatement && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ingredienser</p>
                  <p className="text-sm">{product.ingredientStatement}</p>
                </div>
              </>
            )}

            {product.productUrl && (
              <>
                <Separator />
                <Button variant="outline" size="sm" asChild>
                  <a href={product.productUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Se på Matinfo.no
                  </a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Linked LKC Product */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Koblet LKC-produkt
            </CardTitle>
            <CardDescription>
              Produkt i LKC-katalogen med samme GTIN
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLinked ? (
              <Skeleton className="h-24" />
            ) : linkedProduct?.produkter ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Produktnavn</p>
                    <p className="font-medium">{linkedProduct.produkter.produktnavn}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produkt-ID</p>
                    <p className="font-medium">{linkedProduct.produkter.produktid}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pris</p>
                    <p className="font-medium">
                      {linkedProduct.produkter.pris ? `${linkedProduct.produkter.pris} kr` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lagerbeholdning</p>
                    <p className="font-medium">{linkedProduct.produkter.lagermengde ?? "-"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/produkter/${linkedProduct.produkter.produktid}`}>
                    Gå til produkt
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Ingen LKC-produkt koblet til denne GTIN</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Allergens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            Allergener
          </CardTitle>
          <CardDescription>
            {product.allergens.length} allergener registrert
          </CardDescription>
        </CardHeader>
        <CardContent>
          {product.allergens.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Ingen allergener registrert for dette produktet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Allergen</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.allergens.map((allergen) => (
                  <TableRow key={allergen.code}>
                    <TableCell className="font-mono">{allergen.code}</TableCell>
                    <TableCell>{allergen.name}</TableCell>
                    <TableCell>
                      <Badge variant={allergenLevelColors[allergen.level] as "destructive" | "secondary" | "outline" | "default"}>
                        {allergenLevelLabels[allergen.level] || allergen.level}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Nutrients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Næringsverdier
          </CardTitle>
          <CardDescription>
            {product.nutrients.length} næringsverdier registrert (per 100g)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {product.nutrients.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Ingen næringsverdier registrert for dette produktet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Næringsstoff</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead className="text-right">Verdi</TableHead>
                  <TableHead>Enhet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.nutrients.map((nutrient) => (
                  <TableRow key={nutrient.code}>
                    <TableCell className="font-medium">{nutrient.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {nutrient.code}
                    </TableCell>
                    <TableCell className="text-right">
                      {nutrient.measurementPrecision === "APPROXIMATELY" && "~"}
                      {nutrient.measurement.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {nutrient.measurementType}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
