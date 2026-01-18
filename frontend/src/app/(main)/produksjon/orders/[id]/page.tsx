"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useProduksjon, useApproveProduksjon, useTransferToOrder } from "@/hooks/useProduksjon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle, XCircle, ArrowRightCircle, Loader2, ExternalLink } from "lucide-react"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { ErrorDisplay } from "@/components/error/error-display"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { useSession } from "next-auth/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Utkast", variant: "secondary" },
  submitted: { label: "Innsendt", variant: "default" },
  approved: { label: "Godkjent", variant: "default" },
  rejected: { label: "Avvist", variant: "destructive" },
  transferred: { label: "Overført", variant: "outline" },
  produced: { label: "Produsert", variant: "outline" },
}

function OrderDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const orderId = Number(params.id)

  const { data: order, isLoading, error, refetch } = useProduksjon(orderId)
  const approveMutation = useApproveProduksjon()
  const transferMutation = useTransferToOrder()

  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        produksjonskode_list: [orderId],
        godkjent_av: session?.user?.id || 1,
      })
      setApproveDialogOpen(false)
      refetch()
    } catch (error) {
      // Error handled in hook
    }
  }

  const handleTransfer = async () => {
    try {
      const result = await transferMutation.mutateAsync({ id: orderId })
      setTransferDialogOpen(false)
      refetch()
    } catch (error) {
      // Error handled in hook
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/produksjon/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Produksjonsordre</h1>
        </div>
        <ErrorDisplay error={error} onRetry={refetch} showRetry={true} />
      </div>
    )
  }

  if (!order) {
    return null
  }

  const status = statusLabels[order.status || 'draft'] || { label: order.status, variant: "secondary" as const }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/produksjon/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Produksjonsordre #{order.produksjonkode}
            </h1>
            <p className="text-muted-foreground">
              {order.kunde?.kundenavn || `Kunde #${order.kundeid}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={status.variant} className="text-lg px-4 py-1">
            {status.label}
          </Badge>

          {order.status === 'submitted' && (
            <Button onClick={() => setApproveDialogOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Godkjenn
            </Button>
          )}

          {order.status === 'approved' && !order.ordre_id && (
            <Button onClick={() => setTransferDialogOpen(true)}>
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              Overfør til ordre
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ordreinformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kunde</p>
                <p className="font-medium">{order.kunde?.kundenavn || `Kunde #${order.kundeid}`}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Template</p>
                <p className="font-medium">{order.template?.template_navn || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opprettet</p>
                <p className="font-medium">
                  {order.created ? format(new Date(order.created), 'dd.MM.yyyy HH:mm', { locale: nb }) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Innsendt</p>
                <p className="font-medium">
                  {order.innsendt_dato ? format(new Date(order.innsendt_dato), 'dd.MM.yyyy HH:mm', { locale: nb }) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Godkjent</p>
                <p className="font-medium">
                  {order.godkjent_dato ? format(new Date(order.godkjent_dato), 'dd.MM.yyyy HH:mm', { locale: nb }) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leveringsdato</p>
                <p className="font-medium">
                  {order.leveringsdato ? format(new Date(order.leveringsdato), 'dd.MM.yyyy', { locale: nb }) : "-"}
                </p>
              </div>
            </div>

            {order.merknad && (
              <div>
                <p className="text-sm text-muted-foreground">Merknad</p>
                <p className="font-medium">{order.merknad}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {order.ordre_id && (
          <Card>
            <CardHeader>
              <CardTitle>Overført til ordre</CardTitle>
              <CardDescription>
                Produksjonsordren er overført til ordresystemet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ordre ID</p>
                  <p className="font-medium">
                    <Link href={`/orders/${order.ordre_id}`} className="text-primary hover:underline flex items-center gap-1">
                      #{order.ordre_id}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overført dato</p>
                  <p className="font-medium">
                    {order.overfort_dato ? format(new Date(order.overfort_dato), 'dd.MM.yyyy HH:mm', { locale: nb }) : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produkter</CardTitle>
          <CardDescription>
            {(order.detaljer || []).length} produkter i bestillingen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(order.detaljer || []).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ingen produkter i bestillingen
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Antall</TableHead>
                  <TableHead className="text-right">Enhet</TableHead>
                  <TableHead className="text-right">Pris</TableHead>
                  <TableHead>Kommentar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.detaljer || []).map((detalj, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {detalj.produktnavn || detalj.produkt?.produktnavn || `Produkt #${detalj.produktid}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {detalj.antallporsjoner || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {detalj.enh || detalj.visningsenhet || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {detalj.pris ? `kr ${detalj.pris.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {detalj.kommentar || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen} modal={false}>
        <DialogContent onPointerDownOutside={() => setApproveDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Godkjenn produksjonsordre</DialogTitle>
            <DialogDescription>
              Du er i ferd med å godkjenne produksjonsordre #{orderId} fra {order.kunde?.kundenavn}.
              Dette vil endre status til "Godkjent".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Godkjenner..." : "Godkjenn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} modal={false}>
        <DialogContent onPointerDownOutside={() => setTransferDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Overfør til ordre</DialogTitle>
            <DialogDescription>
              Overfør produksjonsordre #{orderId} til ordresystemet.
              Dette vil opprette en ny ordre for kunde "{order.kunde?.kundenavn}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "Overfører..." : "Overfør til ordre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <OrderDetailPageContent />
    </ErrorBoundary>
  )
}
