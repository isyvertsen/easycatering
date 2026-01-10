"use client"

import { use } from "react"
import Link from "next/link"
import { useWebshopOrder, useWebshopOrderLines } from "@/hooks/useWebshop"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package } from "lucide-react"
import { Order } from "@/types/models"

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

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const orderId = parseInt(id)

  const { data: order, isLoading: orderLoading, error: orderError } = useWebshopOrder(orderId)
  const { data: orderLines, isLoading: linesLoading } = useWebshopOrderLines(orderId)

  if (orderLoading || linesLoading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <p className="text-center text-muted-foreground">Laster ordredetaljer...</p>
      </div>
    )
  }

  if (orderError || !order) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">
                Kunne ikke laste ordre. Ordren finnes ikke eller du har ikke tilgang.
              </p>
              <Button asChild>
                <Link href="/webshop/mine-ordre">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Tilbake til mine bestillinger
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = getOrderStatus(order)

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/webshop/mine-ordre"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til mine bestillinger
        </Link>
      </div>

      <div className="space-y-6">
        {/* Order Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Ordre #{order.ordreid}</CardTitle>
              <Badge variant={status.variant} className="text-sm">
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {order.ordredato && (
                <div>
                  <p className="text-sm text-muted-foreground">Bestilt dato</p>
                  <p className="font-medium">
                    {format(new Date(order.ordredato), "dd. MMMM yyyy 'kl.' HH:mm", {
                      locale: nb,
                    })}
                  </p>
                </div>
              )}
              {order.leveringsdato && (
                <div>
                  <p className="text-sm text-muted-foreground">Ønsket leveringsdato</p>
                  <p className="font-medium">
                    {format(new Date(order.leveringsdato), "dd. MMMM yyyy", {
                      locale: nb,
                    })}
                  </p>
                </div>
              )}
            </div>

            {order.informasjon && (
              <div>
                <p className="text-sm text-muted-foreground">Kommentar</p>
                <p className="font-medium">{order.informasjon}</p>
              </div>
            )}

            {order.kunde && (
              <div>
                <p className="text-sm text-muted-foreground">Kunde</p>
                <p className="font-medium">{order.kunde.kundenavn}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Produkter</CardTitle>
          </CardHeader>
          <CardContent>
            {!orderLines || orderLines.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Ingen produkter i ordren</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orderLines.map((line) => (
                  <div
                    key={line.unik}
                    className="flex justify-between items-start pb-4 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {line.produkt?.visningsnavn || line.produkt?.produktnavn || "Ukjent produkt"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {line.pris?.toFixed(2) || "0.00"} kr × {line.antall || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {((line.pris || 0) * (line.antall || 0)).toFixed(2)} kr
                      </p>
                      {line.rabatt && line.rabatt > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Rabatt: {line.rabatt}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Totalt:</span>
                    <span>
                      {orderLines
                        .reduce(
                          (sum, line) => sum + (line.pris || 0) * (line.antall || 0),
                          0
                        )
                        .toFixed(2)}{" "}
                      kr
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Ordrestatus:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {order.ordrestatusid === 1 && (
                  <>
                    <li>Ordren venter på godkjenning fra administrator</li>
                    <li>Du vil bli varslet når ordren er behandlet</li>
                  </>
                )}
                {order.ordrestatusid === 2 && (
                  <>
                    <li>Ordren er under behandling</li>
                    <li>Administrator gjennomgår bestillingen</li>
                  </>
                )}
                {order.ordrestatusid === 3 && (
                  <>
                    <li>Ordren er godkjent</li>
                    <li>Produktene klargjøres for levering</li>
                  </>
                )}
                {order.ordrelevert && <li>Ordren er levert</li>}
                {order.kansellertdato && (
                  <li>
                    Ordren ble kansellert{" "}
                    {format(new Date(order.kansellertdato), "dd. MMMM yyyy", {
                      locale: nb,
                    })}
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
