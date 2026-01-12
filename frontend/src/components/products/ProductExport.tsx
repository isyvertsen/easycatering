"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Loader2, FileDown } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"

interface Export {
  timestamp: string
  path: string
  total_products: number
  files_created: number
  format: string
  size_bytes: number
  size_mb: number
}

export function ProductExport() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useState("jsonl")
  const [exports, setExports] = useState<Export[]>([])
  const [isLoadingExports, setIsLoadingExports] = useState(false)

  const fetchExports = async () => {
    setIsLoadingExports(true)
    try {
      const response = await apiClient.get("/v1/products/export/list")
      setExports(response.data.exports || [])
    } catch (error) {
      console.error("Failed to fetch exports:", error)
    } finally {
      setIsLoadingExports(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchExports()
    }
  }, [isOpen])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await apiClient.post("/v1/products/export", { format })

      if (response.data.success) {
        toast({
          title: "Eksport fullført",
          description: `${response.data.total_products} produkter eksportert til ${response.data.files_created} fil(er)`,
        })
        // Refresh exports list
        fetchExports()
      } else {
        toast({
          title: "Eksport feilet",
          description: response.data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Eksport feilet",
        description: "En feil oppstod under eksportering",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownload = async (timestamp: string) => {
    try {
      const response = await apiClient.get(`/v1/products/export/download/${timestamp}`, {
        responseType: 'blob'
      })

      // Create a blob from the response
      const blob = response.data
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `product_export_${timestamp}.zip`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Nedlasting startet",
        description: "Zip-filen lastes ned",
      })
    } catch (error) {
      toast({
        title: "Nedlasting feilet",
        description: "Kunne ikke laste ned eksportfilen",
        variant: "destructive",
      })
    }
  }

  const formatDate = (timestamp: string) => {
    // Format: YYYYMMDD_HHMMSS
    const year = timestamp.substring(0, 4)
    const month = timestamp.substring(4, 6)
    const day = timestamp.substring(6, 8)
    const hour = timestamp.substring(9, 11)
    const minute = timestamp.substring(11, 13)
    const second = timestamp.substring(13, 15)
    
    return `${day}.${month}.${year} ${hour}:${minute}:${second}`
  }

  const getFormatBadgeVariant = (format: string) => {
    switch (format) {
      case "json":
        return "default"
      case "markdown":
        return "secondary"
      case "jsonl":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        Eksporter produkter
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eksporter produkter</DialogTitle>
            <DialogDescription>
              Eksporter produktkatalogen i ønsket format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Export format selection */}
            <div className="space-y-2">
              <label htmlFor="format" className="text-sm font-medium">
                Velg eksportformat
              </label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jsonl">
                    JSONL - Optimalisert for RAG (100 produkter per fil)
                  </SelectItem>
                  <SelectItem value="json">
                    JSON - Alle produkter i én fil
                  </SelectItem>
                  <SelectItem value="markdown">
                    Markdown - Ett produkt per fil
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {format === "jsonl" && "JSONL-format er optimalisert for store datasett med 100 produkter per fil"}
                {format === "json" && "JSON-format eksporterer alle produkter i én enkelt fil"}
                {format === "markdown" && "Markdown-format lager individuelle filer for hvert produkt"}
              </p>
            </div>

            {/* Previous exports */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tidligere eksporter</h3>
              {isLoadingExports ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : exports.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen tidligere eksporter funnet</p>
              ) : (
                <div className="space-y-2">
                  {exports.map((export_) => (
                    <Card key={export_.timestamp}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">
                              {formatDate(export_.timestamp)}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {export_.total_products} produkter • {export_.files_created} fil(er) • {export_.size_mb} MB
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getFormatBadgeVariant(export_.format)}>
                              {export_.format.toUpperCase()}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(export_.timestamp)}
                            >
                              <FileDown className="mr-2 h-4 w-4" />
                              Last ned
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eksporterer...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Start eksport
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}