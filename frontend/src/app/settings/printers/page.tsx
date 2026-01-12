"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Printer, Plus, Trash2, Edit2, Check, X, Zap } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

interface ZebraPrinter {
  id: string
  name: string
  ipAddress: string
  isDefault: boolean
  description?: string
}

export default function PrintersSettingsPage() {
  const [printers, setPrinters] = useState<ZebraPrinter[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<ZebraPrinter | null>(null)
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formIp, setFormIp] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formIsDefault, setFormIsDefault] = useState(false)

  // Load printers from localStorage (client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    try {
      const saved = window.localStorage.getItem('zebraPrinters')
      if (saved) {
        const parsed = JSON.parse(saved)
        setPrinters(parsed)
      }
    } catch (e) {
      console.error('Failed to load printers:', e)
    }
  }, [])

  // Save printers to localStorage (client-side only)
  const savePrinters = (updatedPrinters: ZebraPrinter[]) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('zebraPrinters', JSON.stringify(updatedPrinters))
    }
    setPrinters(updatedPrinters)
  }

  const resetForm = () => {
    setFormName("")
    setFormIp("")
    setFormDescription("")
    setFormIsDefault(false)
    setEditingPrinter(null)
  }

  const openAddDialog = () => {
    resetForm()
    setShowAddDialog(true)
  }

  const openEditDialog = (printer: ZebraPrinter) => {
    setFormName(printer.name)
    setFormIp(printer.ipAddress)
    setFormDescription(printer.description || "")
    setFormIsDefault(printer.isDefault)
    setEditingPrinter(printer)
    setShowAddDialog(true)
  }

  const handleSavePrinter = () => {
    if (!formName.trim()) {
      toast.error("Angi et navn for printeren")
      return
    }

    if (!formIp.trim()) {
      toast.error("Angi IP-adresse for printeren")
      return
    }

    // Validate IP format (basic check)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(formIp.trim())) {
      toast.error("Ugyldig IP-adresse format. Bruk format: 192.168.1.100")
      return
    }

    if (editingPrinter) {
      // Update existing printer
      const updatedPrinters = printers.map(p => {
        if (p.id === editingPrinter.id) {
          return {
            ...p,
            name: formName.trim(),
            ipAddress: formIp.trim(),
            description: formDescription.trim(),
            isDefault: formIsDefault
          }
        }
        // If this printer is set as default, unset others
        if (formIsDefault && p.isDefault) {
          return { ...p, isDefault: false }
        }
        return p
      })
      savePrinters(updatedPrinters)
      toast.success("Printer oppdatert")
    } else {
      // Add new printer
      const newPrinter: ZebraPrinter = {
        id: Date.now().toString(),
        name: formName.trim(),
        ipAddress: formIp.trim(),
        description: formDescription.trim(),
        isDefault: formIsDefault
      }

      let updatedPrinters = [...printers, newPrinter]

      // If this is the first printer, make it default
      if (updatedPrinters.length === 1) {
        updatedPrinters[0].isDefault = true
      }

      // If setting as default, unset others
      if (formIsDefault) {
        updatedPrinters = updatedPrinters.map(p => ({
          ...p,
          isDefault: p.id === newPrinter.id
        }))
      }

      savePrinters(updatedPrinters)
      toast.success("Printer lagt til")
    }

    setShowAddDialog(false)
    resetForm()
  }

  const handleDeletePrinter = (printerId: string) => {
    const printer = printers.find(p => p.id === printerId)
    if (!printer) return

    if (confirm(`Er du sikker på at du vil slette "${printer.name}"?`)) {
      let updatedPrinters = printers.filter(p => p.id !== printerId)

      // If we deleted the default printer and there are others, set first as default
      if (printer.isDefault && updatedPrinters.length > 0) {
        updatedPrinters[0].isDefault = true
      }

      savePrinters(updatedPrinters)
      toast.success("Printer slettet")
    }
  }

  const handleSetDefault = (printerId: string) => {
    const updatedPrinters = printers.map(p => ({
      ...p,
      isDefault: p.id === printerId
    }))
    savePrinters(updatedPrinters)
    toast.success("Standard printer oppdatert")
  }

  const handleTestPrint = async (printer: ZebraPrinter) => {
    setTestingPrinterId(printer.id)

    try {
      // Generate test ZPL
      const testZpl = `^XA
^CI28
^FO50,50^A0N,60,50^FDTEST UTSKRIFT^FS
^FO50,120^A0N,40,35^FD${printer.name}^FS
^FO50,170^A0N,30,25^FDIP: ${printer.ipAddress}^FS
^FO50,210^A0N,30,25^FDDato: ${new Date().toLocaleDateString('nb-NO')}^FS
^FO50,250^A0N,30,25^FDKlokkeslett: ${new Date().toLocaleTimeString('nb-NO')}^FS
^FO50,300^A0N,25,20^FDHvis du ser dette fungerer printeren!^FS
^XZ`

      console.log("Sending test print to:", printer.ipAddress)

      const printerUrl = `http://${printer.ipAddress}/pstprnt`

      await fetch(printerUrl, {
        method: 'POST',
        body: testZpl,
        headers: {
          'Content-Type': 'text/plain',
        },
        mode: 'no-cors'
      })

      toast.success(`Test-utskrift sendt til ${printer.name}`)
    } catch (error: any) {
      console.error("Test print failed:", error)
      toast.error(`Kunne ikke sende test-utskrift: ${error.message}`)
    } finally {
      setTestingPrinterId(null)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Zebra Printere</h1>
          <p className="text-muted-foreground mt-1">
            Administrer dine Zebra-printere for etikett-utskrift
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Legg til printer
        </Button>
      </div>

      {printers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Printer className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ingen printere konfigurert</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Legg til din første Zebra-printer for å komme i gang med etikett-utskrift.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Legg til printer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {printers.map((printer) => (
            <Card key={printer.id} className={printer.isDefault ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{printer.name}</CardTitle>
                      {printer.isDefault && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          <Check className="mr-1 h-3 w-3" />
                          Standard
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {printer.description || "Ingen beskrivelse"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(printer)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePrinter(printer.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">IP-adresse</Label>
                    <p className="font-mono text-sm mt-1">{printer.ipAddress}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1">Konfigurert</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestPrint(printer)}
                    disabled={testingPrinterId === printer.id}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {testingPrinterId === printer.id ? "Sender..." : "Test utskrift"}
                  </Button>

                  {!printer.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(printer.id)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Sett som standard
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Printer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPrinter ? "Rediger printer" : "Legg til ny printer"}
            </DialogTitle>
            <DialogDescription>
              Angi informasjon om Zebra-printeren din
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="printer-name">Printernavn *</Label>
              <Input
                id="printer-name"
                placeholder="F.eks. Kjøkken Printer"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="printer-ip">IP-adresse *</Label>
              <Input
                id="printer-ip"
                type="text"
                placeholder="F.eks. 192.168.1.100"
                value={formIp}
                onChange={(e) => setFormIp(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Skriv ut konfigurasjonsetikett fra printeren for å finne IP-adressen
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="printer-description">Beskrivelse</Label>
              <Input
                id="printer-description"
                placeholder="F.eks. Printer ved pakkestasjon"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={formIsDefault}
                onCheckedChange={(checked) => setFormIsDefault(checked as boolean)}
              />
              <Label htmlFor="is-default" className="cursor-pointer">
                Sett som standard printer
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSavePrinter}>
              {editingPrinter ? "Oppdater" : "Legg til"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
