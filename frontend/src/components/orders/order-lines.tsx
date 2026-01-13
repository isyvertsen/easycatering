"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { OrderLine } from "@/types/models"
import { useOrderLines, useAddOrderLine, useUpdateOrderLine, useDeleteOrderLine } from "@/hooks/useOrders"
import { useProducts } from "@/hooks/useProducts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

const orderLineSchema = z.object({
  produktid: z.coerce.number().min(1, "Produkt er påkrevd"),
  antall: z.coerce.number().min(1, "Antall må være minst 1"),
  pris: z.coerce.number().optional(),
  rabatt: z.coerce.number().optional(),
  levdato: z.string().optional(),
  ident: z.string().optional(),
})

type OrderLineFormData = z.infer<typeof orderLineSchema>

interface OrderLinesProps {
  orderId: number
  readOnly?: boolean
}

export function OrderLines({ orderId, readOnly = false }: OrderLinesProps) {
  const { data: orderLines, isLoading } = useOrderLines(orderId)
  const { data: products } = useProducts({ skip: 0, limit: 1000, aktiv: true })
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<OrderLine | null>(null)
  const { toast } = useToast()
  
  const addMutation = useAddOrderLine()
  const updateMutation = useUpdateOrderLine()
  const deleteMutation = useDeleteOrderLine()

  const form = useForm<OrderLineFormData>({
    resolver: zodResolver(orderLineSchema),
    defaultValues: {
      produktid: 0,
      antall: 1,
      pris: undefined,
      rabatt: 0,
      levdato: "",
      ident: "",
    },
  })

  const handleAdd = async (data: OrderLineFormData) => {
    try {
      await addMutation.mutateAsync({ orderId, data })
      setIsAddOpen(false)
      form.reset()
      toast({
        title: "Ordrelinje lagt til",
        description: "Produktet ble lagt til ordren",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke legge til ordrelinje",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async (data: OrderLineFormData) => {
    if (!editingLine) return
    
    try {
      await updateMutation.mutateAsync({ 
        orderId, 
        lineId: editingLine.unik, 
        data 
      })
      setEditingLine(null)
      form.reset()
      toast({
        title: "Ordrelinje oppdatert",
        description: "Ordrelinjen ble oppdatert",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere ordrelinje",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (lineId: number) => {
    try {
      await deleteMutation.mutateAsync({ orderId, lineId })
      toast({
        title: "Ordrelinje slettet",
        description: "Produktet ble fjernet fra ordren",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke slette ordrelinje",
        variant: "destructive",
      })
    }
  }

  const calculateTotal = () => {
    if (!orderLines) return 0
    
    return orderLines.reduce((total, line) => {
      const lineTotal = (line.pris || 0) * (line.antall || 0)
      const discount = lineTotal * ((line.rabatt || 0) / 100)
      return total + (lineTotal - discount)
    }, 0)
  }

  if (isLoading) {
    return <div>Laster ordrelinjer...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ordrelinjer</CardTitle>
            <CardDescription>
              Produkter i denne ordren
            </CardDescription>
          </div>
          {!readOnly && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Legg til produkt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Legg til produkt</DialogTitle>
                  <DialogDescription>
                    Velg produkt og angi antall
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="produktid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produkt</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(parseInt(value))
                              // Auto-fill price from product
                              const product = products?.find(p => p.produktid === parseInt(value))
                              if (product?.pris) {
                                form.setValue('pris', product.pris)
                              }
                            }}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Velg produkt" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem
                                  key={product.produktid}
                                  value={product.produktid.toString()}
                                >
                                  {product.produktnavn} ({product.pris ? `kr ${product.pris}` : 'Ingen pris'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="antall"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Antall</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pris"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pris</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                {...field} 
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="rabatt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rabatt (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="levdato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leveringsdato (valgfri)</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                        Avbryt
                      </Button>
                      <Button type="submit">Legg til</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produkt</TableHead>
              <TableHead className="text-right">Antall</TableHead>
              <TableHead className="text-right">Pris</TableHead>
              <TableHead className="text-right">Rabatt</TableHead>
              <TableHead className="text-right">Sum</TableHead>
              {!readOnly && <TableHead className="w-[100px]">Handlinger</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderLines?.map((line) => {
              const lineTotal = (line.pris || 0) * (line.antall || 0)
              const discount = lineTotal * ((line.rabatt || 0) / 100)
              const sum = lineTotal - discount
              
              return (
                <TableRow key={line.unik}>
                  <TableCell className="capitalize">{(line.produkt?.produktnavn || `Produkt ${line.produktid}`).toLowerCase()}</TableCell>
                  <TableCell className="text-right">{line.antall}</TableCell>
                  <TableCell className="text-right">kr {line.pris?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell className="text-right">{line.rabatt || 0}%</TableCell>
                  <TableCell className="text-right font-semibold">kr {sum.toFixed(2)}</TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingLine(line)
                            form.reset({
                              produktid: line.produktid,
                              antall: line.antall || 1,
                              pris: line.pris,
                              rabatt: line.rabatt || 0,
                              levdato: line.levdato ? format(new Date(line.levdato), 'yyyy-MM-dd') : "",
                              ident: line.ident || "",
                            })
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(line.unik)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
            {(!orderLines || orderLines.length === 0) && (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="text-center text-muted-foreground">
                  Ingen produkter lagt til
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {orderLines && orderLines.length > 0 && (
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-semibold">
                  Totalt:
                </TableCell>
                <TableCell className="text-right font-bold">
                  kr {calculateTotal().toFixed(2)}
                </TableCell>
                {!readOnly && <TableCell />}
              </TableRow>
            </TableBody>
          )}
        </Table>
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editingLine} onOpenChange={(open) => !open && setEditingLine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger ordrelinje</DialogTitle>
            <DialogDescription>
              Oppdater antall og pris for produktet
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="antall"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Antall</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pris"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pris</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rabatt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rabatt (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setEditingLine(null)}>
                  Avbryt
                </Button>
                <Button type="submit">Oppdater</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}