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
    } catch (error: any) {
      console.error("Failed to create order:", error)

      // Extract error message from API response
      let errorMessage = "Kunne ikke opprette ordre"

      if (error.response?.data?.detail) {
        // FastAPI error format
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        } else if (Array.isArray(error.response.data.detail)) {
          // Validation errors
          errorMessage = error.response.data.detail
            .map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`)
            .join(', ')
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Feil ved opprettelse av ordre",
        description: errorMessage,
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