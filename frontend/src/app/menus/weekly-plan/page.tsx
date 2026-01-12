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
import { Calendar, Printer, Save, FileText } from "lucide-react"
import { MenuPrintData, MenuOrderItem } from "@/lib/api/menus"

export default function WeeklyMenuPlanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null)
  const [startWeek, setStartWeek] = useState(getCurrentWeek())
  const [numberOfWeeks, setNumberOfWeeks] = useState(4)
  const [menuData, setMenuData] = useState<MenuPrintData | null>(null)
  const [editMode, setEditMode] = useState(false)

  const { data: customers } = useCustomersList({ limit: 1000, aktiv: true })
  const generateMenuMutation = useGenerateMenuOrderForm()
  const createOrderMutation = useCreateOrderFromMenuForm()

  const handleGenerateMenu = () => {
    if (!selectedCustomer) {
      toast({
        title: "Feil",
        description: "Vennligst velg en kunde først",
        variant: "destructive"
      })
      return
    }

    generateMenuMutation.mutate(
      { customerId: selectedCustomer, startWeek, numberOfWeeks },
      {
        onSuccess: (data) => {
          setMenuData(data)
          setEditMode(false)
          toast({
            title: "Meny generert",
            description: `Meny for ${data.customerName} er klar for utskrift`,
          })
        },
        onError: () => {
          toast({
            title: "Feil",
            description: "Kunne ikke generere meny",
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
          description: "Ordrene ble opprettet",
        })
        router.push('/orders')
      },
      onError: () => {
        toast({
          title: "Feil",
          description: "Kunne ikke opprette ordrer",
          variant: "destructive"
        })
      }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ukentlig Menyplanlegging</h1>
        <p className="text-muted-foreground">
          Generer og skriv ut menybestillingsskjema for kunder
        </p>
      </div>

      {/* Configuration */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Menyinnstillinger</CardTitle>
          <CardDescription>Velg kunde og tidsperiode for menyplanlegging</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
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

            <div className="space-y-2">
              <Label>Antall uker</Label>
              <Select value={numberOfWeeks.toString()} onValueChange={(v) => setNumberOfWeeks(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 uke</SelectItem>
                  <SelectItem value="2">2 uker</SelectItem>
                  <SelectItem value="3">3 uker</SelectItem>
                  <SelectItem value="4">4 uker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleGenerateMenu} 
                disabled={!selectedCustomer || generateMenuMutation.isPending}
                className="w-full"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Generer meny
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Display */}
      {menuData && (
        <>
          <div className="print:hidden space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Menybestilling for {menuData.customerName}</h2>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                  <FileText className="mr-2 h-4 w-4" />
                  {editMode ? "Forhåndsvisning" : "Rediger"}
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Skriv ut
                </Button>
                {editMode && (
                  <Button onClick={handleSaveOrders} disabled={createOrderMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Lagre ordrer
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Printable Menu */}
          <div className="print:block space-y-8">
            <div className="print:mb-8">
              <h1 className="text-2xl font-bold">Menybestilling</h1>
              <p className="text-lg mt-2">Kunde: {menuData.customerName}</p>
            </div>

            {menuData.weeks.map((week, weekIndex) => (
              <div key={week.weekNumber} className="break-inside-avoid">
                <h3 className="text-lg font-semibold mb-4">
                  Uke {week.weekNumber} - {week.year}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Produkt ID</TableHead>
                      <TableHead>Produktnavn</TableHead>
                      <TableHead>Lev.nr</TableHead>
                      <TableHead>Enhet</TableHead>
                      <TableHead className="w-[100px] text-right">Antall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {week.items.map((item, itemIndex) => (
                      <TableRow key={item.produktid}>
                        <TableCell className="font-mono">{item.produktid}</TableCell>
                        <TableCell>{item.produktnavn}</TableCell>
                        <TableCell>{item.leverandorsproduktnr || "-"}</TableCell>
                        <TableCell>{item.enhet || "-"}</TableCell>
                        <TableCell className="text-right">
                          {editMode ? (
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(weekIndex, itemIndex, e.target.value)}
                              className="w-20 ml-auto text-right"
                            />
                          ) : (
                            <div className="w-20 ml-auto border-b border-gray-300 min-h-[24px] text-right">
                              {item.quantity > 0 ? item.quantity : ""}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}

            <div className="print:block hidden mt-8 pt-8 border-t">
              <p className="text-sm text-gray-600">
                Signatur: _________________________________ Dato: _________________
              </p>
            </div>
          </div>
        </>
      )}
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

// Add print styles
const printStyles = `
@media print {
  @page {
    size: A4;
    margin: 20mm;
  }
  
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  .print\\:hidden {
    display: none !important;
  }
  
  .print\\:block {
    display: block !important;
  }
  
  .break-inside-avoid {
    break-inside: avoid;
  }
}
`

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = printStyles
  document.head.appendChild(style)
}