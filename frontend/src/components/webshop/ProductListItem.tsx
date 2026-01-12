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
    addItem({
      produktid: product.produktid,
      produktnavn: product.produktnavn,
      visningsnavn: product.visningsnavn,
      pris: product.pris || 0,
      bilde: undefined,
    })

    toast({
      title: "Lagt til i handlekurv",
      description: `${product.visningsnavn || product.produktnavn} ble lagt til`,
    })
  }

  const displayName = product.visningsnavn || product.produktnavn
  const price = product.pris || 0

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      {/* Product Icon */}
      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base truncate" title={displayName}>
          {displayName}
        </h3>
        {product.leverandor?.navn && (
          <p className="text-xs text-muted-foreground">
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
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-lg font-bold whitespace-nowrap">
          {price.toFixed(2)} kr
        </span>
        <Button onClick={handleAddToCart} size="sm">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Legg til
        </Button>
      </div>
    </div>
  )
}
