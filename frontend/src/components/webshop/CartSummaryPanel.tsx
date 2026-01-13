"use client"

import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useEffect, useState } from "react"

/**
 * Compact cart summary panel that shows on the right side of the webshop page
 * Like a "shopping list" that displays items as they're added
 * - Single line per item
 * - Newest items at the top
 * - Animation when items are added
 */
export function CartSummaryPanel() {
  const { items, removeItem, getTotalPrice, getTotalItems } = useCart()
  const router = useRouter()

  // Track previously seen item IDs to detect new additions
  const [newItemIds, setNewItemIds] = useState<Set<number>>(new Set())
  const prevItemsRef = useRef<number[]>([])

  useEffect(() => {
    const currentIds = items.map(item => item.produktid)
    const prevIds = new Set(prevItemsRef.current)

    // Find new items that weren't in the previous list
    const newIds = currentIds.filter(id => !prevIds.has(id))

    if (newIds.length > 0) {
      setNewItemIds(new Set(newIds))
      // Clear animation after it completes
      const timer = setTimeout(() => setNewItemIds(new Set()), 500)
      return () => clearTimeout(timer)
    }

    prevItemsRef.current = currentIds
  }, [items])

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

  // Reverse items so newest is at top
  const reversedItems = [...items].reverse()

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
        {/* Single-line item list with line totals */}
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-0.5 pr-2">
            {reversedItems.map((item) => {
              const isNew = newItemIds.has(item.produktid)
              const lineTotal = item.pris * item.antall
              return (
                <div
                  key={item.produktid}
                  className={`flex items-center gap-2 text-sm py-2 border-b last:border-0 transition-all duration-300 ${
                    isNew ? "animate-in slide-in-from-top-2 fade-in bg-primary/5" : ""
                  }`}
                >
                  <span className="text-muted-foreground shrink-0 w-6 text-right">
                    {item.antall}×
                  </span>
                  <span className="flex-1 min-w-0 truncate capitalize" title={item.produktnavn}>
                    {item.produktnavn.toLowerCase()}
                  </span>
                  <span className="font-semibold whitespace-nowrap tabular-nums">
                    {lineTotal.toFixed(0)} kr
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 -mr-1"
                    onClick={() => removeItem(item.produktid)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Total */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between font-semibold text-base">
            <span>Totalt:</span>
            <span className="tabular-nums">{getTotalPrice().toFixed(0)} kr</span>
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
