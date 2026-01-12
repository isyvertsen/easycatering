"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useWebshopOrdersForApproval,
  useApproveWebshopOrder,
  useBatchApproveWebshopOrders,
} from "@/hooks/useWebshop"
import { Order } from "@/types/models"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  CheckCircle,
  PlayCircle,
  Eye,
  CheckCheck,
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

export default function WebshopApprovalPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useWebshopOrdersForApproval({
    search: searchTerm,
    page,
    page_size: 20,
  })

  const approveOrder = useApproveWebshopOrder()
  const batchApprove = useBatchApproveWebshopOrders()

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

  const handleApproveOrder = async (orderId: number, statusId: number) => {
    await approveOrder.mutateAsync({ id: orderId, statusId })
    setSelectedOrders((prev) => prev.filter((id) => id !== orderId))
  }

  const handleBatchApprove = async (statusId: number) => {
    await batchApprove.mutateAsync({ orderIds: selectedOrders, statusId })
    setSelectedOrders([])
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Webshop - Godkjenning</h1>
        <p className="text-muted-foreground">
          Godkjenn bestillinger fra webbutikken
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
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Sett til behandling ({selectedOrders.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sett til under behandling?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil sette {selectedOrders.length} ordre(r) til status "Under
                        behandling".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBatchApprove(2)}
                        disabled={batchApprove.isPending}
                      >
                        Bekreft
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Godkjenn ({selectedOrders.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Godkjenn ordre?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil godkjenne {selectedOrders.length} ordre(r) og sette dem til
                        status "Godkjent".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBatchApprove(3)}
                        disabled={batchApprove.isPending}
                      >
                        Godkjenn
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
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
                        <Badge variant="outline">Venter på godkjenning</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        {order.kunde && (
                          <p>Kunde: {order.kunde.kundenavn}</p>
                        )}
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
                        {order.informasjon && (
                          <p className="line-clamp-1">
                            Kommentar: {order.informasjon}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
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
                            <Button size="sm" variant="outline">
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Behandle
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Sett til under behandling?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Dette vil sette ordren til status "Under behandling".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproveOrder(order.ordreid, 2)}
                              >
                                Bekreft
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Godkjenn
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Godkjenn ordre?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Dette vil godkjenne ordren og sette den til status
                                "Godkjent".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproveOrder(order.ordreid, 3)}
                              >
                                Godkjenn
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
              <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ingen ordre å godkjenne</h2>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Ingen ordre matcher søket"
                  : "Alle ordre er behandlet"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
