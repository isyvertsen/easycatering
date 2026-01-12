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
  FileText,
  Receipt,
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

// Fetch orders with status 80 (Godkjent av mottaker)
function useMottakGodkjenteOrdrer(params: { search?: string; page: number; page_size: number }) {
  return useQuery({
    queryKey: ["webshop", "mottatt-ordre", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      queryParams.append("status", "80")
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
      queryClient.invalidateQueries({ queryKey: ["webshop", "mottatt-ordre"] })
      toast({
        title: "Fakturert",
        description: `${variables.orderIds.length} ordre(r) er markert som fakturert`,
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

export default function WebshopInvoicePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const { toast } = useToast()

  const { data, isLoading, error } = useMottakGodkjenteOrdrer({
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

  const handleGenerateInvoice = async () => {
    // Update status to 85 (Fakturert)
    await updateStatus.mutateAsync({
      orderIds: selectedOrders,
      statusId: 85,
    })
    setSelectedOrders([])

    toast({
      title: "Info",
      description: "Ordrer er markert som fakturert. PDF-generering kommer i neste versjon.",
    })
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Webshop - Fakturering</h1>
        <p className="text-muted-foreground">
          Fakturer ordrer som er godkjent av mottaker
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
                placeholder="Sok i ordre..."
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
                    <FileText className="mr-2 h-4 w-4" />
                    Fakturer ({selectedOrders.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Fakturer ordrer?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil markere {selectedOrders.length} ordre(r) som fakturert
                      og sette dem til status "Fakturert" (85).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleGenerateInvoice}
                      disabled={updateStatus.isPending}
                    >
                      Fakturer
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
                        <Badge variant="default">Godkjent av mottaker</Badge>
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
                            Levert:{" "}
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
              <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ingen ordrer klare for fakturering</h2>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Ingen ordre matcher soket"
                  : "Det er ingen mottatte ordrer som venter pa fakturering"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
