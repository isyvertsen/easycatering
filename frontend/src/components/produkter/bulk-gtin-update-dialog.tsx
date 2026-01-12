"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Upload, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useBulkUpdateGtin } from "@/hooks/useProdukter"
import { BulkGtinUpdate } from "@/lib/api/produkter"

interface BulkGtinUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function BulkGtinUpdateDialog({
  open,
  onOpenChange,
  onComplete,
}: BulkGtinUpdateDialogProps) {
  const [csvText, setCsvText] = useState("")
  const [parsedData, setParsedData] = useState<BulkGtinUpdate[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  const bulkUpdateMutation = useBulkUpdateGtin({
    onSuccess: () => {
      onComplete()
      setCsvText("")
      setParsedData([])
    },
  })

  const handleParse = () => {
    setParseError(null)
    try {
      const lines = csvText.trim().split("\n")
      const updates: BulkGtinUpdate[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Skip header if it contains "produktid" or "gtin"
        if (line.toLowerCase().includes("produktid") && line.toLowerCase().includes("gtin")) {
          continue
        }

        // Parse CSV line (support both comma and semicolon)
        const parts = line.split(/[,;]/).map((p) => p.trim())

        if (parts.length < 2) {
          throw new Error(`Linje ${i + 1}: Ugyldig format. Forventet: produktid,gtin`)
        }

        const produktid = parseInt(parts[0], 10)
        const gtin = parts[1]

        if (isNaN(produktid)) {
          throw new Error(`Linje ${i + 1}: Ugyldig produkt-ID: "${parts[0]}"`)
        }

        if (!gtin) {
          throw new Error(`Linje ${i + 1}: Mangler GTIN`)
        }

        updates.push({ produktid, gtin })
      }

      if (updates.length === 0) {
        throw new Error("Ingen gyldige oppdateringer funnet")
      }

      setParsedData(updates)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Kunne ikke parse data")
      setParsedData([])
    }
  }

  const handleSubmit = () => {
    if (parsedData.length > 0) {
      bulkUpdateMutation.mutate(parsedData)
    }
  }

  const handleReset = () => {
    setCsvText("")
    setParsedData([])
    setParseError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Masse-oppdatering av GTIN
          </DialogTitle>
          <DialogDescription>
            Oppdater GTIN for flere produkter samtidig ved å lime inn CSV-data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-medium">Format:</h3>
            <code className="text-xs block">produktid,gtin</code>
            <p className="text-xs text-muted-foreground">
              Eksempel:
              <br />
              <code>
                5,07026510152407
                <br />
                12,17311041041595
                <br />
                1288,07038010000232
              </code>
            </p>
            <p className="text-xs text-muted-foreground">
              Du kan også bruke semikolon (;) som separator.
            </p>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Lim inn CSV-data:</label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="produktid,gtin&#10;5,07026510152407&#10;12,17311041041595"
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Parse button */}
          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={!csvText.trim()} variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              Valider data
            </Button>
            {(parsedData.length > 0 || parseError) && (
              <Button onClick={handleReset} variant="ghost">
                Nullstill
              </Button>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Feil ved parsing</h4>
                <p className="text-sm text-red-700">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed data preview */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Forhåndsvisning ({parsedData.length} produkter):
                </h3>
                <Badge variant="outline" className="bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                  Klar for oppdatering
                </Badge>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Produkt-ID</th>
                      <th className="text-left p-2">GTIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((update, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{update.produktid}</td>
                        <td className="p-2">
                          <code className="text-xs">{update.gtin}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={bulkUpdateMutation.isPending}
                className="w-full"
              >
                {bulkUpdateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Oppdaterer...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Oppdater {parsedData.length} produkter
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
