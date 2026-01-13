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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Eye,
  CheckCircle,
  Package,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

// Fetch orders with status 25 (Plukkliste skrevet)
function usePlukklisteOrdrer(params: { search?: string; page: number; page_size: number }) {
  return useQuery({
    queryKey: ["webshop", "plukkliste-ordre", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      queryParams.append("status", "25")
      queryParams.append("page", params.page.toString())
      queryParams.append("page_size", params.page_size.toString())
      if (params.search) queryParams.append("search", params.search)

      const response = await apiClient.get(`/v1/webshop/ordre/status?${queryParams}`)
      return response.data as OrderListResponse
    },
    staleTime: 30 * 1000,
  })
}

// Update order status
function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ orderIds, statusId }: { orderIds: number[]; statusId: number }) => {
      const response = await apiClient.post("/v1/webshop/ordre/godkjenning/batch", {
        ordre_ids: orderIds,
        ordrestatusid: statusId,
      })
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["webshop", "plukkliste-ordre"] })
      toast({
        title: "Ordrer plukket",
        description: `${variables.orderIds.length} ordre(r) er markert som plukket`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke oppdatere ordre",
        variant: "destructive",
      })
    },
  })
}

export default function WebshopPickingPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = usePlukklisteOrdrer({
    search: searchTerm,
    page,
    page_size: 20,
  })

  const updateStatus = useUpdateOrderStatus()

  const handleSelectAll = () => {
    if (!data?.items) return

    if (selectedOrders.length === data.items.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(data.items.map((order) => order.ordreid))
    }
  }

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleMarkAsPicked = async () => {
    await updateStatus.mutateAsync({
      orderIds: selectedOrders,
      statusId: 30, // Plukket
    })
    setSelectedOrders([])
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Webshop - Plukking</h1>
        <p className="text-muted-foreground">
          Marker ordrer som ferdig plukket
        </p>
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Handlinger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk i ordre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>

            {selectedOrders.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marker som plukket ({selectedOrders.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Marker som plukket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil markere {selectedOrders.length} ordre(r) som plukket
                      og sette dem til status "Plukket" (30).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleMarkAsPicked}
                      disabled={updateStatus.isPending}
                    >
                      Bekreft
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
            Kunne ikke laste ordre. Vennligst prøv igjen senere.
          </p>
        </div>
      )}

      {/* Orders List */}
      {data && data.items.length > 0 && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center gap-2 pb-3 border-b">
                  <Checkbox
                    checked={
                      selectedOrders.length === data.items.length &&
                      data.items.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Velg alle ({data.items.length})
                  </span>
                </div>

                {/* Order Items */}
                {data.items.map((order) => (
                  <div
                    key={order.ordreid}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedOrders.includes(order.ordreid)}
                      onCheckedChange={() => handleSelectOrder(order.ordreid)}
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">Ordre #{order.ordreid}</h3>
                        <Badge variant="outline">Plukkliste skrevet</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Kunde: {order.kundenavn}</p>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Plukket
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Marker som plukket?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Dette vil markere ordren som plukket (status 30).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                updateStatus.mutateAsync({
                                  orderIds: [order.ordreid],
                                  statusId: 30,
                                })
                              }}
                            >
                              Bekreft
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ingen ordrer å plukke</h2>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Ingen ordre matcher søket"
                  : "Det er ingen ordrer som venter på plukking"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
