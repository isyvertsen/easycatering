"use client"

import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * Compact cart summary panel that shows on the right side of the webshop page
 * Like a "shopping list" that displays items as they're added
 */
export function CartSummaryPanel() {
  const { items, removeItem, getTotalPrice, getTotalItems } = useCart()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <Card className="sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Handleliste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen varer lagt til
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Handleliste
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {getTotalItems()} varer
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compact item list */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-2">
            {items.map((item) => (
              <div
                key={item.produktid}
                className="flex items-center justify-between gap-2 text-sm py-1 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {item.visningsnavn || item.produktnavn}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.antall} × {item.pris.toFixed(0)} kr
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold whitespace-nowrap">
                    {(item.pris * item.antall).toFixed(0)} kr
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeItem(item.produktid)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between font-semibold">
            <span>Totalt:</span>
            <span>{getTotalPrice().toFixed(2)} kr</span>
          </div>
        </div>

        {/* Checkout button */}
        <Button
          className="w-full"
          size="sm"
          onClick={() => router.push("/webshop/checkout")}
        >
          Gå til kasse
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
