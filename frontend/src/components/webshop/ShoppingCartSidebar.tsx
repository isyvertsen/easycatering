"use client"

import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"

interface ShoppingCartSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShoppingCartSidebar({ open, onOpenChange }: ShoppingCartSidebarProps) {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCart()
  const router = useRouter()

  const handleCheckout = () => {
    onOpenChange(false)
    router.push("/webshop/checkout")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Handlekurv</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Handlekurven er tom"
              : `${items.length} produkt${items.length !== 1 ? "er" : ""} i kurven`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Handlekurven din er tom
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fortsett å handle
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.produktid}
                  className="flex gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <h4 className="font-medium line-clamp-2">
                      {item.visningsnavn || item.produktnavn}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.pris.toFixed(2)} kr per stk
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.produktid, item.antall - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.antall}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (!isNaN(value) && value > 0) {
                            updateQuantity(item.produktid, value)
                          }
                        }}
                        className="w-16 h-8 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.produktid, item.antall + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Price and Remove */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {(item.pris * item.antall).toFixed(2)} kr
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(item.produktid)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with Total and Actions */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Totalt:</span>
                <span>{getTotalPrice().toFixed(2)} kr</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
              >
                Gå til kasse
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={clearCart}
              >
                Tøm handlekurv
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
