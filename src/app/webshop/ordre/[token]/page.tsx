"use client"

import { use } from "react"
import { useWebshopOrderByToken } from "@/hooks/useWebshop"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Package, CheckCircle } from "lucide-react"
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

export default function OrderByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)

  const { data, isLoading, error } = useWebshopOrderByToken(token)

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <p className="text-center text-muted-foreground">Laster ordre...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ugyldig eller utløpt lenke</AlertTitle>
          <AlertDescription>
            Denne lenken er enten ugyldig eller har utløpt (maks 14 dager gyldig).
            Vennligst logg inn for å se ordren under "Mine bestillinger".
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { ordre, ordrelinjer, token_utlopt, token_utloper } = data
  const status = getOrderStatus(ordre)

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Token Warning */}
      {token_utlopt && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lenken har utløpt</AlertTitle>
          <AlertDescription>
            Denne lenken er ikke lenger gyldig. Vennligst logg inn for å se ordren.
          </AlertDescription>
        </Alert>
      )}

      {!token_utlopt && token_utloper && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>E-postbekreftelse</AlertTitle>
          <AlertDescription>
            Denne lenken er gyldig til{" "}
            {format(new Date(token_utloper), "dd. MMMM yyyy 'kl.' HH:mm", {
              locale: nb,
            })}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Order Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Ordre #{ordre.ordreid}</CardTitle>
              <Badge variant={status.variant} className="text-sm">
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {ordre.ordredato && (
                <div>
                  <p className="text-sm text-muted-foreground">Bestilt dato</p>
                  <p className="font-medium">
                    {format(new Date(ordre.ordredato), "dd. MMMM yyyy 'kl.' HH:mm", {
                      locale: nb,
                    })}
                  </p>
                </div>
              )}
              {ordre.leveringsdato && (
                <div>
                  <p className="text-sm text-muted-foreground">Ønsket leveringsdato</p>
                  <p className="font-medium">
                    {format(new Date(ordre.leveringsdato), "dd. MMMM yyyy", {
                      locale: nb,
                    })}
                  </p>
                </div>
              )}
            </div>

            {ordre.informasjon && (
              <div>
                <p className="text-sm text-muted-foreground">Kommentar</p>
                <p className="font-medium">{ordre.informasjon}</p>
              </div>
            )}

            {ordre.kunde && (
              <div>
                <p className="text-sm text-muted-foreground">Kunde</p>
                <p className="font-medium">{ordre.kunde.kundenavn}</p>
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
            {!ordrelinjer || ordrelinjer.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Ingen produkter i ordren</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ordrelinjer.map((line) => (
                  <div
                    key={line.ordredetaljeid}
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
                      {ordre.totalpris
                        ? ordre.totalpris.toFixed(2)
                        : ordrelinjer
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
                {ordre.ordrestatusid === 1 && (
                  <>
                    <li>Ordren venter på godkjenning fra administrator</li>
                    <li>Du vil bli varslet når ordren er behandlet</li>
                  </>
                )}
                {ordre.ordrestatusid === 2 && (
                  <>
                    <li>Ordren er under behandling</li>
                    <li>Administrator gjennomgår bestillingen</li>
                  </>
                )}
                {ordre.ordrestatusid === 3 && (
                  <>
                    <li>Ordren er godkjent</li>
                    <li>Produktene klargjøres for levering</li>
                  </>
                )}
                {ordre.ordrelevert && <li>Ordren er levert</li>}
                {ordre.kansellertdato && (
                  <li>
                    Ordren ble kansellert{" "}
                    {format(new Date(ordre.kansellertdato), "dd. MMMM yyyy", {
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
