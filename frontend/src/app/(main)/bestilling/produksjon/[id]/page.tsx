"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useProduksjon, useSubmitProduksjon } from "@/hooks/useProduksjon"
import { ProduksjonsDetalj } from "@/lib/api/produksjon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, ShoppingCart, Send, CheckCircle, Package, AlertCircle } from "lucide-react"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { ErrorDisplay } from "@/components/error/error-display"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-yellow-100 text-yellow-800" },
  submitted: { label: "Innsendt", color: "bg-blue-100 text-blue-800" },
  approved: { label: "Godkjent", color: "bg-green-100 text-green-800" },
  rejected: { label: "Avvist", color: "bg-red-100 text-red-800" },
  transferred: { label: "Overført", color: "bg-gray-100 text-gray-800" },
  produced: { label: "Produsert", color: "bg-gray-100 text-gray-800" },
}

function WebshopPageContent() {
  const params = useParams()
  const router = useRouter()
  const orderId = Number(params.id)

  const { data: order, isLoading, error, refetch } = useProduksjon(orderId)
  const submitMutation = useSubmitProduksjon()

  const [localDetaljer, setLocalDetaljer] = useState<ProduksjonsDetalj[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)

  useEffect(() => {
    if (order?.detaljer) {
      setLocalDetaljer(order.detaljer)
    }
  }, [order])

  const isEditable = order?.status === 'draft'

  const handleQuantityChange = (index: number, value: number) => {
    if (!isEditable) return

    setLocalDetaljer(prev =>
      prev.map((d, i) =>
        i === index ? { ...d, antallporsjoner: value } : d
      )
    )
  }

  const handleCommentChange = (index: number, value: string) => {
    if (!isEditable) return

    setLocalDetaljer(prev =>
      prev.map((d, i) =>
        i === index ? { ...d, kommentar: value } : d
      )
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await apiClient.put(`/v1/produksjon/orders/${orderId}/details`, {
        detaljer: localDetaljer.map(d => ({
          produktid: d.produktid,
          antallporsjoner: d.antallporsjoner,
          kommentar: d.kommentar,
        }))
      })
      toast({
        title: "Lagret",
        description: "Bestillingen er lagret",
      })
      refetch()
    } catch (err) {
      toast({
        title: "Feil",
        description: "Kunne ikke lagre bestilling",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    try {
      // First save
      await handleSave()

      // Then submit
      await submitMutation.mutateAsync(orderId)
      setSubmitDialogOpen(false)
      router.push('/bestilling/produksjon')
    } catch (err) {
      // Error handled in hook
    }
  }

  const filledCount = localDetaljer.filter(d => (d.antallporsjoner || 0) > 0).length
  const totalCount = localDetaljer.length
  const progress = totalCount > 0 ? (filledCount / totalCount) * 100 : 0

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
            <Link href="/bestilling/produksjon">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Produksjonsbestilling</h1>
        </div>
        <ErrorDisplay error={error} onRetry={refetch} showRetry={true} />
      </div>
    )
  }

  if (!order) {
    return null
  }

  const status = statusConfig[order.status || 'draft']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/bestilling/produksjon">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {order.template?.template_navn || `Bestilling #${order.produksjonkode}`}
            </h1>
            <p className="text-muted-foreground">
              {order.kunde?.kundenavn}
            </p>
          </div>
        </div>
        <Badge className={status.color}>
          {status.label}
        </Badge>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Utfylling</span>
              <span>{filledCount} av {totalCount} produkter</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Product list */}
      <div className="space-y-4">
        {localDetaljer.map((detalj, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {detalj.produktnavn || detalj.produkt?.produktnavn || `Produkt #${detalj.produktid}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {detalj.enh || detalj.visningsenhet || "stk"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {isEditable ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(index, Math.max(0, (detalj.antallporsjoner || 0) - 1))}
                          disabled={!isEditable}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          className="w-20 text-center"
                          value={detalj.antallporsjoner || 0}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                          disabled={!isEditable}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(index, (detalj.antallporsjoner || 0) + 1)}
                          disabled={!isEditable}
                        >
                          +
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-lg font-semibold">
                      {detalj.antallporsjoner || 0} {detalj.enh || "stk"}
                    </div>
                  )}
                </div>
              </div>

              {isEditable && (
                <div className="mt-4">
                  <Textarea
                    placeholder="Kommentar (valgfritt)"
                    value={detalj.kommentar || ""}
                    onChange={(e) => handleCommentChange(index, e.target.value)}
                    className="h-16"
                  />
                </div>
              )}

              {!isEditable && detalj.kommentar && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">{detalj.kommentar}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action buttons */}
      {isEditable && (
        <Card className="sticky bottom-4 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {filledCount === 0 ? (
                  <span className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    Fyll ut minst ett produkt
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {filledCount} produkt(er) fylt ut
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Lagrer...
                    </>
                  ) : (
                    "Lagre utkast"
                  )}
                </Button>
                <Button
                  onClick={() => setSubmitDialogOpen(true)}
                  disabled={filledCount === 0 || isSaving}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send inn bestilling
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit confirmation dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen} modal={false}>
        <DialogContent onPointerDownOutside={() => setSubmitDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Send inn bestilling</DialogTitle>
            <DialogDescription>
              Du er i ferd med å sende inn bestillingen med {filledCount} produkt(er).
              Etter innsending kan du ikke endre bestillingen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Sender..." : "Send inn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WebshopPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <WebshopPageContent />
    </ErrorBoundary>
  )
}
