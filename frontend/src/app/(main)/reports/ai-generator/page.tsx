"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, Sparkles, Download, RefreshCw, Eye, Calendar as CalendarIcon, Database } from "lucide-react"
import { useGenerateAiReportMutation } from "@/lib/graphql/generated"
import { toast } from "sonner"
import { format } from "date-fns"
import { nb } from "date-fns/locale"

// Available data sources from GraphQL schema
const AVAILABLE_DATA_SOURCES = [
  { id: "sales", name: "Salgsdata", description: "Total omsetning, antall ordrer, trender" },
  { id: "products", name: "Produktdata", description: "Topp produkter, produktkategorier" },
  { id: "customers", name: "Kundedata", description: "Topp kunder, kunde-segmenter" },
  { id: "categories", name: "Kategoridata", description: "Salg per kategori" },
  { id: "nutrition", name: "Ernæringsdata", description: "Gjennomsnittlig ernæringsinnhold" }
]

export default function AIReportGeneratorPage() {
  const [period, setPeriod] = useState("month")
  const [useCustomDates, setUseCustomDates] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [reportType, setReportType] = useState("sales")
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>(["sales", "products"])
  const [customPrompt, setCustomPrompt] = useState("")
  const [generatedHtml, setGeneratedHtml] = useState("")
  const [insights, setInsights] = useState("")
  const [metadata, setMetadata] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [_, generateReport] = useGenerateAiReportMutation()
  const [isGenerating, setIsGenerating] = useState(false)

  const toggleDataSource = (sourceId: string) => {
    setSelectedDataSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    )
  }

  const handleGenerate = async () => {
    // Validation
    if (useCustomDates && (!startDate || !endDate)) {
      toast.error("Velg både start- og sluttdato")
      return
    }

    if (selectedDataSources.length === 0) {
      toast.error("Velg minst én datakilde")
      return
    }

    setIsGenerating(true)
    toast.info("AI genererer rapport...", {
      description: "Dette kan ta 10-30 sekunder"
    })

    try {
      const result = await generateReport({
        period: useCustomDates ? null : period,
        startDate: useCustomDates && startDate ? format(startDate, "yyyy-MM-dd") : null,
        endDate: useCustomDates && endDate ? format(endDate, "yyyy-MM-dd") : null,
        reportType,
        dataSources: selectedDataSources,
        customPrompt: customPrompt || null
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      if (result.data?.generateAiReport) {
        const report = result.data.generateAiReport
        setGeneratedHtml(report.html)
        setInsights(report.insights)
        setMetadata({
          period: report.period,
          totalOrders: report.totalOrders,
          totalRevenue: report.totalRevenue
        })
        setShowPreview(true)

        toast.success("Rapport generert!", {
          description: `${report.totalOrders} ordrer analysert`
        })
      }
    } catch (error: any) {
      toast.error("Feil ved generering", {
        description: error.message || "Kunne ikke generere rapport"
      })
      console.error("Error generating report:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedHtml) return

    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-rapport-${period}-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success("Rapport lastet ned!")
  }

  const handleOpenInNewTab = () => {
    if (!generatedHtml) return

    // Use blob URL instead of document.write to prevent XSS
    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Clean up blob URL after a short delay to allow the new tab to load
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">AI Rapport Generator</h1>
        </div>
        <p className="text-gray-500 mt-2">
          La GPT-4 analysere dataene dine og generere en profesjonell HTML-rapport
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasjon</CardTitle>
              <CardDescription>Tilpass rapporten din</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Custom Date Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-dates"
                  checked={useCustomDates}
                  onCheckedChange={(checked) => setUseCustomDates(checked as boolean)}
                />
                <Label htmlFor="custom-dates" className="text-sm font-medium cursor-pointer">
                  Bruk egendefinert tidsperiode
                </Label>
              </div>

              {/* Period Selection or Custom Dates */}
              {!useCustomDates ? (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Tidsperiode
                  </label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Denne uken</SelectItem>
                      <SelectItem value="month">Denne måneden</SelectItem>
                      <SelectItem value="quarter">Dette kvartalet</SelectItem>
                      <SelectItem value="year">Dette året</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Fra dato
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP", { locale: nb }) : "Velg dato"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Til dato
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP", { locale: nb }) : "Velg dato"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          disabled={(date) => startDate ? date < startDate : false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Data Sources Selection */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4 text-blue-600" />
                  <label className="text-sm font-medium">
                    Datakilder å inkludere
                  </label>
                </div>
                <div className="space-y-2">
                  {AVAILABLE_DATA_SOURCES.map((source) => (
                    <div key={source.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={source.id}
                        checked={selectedDataSources.includes(source.id)}
                        onCheckedChange={() => toggleDataSource(source.id)}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <Label htmlFor={source.id} className="text-sm font-medium cursor-pointer">
                          {source.name}
                        </Label>
                        <p className="text-xs text-gray-500">{source.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Type */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">
                  Rapport Type
                </label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Salgsrapport</SelectItem>
                    <SelectItem value="products">Produktrapport</SelectItem>
                    <SelectItem value="customers">Kunderapport</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ekstra Instruksjoner (valgfritt)
                </label>
                <Textarea
                  placeholder="F.eks: Fokuser på trender, legg til grafer for hver kategori, inkluder prediksjoner..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generer Rapport
                  </>
                )}
              </Button>

              {/* Action Buttons */}
              {generatedHtml && (
                <div className="space-y-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {showPreview ? "Skjul" : "Vis"} Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenInNewTab}
                    className="w-full"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Åpne i Ny Fane
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Last Ned HTML
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          {metadata && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Rapport Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Periode:</span>
                  <span className="font-medium">{metadata.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ordrer:</span>
                  <span className="font-medium">{metadata.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Omsetning:</span>
                  <span className="font-medium">
                    kr {metadata.totalRevenue.toLocaleString('nb-NO', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          {!generatedHtml && !isGenerating && (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Klar til å generere
                </h3>
                <p className="text-gray-500 max-w-md">
                  Velg periode og rapport-type, legg til eventuelle ekstra instruksjoner,
                  og klikk "Generer Rapport" for å la AI lage en profesjonell HTML-rapport.
                </p>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <Loader2 className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI analyserer data...
                </h3>
                <p className="text-gray-500 max-w-md">
                  GPT-4 studerer dataene dine og genererer en skreddersydd rapport.
                  Dette kan ta opptil 30 sekunder.
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {insights && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI Innsikter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {insights}
                </div>
              </CardContent>
            </Card>
          )}

          {/* HTML Preview */}
          {generatedHtml && showPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Rapport Preview</CardTitle>
                <CardDescription>
                  AI-generert HTML rapport
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={generatedHtml}
                    className="w-full h-[800px] border-0"
                    title="AI Generated Report"
                    sandbox="allow-same-origin"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
