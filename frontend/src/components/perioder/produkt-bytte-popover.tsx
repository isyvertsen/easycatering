"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Search, Loader2, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useProduktSearch, useSwapProdukt } from "@/hooks/useMenyProdukt"
import { Produkt } from "@/lib/api/produkter"

interface ProduktByttePopoverProps {
  menyId: number
  currentProduktId: number
  currentProduktNavn: string
  onSwapComplete?: () => void
}

export function ProduktByttePopover({
  menyId,
  currentProduktId,
  currentProduktNavn,
  onSwapComplete
}: ProduktByttePopoverProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: produkter, isLoading } = useProduktSearch({
    sok: debouncedSearch || undefined,
    limit: 50
  })

  const swapMutation = useSwapProdukt()

  const handleSelect = async (produkt: Produkt) => {
    if (produkt.produktid === currentProduktId) return

    await swapMutation.mutateAsync({
      menyId,
      oldProduktId: currentProduktId,
      newProduktId: produkt.produktid
    })

    setOpen(false)
    setSearchTerm("")
    onSwapComplete?.()
  }

  // Filter out the current product from the list
  const filteredProdukter = produkter?.filter(
    p => p.produktid !== currentProduktId
  ) || []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title={`Bytt ${currentProduktNavn}`}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Bytt produkt</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sok etter produkt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bytter ut: <span className="font-medium">{currentProduktNavn}</span>
          </p>
        </div>

        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProdukter.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {searchTerm ? "Ingen produkter funnet" : "Skriv for a soke..."}
            </div>
          ) : (
            <div className="p-1">
              {filteredProdukter.map((produkt) => (
                <button
                  key={produkt.produktid}
                  onClick={() => handleSelect(produkt)}
                  disabled={swapMutation.isPending}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-md hover:bg-accent focus:bg-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{produkt.produktnavn}</p>
                    {produkt.visningsnavn && (
                      <p className="text-xs text-muted-foreground truncate">
                        {produkt.visningsnavn}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 flex items-center gap-2 flex-shrink-0">
                    {produkt.pris != null && (
                      <span className="text-xs text-muted-foreground">
                        kr {produkt.pris.toFixed(2)}
                      </span>
                    )}
                    {swapMutation.isPending && swapMutation.variables?.newProduktId === produkt.produktid && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
