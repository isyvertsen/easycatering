"use client"

import { Product } from "@/types/models"
import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProductListItemProps {
  product: Product
}

export function ProductListItem({ product }: ProductListItemProps) {
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
    <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      {/* Product Icon - hidden on mobile */}
      <div className="hidden md:flex w-16 h-16 bg-muted rounded-md items-center justify-center flex-shrink-0">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm md:text-base md:truncate break-words" title={displayName}>
          {capitalize(displayName)}
        </h3>
        {product.leverandor?.navn && (
          <p className="text-xs text-muted-foreground hidden md:block">
            Leverandor: {product.leverandor.navn}
          </p>
        )}
        {product.pakningstype && (
          <p className="text-xs text-muted-foreground">
            {product.pakningstype} {product.pakningsstorrelse}
          </p>
        )}
      </div>

      {/* Price and Add Button */}
      <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4 flex-shrink-0">
        <span className="text-base md:text-lg font-bold whitespace-nowrap">
          {priceWithMva.toFixed(2)} kr
        </span>
        <Button onClick={handleAddToCart} size="sm" className="w-full md:w-auto">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Legg til
        </Button>
      </div>
    </div>
  )
}
