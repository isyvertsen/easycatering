"use client"

import { useState } from "react"
import Link from "next/link"
import { useMyWebshopOrders } from "@/hooks/useWebshop"
import { Order } from "@/types/models"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ShoppingBag, Eye } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const getOrderStatus = (order: Order) => {
  if (order.kansellertdato) {
    return { label: "Kansellert", variant: "destructive" as const }
  }
  if (order.ordrelevert) {
    return { label: "Levert", variant: "default" as const }
  }
  if (order.sentbekreftelse) {
    return { label: "Bekreftet", variant: "secondary" as const }
  }
  if (order.ordrestatusid === 1) {
    return { label: "Ny - Venter på godkjenning", variant: "outline" as const }
  }
  if (order.ordrestatusid === 2) {
    return { label: "Under behandling", variant: "secondary" as const }
  }
  if (order.ordrestatusid === 3) {
    return { label: "Godkjent", variant: "default" as const }
  }
  return { label: "Ukjent", variant: "outline" as const }
}

export default function MyOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useMyWebshopOrders({
    search: searchTerm,
    ordrestatusid: statusFilter,
    page,
    page_size: 10,
  })

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mine bestillinger</h1>
        <p className="text-muted-foreground">
          Oversikt over dine webshop-bestillinger
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtrer bestillinger</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={statusFilter?.toString() || "all"}
            onValueChange={(value) => {
              setStatusFilter(value === "all" ? undefined : parseInt(value))
              setPage(1)
            }}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="1">Venter</TabsTrigger>
              <TabsTrigger value="2">Behandles</TabsTrigger>
              <TabsTrigger value="3">Godkjent</TabsTrigger>
              <TabsTrigger value="levert">Levert</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk i ordrenummer eller informasjon..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Laster bestillinger...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">
            Kunne ikke laste bestillinger. Vennligst prøv igjen senere.
          </p>
        </div>
      )}

      {/* Orders List */}
      {data && data.items.length > 0 && (
        <>
          <div className="space-y-4">
            {data.items.map((order) => {
              const status = getOrderStatus(order)
              return (
                <Card key={order.ordreid}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">
                            Ordre #{order.ordreid}
                          </h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          {order.ordredato && (
                            <p>
                              Bestilt:{" "}
                              {format(new Date(order.ordredato), "dd. MMMM yyyy", {
                                locale: nb,
                              })}
                            </p>
                          )}
                          {order.leveringsdato && (
                            <p>
                              Levering:{" "}
                              {format(new Date(order.leveringsdato), "dd. MMMM yyyy", {
                                locale: nb,
                              })}
                            </p>
                          )}
                          {order.informasjon && (
                            <p className="line-clamp-1">
                              Kommentar: {order.informasjon}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button asChild variant="outline">
                          <Link href={`/webshop/mine-ordre/${order.ordreid}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Se detaljer
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Forrige
              </Button>
              <span className="text-sm text-muted-foreground">
                Side {page} av {data.total_pages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
              >
                Neste
              </Button>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ingen bestillinger funnet</h2>
              <p className="text-muted-foreground mb-6">
                {searchTerm || statusFilter
                  ? "Prøv å endre søkekriteriene"
                  : "Du har ikke lagt inn noen bestillinger ennå"}
              </p>
              {!searchTerm && !statusFilter && (
                <Button asChild>
                  <Link href="/webshop">Gå til webbutikk</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
