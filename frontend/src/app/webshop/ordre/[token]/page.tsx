"use client"

import { use, useState } from "react"
import { useWebshopOrderByToken } from "@/hooks/useWebshop"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Package, CheckCircle, ThumbsUp } from "lucide-react"
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
import { Order } from "@/types/models"

// Status mapping based on tblordrestatus
const getOrderStatus = (order: Order) => {
  if (order.kansellertdato || order.ordrestatusid === 99) {
    return { label: "Kansellert", variant: "destructive" as const }
  }
  if (order.ordrestatusid === 98) {
    return { label: "For sen kansellering", variant: "destructive" as const }
  }
  if (order.ordrestatusid === 95) {
    return { label: "Kreditert", variant: "outline" as const }
  }
  if (order.ordrestatusid === 90) {
    return { label: "Sendt til regnskap", variant: "default" as const }
  }
  if (order.ordrestatusid === 85) {
    return { label: "Fakturert", variant: "default" as const }
  }
  if (order.ordrestatusid === 80) {
    return { label: "Godkjent av mottaker", variant: "default" as const }
  }
  if (order.ordrestatusid === 35) {
    return { label: "Pakkliste skrevet - Klar for levering", variant: "secondary" as const }
  }
  if (order.ordrestatusid === 30) {
    return { label: "Plukket", variant: "secondary" as const }
  }
  if (order.ordrestatusid === 25) {
    return { label: "Plukkliste skrevet", variant: "secondary" as const }
  }
  if (order.ordrestatusid === 20) {
    return { label: "Godkjent", variant: "default" as const }
  }
  if (order.ordrestatusid === 15) {
    return { label: "Bestilt - Venter på godkjenning", variant: "outline" as const }
  }
  if (order.ordrestatusid === 10) {
    return { label: "Startet", variant: "outline" as const }
  }
  return { label: "Ukjent", variant: "outline" as const }
}

// Hook for confirming receipt
function useConfirmReceipt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await apiClient.post(`/v1/webshop/ordre/token/${token}/bekreft`)
      return response.data
    },
    onSuccess: (data, token) => {
      queryClient.invalidateQueries({ queryKey: ["webshop", "order-by-token", token] })
      toast({
        title: "Mottak bekreftet",
        description: "Takk for bekreftelsen!",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Feil",
        description: error.response?.data?.detail || "Kunne ikke bekrefte mottak",
        variant: "destructive",
      })
    },
  })
}

export default function OrderByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const { toast } = useToast()

  const { data, isLoading, error } = useWebshopOrderByToken(token)
  const confirmReceipt = useConfirmReceipt()

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
                      {ordrelinjer
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

        {/* Confirm Receipt Button - Only show for status 35 (Pakkliste skrevet) */}
        {ordre.ordrestatusid === 35 && !token_utlopt && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Bekreft mottak</h3>
                  <p className="text-sm text-muted-foreground">
                    Har du mottatt leveransen? Bekreft mottak for å fullføre ordren.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="lg" className="bg-green-600 hover:bg-green-700">
                      <ThumbsUp className="mr-2 h-5 w-5" />
                      Bekreft mottak
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bekreft mottak av ordre</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ved å bekrefte mottak bekrefter du at du har mottatt varene
                        i henhold til ordren. Dette kan ikke angres.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => confirmReceipt.mutate(token)}
                        disabled={confirmReceipt.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {confirmReceipt.isPending ? "Bekrefter..." : "Bekreft mottak"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Information */}
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Ordrestatus:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {ordre.ordrestatusid === 15 && (
                  <>
                    <li>Ordren venter på godkjenning fra administrator</li>
                    <li>Du vil bli varslet når ordren er behandlet</li>
                  </>
                )}
                {ordre.ordrestatusid === 20 && (
                  <>
                    <li>Ordren er godkjent</li>
                    <li>Produktene klargjøres for plukking</li>
                  </>
                )}
                {ordre.ordrestatusid === 25 && (
                  <>
                    <li>Plukkliste er generert</li>
                    <li>Produktene blir nå plukket</li>
                  </>
                )}
                {ordre.ordrestatusid === 30 && (
                  <>
                    <li>Produktene er plukket</li>
                    <li>Pakkliste genereres</li>
                  </>
                )}
                {ordre.ordrestatusid === 35 && (
                  <>
                    <li>Ordren er klar for levering</li>
                    <li>Bekreft mottak når du har mottatt varene</li>
                  </>
                )}
                {ordre.ordrestatusid === 80 && (
                  <>
                    <li>Mottak er bekreftet</li>
                    <li>Takk for handelen!</li>
                  </>
                )}
                {ordre.ordrestatusid >= 85 && ordre.ordrestatusid < 95 && (
                  <li>Ordren er fakturert</li>
                )}
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
