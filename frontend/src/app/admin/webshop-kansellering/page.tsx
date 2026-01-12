"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Eye,
  XCircle,
  Ban,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Order {
  ordreid: number
  kundeid: number
  kundenavn: string
  ordredato: string
  leveringsdato?: string
  informasjon?: string
  ordrestatusid: number
}

interface OrderListResponse {
  items: Order[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

const STATUS_NAMES: Record<number, string> = {
  10: "Startet",
  15: "Bestilt",
  20: "Godkjent",
  25: "Plukkliste skrevet",
  30: "Plukket",
  35: "Pakkliste skrevet",
  80: "Godkjent av mottaker",
  85: "Fakturert",
  90: "Sendt til regnskap",
  95: "Kreditert",
  98: "For sen kansellering",
  99: "Kansellert",
}

// Fetch active orders (status < 85, excluding 98, 99)
function useAktiveOrdrer(params: { search?: string; page: number; page_size: number }) {
  return useQuery({
    queryKey: ["webshop", "aktive-ordre", params],
    queryFn: async () => {
      // Get orders with active statuses (10-80)
      const queryParams = new URLSearchParams()
      queryParams.append("page", params.page.toString())
      queryParams.append("page_size", params.page_size.toString())
      if (params.search) queryParams.append("search", params.search)

      // We'll need to fetch orders in multiple statuses and combine
      // For now, let's use status 15 as a starting point (pending orders)
      queryParams.append("status", "15")

      const response = await apiClient.get(`/v1/webshop/ordre/status?${queryParams}`)
      return response.data as OrderListResponse
    },
    staleTime: 30 * 1000,
  })
}

// Cancel order
function useCancelOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ orderId, arsak, forSen }: { orderId: number; arsak?: string; forSen: boolean }) => {
      const response = await apiClient.post(`/v1/webshop/ordre/${orderId}/kanseller`, {
        arsak,
        for_sen: forSen,
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webshop", "aktive-ordre"] })
      toast({
        title: "Ordre kansellert",
        description: data.message,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke kansellere ordre",
        variant: "destructive",
      })
    },
  })
}

function CancelOrderDialog({ order, onCancel }: { order: Order; onCancel: () => void }) {
  const [arsak, setArsak] = useState("")
  const [forSen, setForSen] = useState(false)
  const [open, setOpen] = useState(false)
  const cancelOrder = useCancelOrder()

  const handleCancel = async () => {
    await cancelOrder.mutateAsync({
      orderId: order.ordreid,
      arsak: arsak || undefined,
      forSen,
    })
    setOpen(false)
    setArsak("")
    setForSen(false)
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <XCircle className="mr-2 h-4 w-4" />
          Kanseller
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kanseller ordre #{order.ordreid}</DialogTitle>
          <DialogDescription>
            Dette vil kansellere ordren. Velg type kansellering og oppgi eventuelt en begrunnelse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Kunde</Label>
            <p className="text-sm text-muted-foreground">{order.kundenavn}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arsak">Begrunnelse (valgfritt)</Label>
            <Textarea
              id="arsak"
              value={arsak}
              onChange={(e) => setArsak(e.target.value)}
              placeholder="Oppgi grunn for kansellering..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="forSen"
              checked={forSen}
              onCheckedChange={(checked) => setForSen(checked as boolean)}
            />
            <Label htmlFor="forSen" className="text-sm">
              For sen kansellering (gebyr kan palopte)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelOrder.isPending}
          >
            {cancelOrder.isPending ? "Kansellerer..." : "Kanseller ordre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function WebshopCancellationPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useAktiveOrdrer({
    search: searchTerm,
    page,
    page_size: 20,
  })

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Webshop - Kansellering</h1>
        <p className="text-muted-foreground">
          Kanseller ordrer som ikke skal behandles videre
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Sok</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sok etter kunde eller ordrenummer..."
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
          <p className="text-muted-foreground">Laster ordre...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">
            Kunne ikke laste ordre. Vennligst prov igjen senere.
          </p>
        </div>
      )}

      {/* Orders List */}
      {data && data.items.length > 0 && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Order Items */}
                {data.items.map((order) => (
                  <div
                    key={order.ordreid}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">Ordre #{order.ordreid}</h3>
                        <Badge variant="outline">
                          {STATUS_NAMES[order.ordrestatusid] || `Status ${order.ordrestatusid}`}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Kunde: {order.kundenavn}</p>
                        {order.ordredato && (
                          <p>
                            Bestilt:{" "}
                            {format(new Date(order.ordredato), "dd. MMM yyyy 'kl.' HH:mm", {
                              locale: nb,
                            })}
                          </p>
                        )}
                        {order.leveringsdato && (
                          <p>
                            Levering:{" "}
                            {format(new Date(order.leveringsdato), "dd. MMM yyyy", {
                              locale: nb,
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/webshop/mine-ordre/${order.ordreid}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Se
                        </Link>
                      </Button>

                      <CancelOrderDialog order={order} onCancel={() => refetch()} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
              <Ban className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ingen aktive ordrer</h2>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Ingen ordre matcher soket"
                  : "Det er ingen ordrer som venter pa behandling"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
