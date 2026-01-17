"use client"

import { useState, useRef } from "react"
import { format, startOfWeek, endOfWeek, addDays } from "date-fns"
import { nb } from "date-fns/locale"
import { Calendar as CalendarIcon, Printer, Package, MapPin, User, Utensils, ListFilter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEtiketter } from "@/hooks/useEtiketter"
import { EtikettKunde, EtikettParams } from "@/lib/api/etiketter"
import { cn } from "@/lib/utils"

const UKEDAGER = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"]

function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function EtikettCard({ kunde }: { kunde: EtikettKunde }) {
  return (
    <Card className="break-inside-avoid mb-4 print:shadow-none print:border-2 print:border-black">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-4 w-4" />
          {kunde.kundenavn}
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {kunde.adresse}, {kunde.postnr} {kunde.sted}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Kunde info */}
        <div className="flex flex-wrap gap-2 text-xs">
          {kunde.sone && (
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Sone: {kunde.sone}
            </span>
          )}
          {kunde.rute && (
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
              Rute: {kunde.rute}
            </span>
          )}
          {kunde.leveringsdag !== null && (
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              {UKEDAGER[kunde.leveringsdag]}
            </span>
          )}
          {kunde.diett && (
            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded flex items-center gap-1">
              <Utensils className="h-3 w-3" />
              Diett
            </span>
          )}
        </div>

        {kunde.menyinfo && (
          <p className="text-xs text-muted-foreground italic">{kunde.menyinfo}</p>
        )}

        {/* Ordrer */}
        {kunde.ordrer.map((ordre) => (
          <div key={ordre.ordreid} className="border-t pt-2">
            <div className="text-sm font-medium mb-1">
              {ordre.leveringsdato && format(new Date(ordre.leveringsdato), "EEEE d. MMMM", { locale: nb })}
            </div>
            <div className="space-y-1">
              {ordre.produkter.map((produkt, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    {produkt.produktnavn}
                  </span>
                  <span className="font-medium">x {produkt.antall}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function EtiketterPage() {
  const today = new Date()
  const [fraDato, setFraDato] = useState<Date>(startOfWeek(today, { weekStartsOn: 1 }))
  const [tilDato, setTilDato] = useState<Date>(endOfWeek(today, { weekStartsOn: 1 }))
  const [ordrestatus, setOrdrestatus] = useState<number>(35)
  const [params, setParams] = useState<EtikettParams | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error } = useEtiketter(params)

  const handleSearch = () => {
    setParams({
      fra_dato: formatDate(fraDato),
      til_dato: formatDate(tilDato),
      ordrestatus: ordrestatus,
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const setThisWeek = () => {
    setFraDato(startOfWeek(today, { weekStartsOn: 1 }))
    setTilDato(endOfWeek(today, { weekStartsOn: 1 }))
  }

  const setNextWeek = () => {
    const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
    setFraDato(nextWeekStart)
    setTilDato(addDays(nextWeekStart, 6))
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header - hidden in print */}
      <div className="print:hidden space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leveringsetiketter</h1>
          <p className="text-muted-foreground">
            Skriv ut etiketter for kundeleveringer
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Velg periode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              {/* Quick buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={setThisWeek}>
                  Denne uken
                </Button>
                <Button variant="outline" size="sm" onClick={setNextWeek}>
                  Neste uke
                </Button>
              </div>

              {/* Fra dato */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Fra dato</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !fraDato && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fraDato ? format(fraDato, "PPP", { locale: nb }) : "Velg dato"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fraDato}
                      onSelect={(date) => date && setFraDato(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Til dato */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Til dato</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !tilDato && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tilDato ? format(tilDato, "PPP", { locale: nb }) : "Velg dato"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tilDato}
                      onSelect={(date) => date && setTilDato(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Ordrestatus */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Ordrestatus</label>
                <Select
                  value={ordrestatus.toString()}
                  onValueChange={(value) => setOrdrestatus(parseInt(value))}
                >
                  <SelectTrigger className="w-[180px]">
                    <ListFilter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Velg status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 - Startet</SelectItem>
                    <SelectItem value="15">15 - Bestilt</SelectItem>
                    <SelectItem value="20">20 - Godkjent</SelectItem>
                    <SelectItem value="25">25 - Plukkliste</SelectItem>
                    <SelectItem value="30">30 - Plukket</SelectItem>
                    <SelectItem value="35">35 - Pakkliste</SelectItem>
                    <SelectItem value="40">40 - Levert</SelectItem>
                    <SelectItem value="80">80 - Godkjent mottaker</SelectItem>
                    <SelectItem value="85">85 - Fakturert</SelectItem>
                    <SelectItem value="90">90 - Sendt regnskap</SelectItem>
                    <SelectItem value="95">95 - Kreditert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Henter..." : "Hent etiketter"}
              </Button>

              {data && data.kunder.length > 0 && (
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Skriv ut
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {data && (
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{data.total_kunder}</div>
                <p className="text-xs text-muted-foreground">Kunder</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{data.total_ordrer}</div>
                <p className="text-xs text-muted-foreground">Ordrer</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {format(new Date(data.fra_dato), "d. MMM", { locale: nb })} - {format(new Date(data.til_dato), "d. MMM", { locale: nb })}
                </div>
                <p className="text-xs text-muted-foreground">Periode</p>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Feil ved henting av etiketter. Prøv igjen.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Labels - printable area */}
      <div ref={printRef} className="mt-6 print:mt-0">
        {data && data.kunder.length === 0 && (
          <Card className="print:hidden">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Ingen leveringer funnet for valgt periode.</p>
            </CardContent>
          </Card>
        )}

        {data && data.kunder.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 gap-4">
            {data.kunder.map((kunde) => (
              <EtikettCard key={kunde.kundeid} kunde={kunde} />
            ))}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #__next > div > div > div:last-child,
          #__next > div > div > div:last-child * {
            visibility: visible;
          }
          #__next > div > div > div:last-child {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}
