"use client"

import { useRouter } from "next/navigation"
import { OrderForm, OrderFormData } from "@/components/orders/order-form"
import { useCreateOrder } from "@/hooks/useOrders"
import { useToast } from "@/hooks/use-toast"

export default function NewOrderPage() {
  const router = useRouter()
  const createMutation = useCreateOrder()
  const { toast } = useToast()

  const handleSubmit = async (data: OrderFormData) => {
    try {
      const order = await createMutation.mutateAsync(data)
      toast({
        title: "Ordre opprettet",
        description: `Ordrenummer ${order.ordreid} er opprettet`,
      })
      router.push(`/orders/${order.ordreid}`)
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke opprette ordre",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ny ordre</h1>
        <p className="text-muted-foreground">
          Opprett en ny bestilling
        </p>
      </div>

      <div className="max-w-2xl">
        <OrderForm 
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  )
}