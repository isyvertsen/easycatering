"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Order } from "@/types/models"
import { useCustomersList } from "@/hooks/useCustomers"
import { format } from "date-fns"

const orderSchema = z.object({
  kundeid: z.coerce.number().min(1, "Kunde er påkrevd"),
  ordredato: z.string().optional(),
  leveringsdato: z.string().optional(),
  sendestil: z.string().optional(),
  betalingsmate: z.coerce.number().optional(),
  informasjon: z.string().optional(),
})

export type OrderFormData = z.infer<typeof orderSchema>

interface OrderFormProps {
  order?: Order
  onSubmit: (data: OrderFormData) => Promise<void>
  isLoading?: boolean
}

export function OrderForm({ order, onSubmit, isLoading }: OrderFormProps) {
  const { data: customers } = useCustomersList({ limit: 1000 })

  // Sorter kunder alfabetisk etter navn
  const sortedCustomers = useMemo(() => {
    if (!customers?.items) return []
    return [...customers.items].sort((a, b) =>
      a.kundenavn.localeCompare(b.kundenavn, 'no')
    )
  }, [customers?.items])

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      kundeid: order?.kundeid || 0,
      ordredato: order?.ordredato ? format(new Date(order.ordredato), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      leveringsdato: order?.leveringsdato ? format(new Date(order.leveringsdato), 'yyyy-MM-dd') : "",
      sendestil: order?.sendestil || "",
      betalingsmate: order?.betalingsmate || 1,
      informasjon: order?.informasjon || "",
    },
  })

  const handleSubmit = async (data: OrderFormData) => {
    try {
      console.log("Submitting order with data:", data)
      await onSubmit(data)
    } catch (error) {
      console.error("Failed to submit order:", error)
      // Re-throw to let parent handle
      throw error
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="kundeid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kunde</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
                disabled={!!order}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg kunde" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sortedCustomers.map((customer) => (
                    <SelectItem
                      key={customer.kundeid}
                      value={customer.kundeid.toString()}
                    >
                      {customer.kundenavn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {order ? "Kunde kan ikke endres etter opprettelse" : "Velg kunde for ordren"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ordredato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordredato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="leveringsdato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leveringsdato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="sendestil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leveringsadresse</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Leveringsadresse (hvis annen enn kundens adresse)" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                La stå tom for å bruke kundens registrerte adresse
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="betalingsmate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Betalingsmåte</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">Faktura</SelectItem>
                  <SelectItem value="2">Kontant</SelectItem>
                  <SelectItem value="3">Kort</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="informasjon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Informasjon</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tilleggsinformasjon om ordren..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Intern informasjon eller spesielle instruksjoner
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Lagrer..." : order ? "Oppdater" : "Opprett"}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Avbryt
          </Button>
        </div>
      </form>
    </Form>
  )
}