"use client"

import { useState } from "react"
import Link from "next/link"
import { useProduksjonsList } from "@/hooks/useProduksjon"
import { Produksjon } from "@/lib/api/produksjon"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShoppingCart, Clock, CheckCircle, Send } from "lucide-react"
import { ErrorDisplay } from "@/components/error/error-display"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { useSession } from "next-auth/react"

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: "Utkast", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  submitted: { label: "Innsendt", icon: Send, color: "bg-blue-100 text-blue-800" },
  approved: { label: "Godkjent", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  rejected: { label: "Avvist", icon: Clock, color: "bg-red-100 text-red-800" },
  transferred: { label: "Overført", icon: CheckCircle, color: "bg-gray-100 text-gray-800" },
  produced: { label: "Produsert", icon: CheckCircle, color: "bg-gray-100 text-gray-800" },
}

function ProduksjonsbestillingPageContent() {
  const { data: session } = useSession()
  const [params] = useState({
    page: 1,
    page_size: 50,
    // Filter by current user's customer if available
    // kundeid: session?.user?.kundeid,
  })

  const { data, isLoading, error, refetch } = useProduksjonsList(params)

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mine produksjonsbestillinger</h1>
          <p className="text-muted-foreground">
            Fyll ut og send inn produksjonsbestillinger
          </p>
        </div>
        <ErrorDisplay error={error} onRetry={refetch} showRetry={true} size="md" />
      </div>
    )
  }

  const orders = data?.items || []
  const draftOrders = orders.filter(o => o.status === 'draft')
  const submittedOrders = orders.filter(o => o.status === 'submitted')
  const otherOrders = orders.filter(o => !['draft', 'submitted'].includes(o.status || ''))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mine produksjonsbestillinger</h1>
        <p className="text-muted-foreground">
          Fyll ut og send inn produksjonsbestillinger til sentralkjøkkenet
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Ingen bestillinger</h3>
            <p className="text-muted-foreground text-center mt-2">
              Du har ingen aktive produksjonsbestillinger akkurat nå.
              <br />
              Kontakt administrator hvis du forventer å se bestillinger her.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Draft orders - need action */}
          {draftOrders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Venter på utfylling ({draftOrders.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {draftOrders.map((order) => (
                  <OrderCard key={order.produksjonkode} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Submitted orders */}
          {submittedOrders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Innsendt - venter godkjenning ({submittedOrders.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {submittedOrders.map((order) => (
                  <OrderCard key={order.produksjonkode} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Other orders */}
          {otherOrders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                Tidligere bestillinger ({otherOrders.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {otherOrders.map((order) => (
                  <OrderCard key={order.produksjonkode} order={order} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: Produksjon }) {
  const status = statusConfig[order.status || 'draft']
  const StatusIcon = status.icon
  const isEditable = order.status === 'draft'

  return (
    <Card className={isEditable ? "border-yellow-300 bg-yellow-50/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {order.template?.template_navn || `Bestilling #${order.produksjonkode}`}
          </CardTitle>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        <CardDescription>
          Opprettet {order.created ? format(new Date(order.created), 'dd. MMMM yyyy', { locale: nb }) : "-"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm text-muted-foreground">
          {order.leveringsdato && (
            <p>Levering: {format(new Date(order.leveringsdato), 'dd. MMMM yyyy', { locale: nb })}</p>
          )}
          {order.detaljer && (
            <p>{order.detaljer.length} produkter</p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isEditable ? (
          <Button asChild className="w-full">
            <Link href={`/bestilling/produksjon/${order.produksjonkode}`}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Fyll ut bestilling
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild className="w-full">
            <Link href={`/bestilling/produksjon/${order.produksjonkode}`}>
              Se detaljer
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function ProduksjonsbestillingPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <ProduksjonsbestillingPageContent />
    </ErrorBoundary>
  )
}
