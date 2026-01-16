"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useWebshopProducts } from "@/hooks/useWebshop"
import { useCart } from "@/contexts/CartContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ShoppingCart, Filter, LayoutGrid, List, X, SlidersHorizontal } from "lucide-react"
import { ProductCard } from "@/components/webshop/ProductCard"
import { ProductListItem } from "@/components/webshop/ProductListItem"
import { ShoppingCartSidebar } from "@/components/webshop/ShoppingCartSidebar"
import { CartSummaryPanel } from "@/components/webshop/CartSummaryPanel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type ViewMode = "grid" | "list"

export default function WebshopPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"produktnavn" | "pris" | "visningsnavn">("produktnavn")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [cartOpen, setCartOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Load view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("webshop-view-mode")
    if (saved === "grid" || saved === "list") {
      setViewMode(saved)
    }
  }, [])

  // Save view preference to localStorage
  const handleViewModeChange = (value: string) => {
    if (value === "grid" || value === "list") {
      setViewMode(value)
      localStorage.setItem("webshop-view-mode", value)
    }
  }

  const { getTotalItems } = useCart()

  const { data, isLoading, error } = useWebshopProducts({
    search: searchTerm,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: 20,
  })

  // Reset products when search or sort changes
  useEffect(() => {
    setPage(1)
    setAllProducts([])
    setHasMore(true)
  }, [searchTerm, sortBy, sortOrder])

  // Accumulate products when new data arrives
  useEffect(() => {
    if (data && data.items) {
      if (page === 1) {
        setAllProducts(data.items)
      } else {
        setAllProducts((prev) => [...prev, ...data.items])
      }
      setHasMore(page < data.total_pages)
    }
  }, [data, page])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          console.log('Loading more products, current page:', page)
          setPage((p) => p + 1)
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoading, page])

  // Manual load more button as fallback
  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1)
    }
  }

  return (
    <div className="container mx-auto py-4 px-4 pb-24 md:py-6 md:pb-6">
      {/* Mobile Header */}
      <div className="md:hidden mb-4">
        <h1 className="text-2xl font-bold">Webbutikk</h1>
        <p className="text-sm text-muted-foreground">
          Bestill varer for ditt sykehjem
        </p>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Webbutikk</h1>
          <p className="text-muted-foreground">
            Bestill varer for ditt sykehjem
          </p>
        </div>

        {/* Cart Button - Desktop */}
        <Button
          onClick={() => setCartOpen(true)}
          variant="outline"
          size="lg"
          className="relative"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Handlekurv
          {getTotalItems() > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
              variant="destructive"
            >
              {getTotalItems()}
            </Badge>
          )}
        </Button>
      </div>

      {/* Mobile Search and Filter */}
      <div className="md:hidden mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter produkter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter og sortering
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[400px]">
            <SheetHeader>
              <SheetTitle>Filter og sortering</SheetTitle>
              <SheetDescription>
                Velg hvordan du vil sortere produktene
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sorter etter</label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sorter etter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produktnavn">Produktnavn</SelectItem>
                    <SelectItem value="visningsnavn">Visningsnavn</SelectItem>
                    <SelectItem value="pris">Pris</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Rekkefølge</label>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rekkefølge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Stigende</SelectItem>
                    <SelectItem value="desc">Synkende</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setFilterOpen(false)} className="w-full">
                Bruk filter
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Search and Filter Bar */}
      <div className="hidden md:flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter produkter..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
            }}
            className="pl-10"
          />
        </div>

        <Select
          value={sortBy}
          onValueChange={(value: any) => {
            setSortBy(value)
          }}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sorter etter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="produktnavn">Produktnavn</SelectItem>
            <SelectItem value="visningsnavn">Visningsnavn</SelectItem>
            <SelectItem value="pris">Pris</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortOrder}
          onValueChange={(value: any) => {
            setSortOrder(value)
          }}
        >
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Rekkefølge" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Stigende</SelectItem>
            <SelectItem value="desc">Synkende</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          className="border rounded-md"
        >
          <ToggleGroupItem value="grid" aria-label="Rutenett visning">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Liste visning">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Main content with cart panel */}
      <div className="flex gap-6">
        {/* Product section */}
        <div className="flex-1 min-w-0">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Laster produkter...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-destructive">
                Kunne ikke laste produkter. Vennligst prøv igjen senere.
              </p>
            </div>
          )}

          {/* Product Grid/List */}
          {allProducts.length > 0 && (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {allProducts.map((product) => (
                    <ProductCard key={product.produktid} product={product} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {allProducts.map((product) => (
                    <ProductListItem key={product.produktid} product={product} />
                  ))}
                </div>
              )}

              {/* Infinite Scroll Trigger & Load More Button */}
              <div className="mt-8 space-y-4">
                {hasMore && (
                  <>
                    {/* Invisible trigger for infinite scroll */}
                    <div ref={observerTarget} className="h-4"></div>

                    {/* Manual load button as fallback */}
                    <div className="flex items-center justify-center">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                          <span>Laster flere produkter...</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={isLoading || !hasMore}
                        >
                          Last flere produkter
                        </Button>
                      )}
                    </div>
                  </>
                )}
                {!hasMore && allProducts.length > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Alle produkter er lastet ({allProducts.length} totalt)
                  </p>
                )}
              </div>
            </>
          )}

          {/* No Results */}
          {!isLoading && allProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Ingen produkter funnet.
                {searchTerm && " Prøv et annet søkeord."}
              </p>
            </div>
          )}
        </div>

        {/* Cart Summary Panel - visible on larger screens */}
        <div className="hidden lg:block w-96 shrink-0">
          <CartSummaryPanel />
        </div>
      </div>

      {/* Shopping Cart Sidebar */}
      <ShoppingCartSidebar open={cartOpen} onOpenChange={setCartOpen} />

      {/* Mobile Sticky Bottom Cart Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
        <Button
          onClick={() => setCartOpen(true)}
          size="lg"
          className="w-full relative"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          <span>Handlekurv ({getTotalItems()})</span>
          {getTotalItems() > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
              variant="secondary"
            >
              {getTotalItems()}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  )
}
