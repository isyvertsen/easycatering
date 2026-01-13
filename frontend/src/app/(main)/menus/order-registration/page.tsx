"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useCustomersList } from "@/hooks/useCustomers"
import { useGenerateMenuOrderForm, useCreateOrderFromMenuForm } from "@/hooks/useMenus"
import { CheckCircle, Save, Upload, FileText } from "lucide-react"
import { MenuPrintData } from "@/lib/api/menus"

export default function OrderRegistrationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null)
  const [startWeek, setStartWeek] = useState(getCurrentWeek())
  const [menuData, setMenuData] = useState<MenuPrintData | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const { data: customers } = useCustomersList({ limit: 1000, aktiv: true })
  const generateMenuMutation = useGenerateMenuOrderForm()
  const createOrderMutation = useCreateOrderFromMenuForm()

  const handleLoadTemplate = () => {
    if (!selectedCustomer) {
      toast({
        title: "Feil",
        description: "Vennligst velg en kunde først",
        variant: "destructive"
      })
      return
    }

    generateMenuMutation.mutate(
      { customerId: selectedCustomer, startWeek, numberOfWeeks: 4 },
      {
        onSuccess: (data) => {
          setMenuData(data)
          toast({
            title: "Mal lastet",
            description: `Registrer antall for ${data.customerName}`,
          })
          // Focus first input
          setTimeout(() => {
            const firstInput = document.querySelector('input[data-product-input]') as HTMLInputElement
            if (firstInput) {
              firstInput.focus()
              firstInput.select()
            }
          }, 100)
        },
        onError: () => {
          toast({
            title: "Feil",
            description: "Kunne ikke laste mal",
            variant: "destructive"
          })
        }
      }
    )
  }

  const handleQuantityChange = (weekIndex: number, itemIndex: number, value: string) => {
    if (!menuData) return
    
    const newMenuData = { ...menuData }
    const quantity = parseInt(value) || 0
    newMenuData.weeks[weekIndex].items[itemIndex].quantity = quantity
    setMenuData(newMenuData)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, weekIndex: number, itemIndex: number) => {
    const totalItems = menuData?.weeks[weekIndex].items.length || 0
    
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      // Move to next item in same week
      if (itemIndex < totalItems - 1) {
        const nextInput = document.querySelector(
          `input[data-week="${weekIndex}"][data-item="${itemIndex + 1}"]`
        ) as HTMLInputElement
        if (nextInput) {
          nextInput.focus()
          nextInput.select()
        }
      } else if (weekIndex < (menuData?.weeks.length || 0) - 1) {
        // Move to first item of next week
        const nextInput = document.querySelector(
          `input[data-week="${weekIndex + 1}"][data-item="0"]`
        ) as HTMLInputElement
        if (nextInput) {
          nextInput.focus()
          nextInput.select()
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      // Move to previous item
      if (itemIndex > 0) {
        const prevInput = document.querySelector(
          `input[data-week="${weekIndex}"][data-item="${itemIndex - 1}"]`
        ) as HTMLInputElement
        if (prevInput) {
          prevInput.focus()
          prevInput.select()
        }
      } else if (weekIndex > 0) {
        // Move to last item of previous week
        const prevWeekItems = menuData?.weeks[weekIndex - 1].items.length || 0
        const prevInput = document.querySelector(
          `input[data-week="${weekIndex - 1}"][data-item="${prevWeekItems - 1}"]`
        ) as HTMLInputElement
        if (prevInput) {
          prevInput.focus()
          prevInput.select()
        }
      }
    }
  }

  const handleSaveOrders = () => {
    if (!menuData) return

    // Check if any items have quantities
    const hasItems = menuData.weeks.some(week => 
      week.items.some(item => item.quantity > 0)
    )

    if (!hasItems) {
      toast({
        title: "Ingen varer",
        description: "Vennligst legg til antall for minst ett produkt",
        variant: "destructive"
      })
      return
    }

    createOrderMutation.mutate(menuData, {
      onSuccess: () => {
        toast({
          title: "Ordrer opprettet",
          description: "Ordrene ble registrert",
        })
        router.push('/orders')
      },
      onError: () => {
        toast({
          title: "Feil",
          description: "Kunne ikke registrere ordrer",
          variant: "destructive"
        })
      }
    })
  }

  const getTotalQuantity = (weekIndex: number) => {
    if (!menuData) return 0
    return menuData.weeks[weekIndex].items.reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrer Ordre fra Menyskjema</h1>
        <p className="text-muted-foreground">
          Registrer ordrer basert på utfylte menybestillingsskjemaer
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Last inn mal</CardTitle>
          <CardDescription>Velg kunde og startuke for å laste inn produktliste</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Kunde</Label>
              <Select value={selectedCustomer?.toString()} onValueChange={(v) => setSelectedCustomer(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg kunde" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.items.map(customer => (
                    <SelectItem key={customer.kundeid} value={customer.kundeid.toString()}>
                      {customer.kundenavn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start uke</Label>
              <Input
                type="number"
                min="1"
                max="52"
                value={startWeek}
                onChange={(e) => setStartWeek(parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleLoadTemplate} 
                disabled={!selectedCustomer || generateMenuMutation.isPending}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Last inn mal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Entry */}
      {menuData && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Registrer bestilling for {menuData.customerName}</h2>
            <Button onClick={handleSaveOrders} disabled={createOrderMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Lagre ordrer
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {menuData.weeks.map((week, weekIndex) => (
              <Card key={week.weekNumber}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Uke {week.weekNumber} - {week.year}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      Totalt: {getTotalQuantity(weekIndex)} enheter
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Produkt</TableHead>
                        <TableHead className="w-[100px]">Antall</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {week.items.map((item, itemIndex) => (
                        <TableRow key={item.produktid}>
                          <TableCell className="font-mono text-sm">{item.produktid}</TableCell>
                          <TableCell className="text-sm">
                            <div>
                              <div className="font-medium">{item.produktnavn}</div>
                              {item.leverandorsproduktnr && (
                                <div className="text-xs text-muted-foreground">
                                  Lev.nr: {item.leverandorsproduktnr}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity || ""}
                              onChange={(e) => handleQuantityChange(weekIndex, itemIndex, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, weekIndex, itemIndex)}
                              onFocus={() => setFocusedInput(`${weekIndex}-${itemIndex}`)}
                              onBlur={() => setFocusedInput(null)}
                              className={`w-20 text-right ${
                                focusedInput === `${weekIndex}-${itemIndex}` ? 'ring-2 ring-blue-500' : ''
                              }`}
                              data-product-input
                              data-week={weekIndex}
                              data-item={itemIndex}
                              placeholder="0"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ordresammendrag</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {menuData.weeks.map((week, index) => {
                  const total = getTotalQuantity(index)
                  const itemsWithQuantity = week.items.filter(item => item.quantity > 0).length
                  return (
                    <div key={week.weekNumber} className="flex justify-between text-sm">
                      <span>Uke {week.weekNumber}:</span>
                      <span>
                        {itemsWithQuantity} produkter, {total} enheter totalt
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Instruksjoner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Velg kunde og startuke for å laste inn produktlisten</li>
            <li>Produktene vises i samme rekkefølge som på utskriften (sortert etter produkt ID)</li>
            <li>Bruk Tab, Enter eller piltaster for å navigere mellom feltene</li>
            <li>Antall lagres automatisk når du flytter til neste felt</li>
            <li>Produkter uten antall (0 eller tomt) vil ikke inkluderes i ordren</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function getCurrentWeek(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  return Math.ceil(diff / oneWeek)
}