"use client"

import { Product } from "@/types/models"
import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { ShoppingCart, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { toast } = useToast()

  const handleAddToCart = () => {
    const priceExMva = product.pris || 0
    const mvaRate = product.mvaverdi || 0
    const priceWithMva = priceExMva * (1 + mvaRate / 100)

    addItem({
      produktid: product.produktid,
      produktnavn: product.produktnavn,
      visningsnavn: product.visningsnavn,
      pris: priceWithMva,
      bilde: undefined,
    })

    toast({
      title: "Lagt til i handlekurv",
      description: `${product.visningsnavn || product.produktnavn} ble lagt til`,
    })
  }

  const displayName = product.produktnavn
  const priceExMva = product.pris || 0
  const mvaRate = product.mvaverdi || 0
  const priceWithMva = priceExMva * (1 + mvaRate / 100)

  // Capitalize helper: "01-ASPARGESSUPPE" -> "01-Aspargessuppe"
  const capitalize = (str: string) => {
    return str.toLowerCase().replace(/(?:^|[\s-])(\w)/g, (match) => match.toUpperCase())
  }

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        {/* Placeholder for product image */}
        <div className="aspect-square bg-muted rounded-md flex items-center justify-center mb-3">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg line-clamp-2" title={displayName}>
          {capitalize(displayName)}
        </h3>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {product.leverandor?.navn && (
          <p className="text-xs text-muted-foreground">
            Leverandør: {product.leverandor.navn}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        <div className="flex flex-col">
          <span className="text-2xl font-bold">
            {priceWithMva.toFixed(2)} kr
          </span>
        </div>
        <Button onClick={handleAddToCart} size="sm">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Legg til
        </Button>
      </CardFooter>
    </Card>
  )
}
