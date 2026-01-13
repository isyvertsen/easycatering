"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { ArrowLeft, Save, Package, ScanLine } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  getPickDetails,
  registerPickQuantities,
  PickDetailLine,
  PickedLineInput,
  ScannedLine,
} from "@/lib/api/plukking"
import { PickListScanner } from "@/components/plukking/PickListScanner"

interface PickLineState {
  produktid: number
  unik: number
  produktnavn: string
  bestilt: number
  plukket: number
  enhet: string
}

export default function PickRegistrationPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const resolvedParams = use(params)
  const orderId = parseInt(resolvedParams.orderId, 10)
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [lines, setLines] = useState<PickLineState[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [aiNotes, setAiNotes] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["pick-details", orderId],
    queryFn: () => getPickDetails(orderId),
    enabled: !isNaN(orderId),
  })

  // Initialize lines when data loads
  useEffect(() => {
    if (data?.lines) {
      setLines(
        data.lines.map((line) => ({
          produktid: line.produktid,
          unik: line.unik,
          produktnavn: line.produktnavn || "Ukjent produkt",
          bestilt: line.antall,
          plukket: line.plukket_antall ?? line.antall,
          enhet: line.enhet || "stk",
        }))
      )
    }
  }, [data])

  const registerMutation = useMutation({
    mutationFn: (pickedLines: PickedLineInput[]) =>
      registerPickQuantities(orderId, pickedLines),
    onSuccess: (result) => {
      toast({
        title: "Plukk registrert",
        description: result.message,
      })
      queryClient.invalidateQueries({ queryKey: ["plukking"] })
      router.push("/plukking")
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke registrere plukk",
        variant: "destructive",
      })
    },
  })

  const handleQuantityChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, plukket: numValue } : line
      )
    )
  }

  const handleSetAll = () => {
    setLines((prev) =>
      prev.map((line) => ({ ...line, plukket: line.bestilt }))
    )
    // Clear AI state when manually setting all
    setAiConfidence(null)
    setAiNotes(null)
  }

  const handleScanComplete = (
    scannedLines: ScannedLine[],
    confidence: number,
    notes: string
  ) => {
    // Create a map of scanned values by produktid+unik
    const scannedMap = new Map(
      scannedLines.map((sl) => [`${sl.produktid}-${sl.unik}`, sl.plukket_antall])
    )

    // Update lines with scanned values
    setLines((prev) =>
      prev.map((line) => {
        const key = `${line.produktid}-${line.unik}`
        const scannedValue = scannedMap.get(key)
        return scannedValue !== undefined
          ? { ...line, plukket: scannedValue }
          : line
      })
    )

    // Store AI confidence info
    setAiConfidence(confidence)
    setAiNotes(notes || null)

    toast({
      title: "Plukkliste skannet",
      description: `AI har fylt inn verdier med ${Math.round(confidence * 100)}% sikkerhet`,
    })
  }

  const handleSubmit = () => {
    const pickedLines: PickedLineInput[] = lines.map((line) => ({
      produktid: line.produktid,
      unik: line.unik,
      plukket_antall: line.plukket,
    }))
    registerMutation.mutate(pickedLines)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-muted-foreground">Laster ordredetaljer...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-destructive">Kunne ikke laste ordredetaljer</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/plukking">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Link>
        </Button>
      </div>
    )
  }

  const hasChanges = lines.some((line) => line.plukket !== line.bestilt)

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/plukking">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Registrer plukk - Ordre #{orderId}</h1>
            <p className="text-muted-foreground">
              {data.kundenavn || "Ukjent kunde"}
              {data.leveringsdato && (
                <> - Levering: {format(new Date(data.leveringsdato), "d. MMMM yyyy", { locale: nb })}</>
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setScannerOpen(true)}>
          <ScanLine className="mr-2 h-4 w-4" />
          Skann plukkliste
        </Button>
      </div>

      {/* Order lines */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produkter å plukke
              </CardTitle>
              <CardDescription>
                Fyll inn faktisk plukket mengde for hvert produkt
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleSetAll}>
              Sett alle til bestilt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Produkt</th>
                  <th className="p-3 text-right font-medium w-32">Bestilt</th>
                  <th className="p-3 text-center font-medium w-40">Plukket</th>
                  <th className="p-3 text-right font-medium w-32">Differanse</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const diff = line.plukket - line.bestilt
                  return (
                    <tr key={`${line.produktid}-${line.unik}`} className="border-b">
                      <td className="p-3">
                        <span className="font-medium">{line.produktnavn}</span>
                      </td>
                      <td className="p-3 text-right">
                        {line.bestilt} {line.enhet}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={line.plukket}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="w-24 text-center"
                          />
                          <span className="text-muted-foreground text-sm">{line.enhet}</span>
                        </div>
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        diff < 0 ? "text-destructive" : diff > 0 ? "text-green-600" : ""
                      }`}>
                        {diff !== 0 ? (diff > 0 ? "+" : "") + diff : "-"}
                      </td>
                    </tr>
                  )
                })}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      Ingen produkter på ordren
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI scan info */}
      {aiConfidence !== null && (
        <Card className="mb-6 border-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-600">AI-skannet plukkliste</span>
              <Badge variant={aiConfidence >= 0.8 ? "default" : aiConfidence >= 0.5 ? "secondary" : "destructive"}>
                {Math.round(aiConfidence * 100)}% sikkerhet
              </Badge>
            </div>
            {aiNotes && (
              <p className="text-sm text-muted-foreground">{aiNotes}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Verifiser verdiene og juster om nødvendig før du lagrer.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {hasChanges && (
        <Card className="mb-6 border-amber-500">
          <CardContent className="pt-6">
            <p className="text-amber-600 font-medium">
              Det er avvik mellom bestilt og plukket mengde på noen produkter.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/plukking">Avbryt</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={registerMutation.isPending || lines.length === 0}
        >
          <Save className="mr-2 h-4 w-4" />
          {registerMutation.isPending ? "Lagrer..." : "Lagre plukk"}
        </Button>
      </div>

      {/* Scanner dialog */}
      <PickListScanner
        orderId={orderId}
        onScanComplete={handleScanComplete}
        open={scannerOpen}
        onOpenChange={setScannerOpen}
      />
    </div>
  )
}
