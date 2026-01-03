"use client"

import { useRouter } from "next/navigation"
import { use } from "react"
import { OrderForm, OrderFormData } from "@/components/orders/order-form"
import { OrderLines } from "@/components/orders/order-lines"
import { useOrder, useUpdateOrder, useCancelOrder } from "@/hooks/useOrders"
import { Order } from "@/types/models"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { reportsApi } from "@/lib/api/reports"
import { Download, FileText, Truck } from "lucide-react"

interface OrderEditPageProps {
  params: Promise<{ id: string }>
}

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
    return { label: "Ny", variant: "outline" as const }
  }
  if (order.ordrestatusid === 2) {
    return { label: "Under behandling", variant: "secondary" as const }
  }
  if (order.ordrestatusid === 3) {
    return { label: "Godkjent", variant: "default" as const }
  }
  return { label: "Ukjent", variant: "outline" as const }
}

export default function OrderEditPage({ params }: OrderEditPageProps) {
  const router = useRouter()
  const { id } = use(params)
  const { toast } = useToast()
  
  const { data: order, isLoading } = useOrder(Number(id))
  const updateMutation = useUpdateOrder()
  const cancelMutation = useCancelOrder()

  const handleSubmit = async (data: OrderFormData) => {
    try {
      await updateMutation.mutateAsync({ 
        id: Number(id), 
        data
      })
      toast({
        title: "Ordre oppdatert",
        description: "Ordren ble oppdatert",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere ordre",
        variant: "destructive",
      })
    }
  }

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(Number(id))
      toast({
        title: "Ordre kansellert",
        description: "Ordren ble kansellert",
      })
      router.push('/orders')
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke kansellere ordre",
        variant: "destructive",
      })
    }
  }

  const handleDownloadOrderConfirmation = async () => {
    try {
      await reportsApi.downloadOrderConfirmation(Number(id))
      toast({
        title: "Lykkes",
        description: "Ordrebekreftelse lastet ned",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke laste ned ordrebekreftelse",
        variant: "destructive",
      })
    }
  }

  const handleDownloadDeliveryNote = async () => {
    try {
      await reportsApi.downloadDeliveryNote(Number(id))
      toast({
        title: "Lykkes",
        description: "Leveringsseddel lastet ned",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke laste ned leveringsseddel",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Laster ordre...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Ordre ikke funnet</p>
      </div>
    )
  }

  const status = getOrderStatus(order)
  const isCancelled = !!order.kansellertdato
  const isDelivered = !!order.ordrelevert

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ordre #{order.ordreid}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground">
              {order.kundenavn || 'Ukjent kunde'}
              {order.kundegruppenavn && ` - ${order.kundegruppenavn}`}
            </p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
        
        {!isCancelled && !isDelivered && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Kanseller ordre
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dette vil kansellere ordren. Handlingen kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                  Kanseller ordre
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ordreinformasjon</CardTitle>
              <CardDescription>
                Generell informasjon om ordren
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderForm 
                order={order}
                onSubmit={handleSubmit}
                isLoading={updateMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <OrderLines 
            orderId={Number(id)} 
            readOnly={isCancelled || isDelivered}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Rapporter</CardTitle>
              <CardDescription>
                Last ned ordredokumenter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={handleDownloadOrderConfirmation}
                variant="outline"
                className="w-full justify-start"
              >
                <FileText className="mr-2 h-4 w-4" />
                Last ned ordrebekreftelse (PDF)
              </Button>
              <Button
                onClick={handleDownloadDeliveryNote}
                variant="outline"
                className="w-full justify-start"
              >
                <Truck className="mr-2 h-4 w-4" />
                Last ned leveringsseddel (PDF)
              </Button>
            </CardContent>
          </Card>

          {(order.ordredato || order.leveringsdato || order.fakturadato) && (
            <Card>
              <CardHeader>
                <CardTitle>Viktige datoer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.ordredato && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ordredato:</span>
                    <span>{format(new Date(order.ordredato), 'dd.MM.yyyy')}</span>
                  </div>
                )}
                {order.leveringsdato && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leveringsdato:</span>
                    <span>{format(new Date(order.leveringsdato), 'dd.MM.yyyy')}</span>
                  </div>
                )}
                {order.fakturadato && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fakturadato:</span>
                    <span>{format(new Date(order.fakturadato), 'dd.MM.yyyy')}</span>
                  </div>
                )}
                {order.kansellertdato && (
                  <div className="flex justify-between text-destructive">
                    <span>Kansellert:</span>
                    <span>{format(new Date(order.kansellertdato), 'dd.MM.yyyy')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}