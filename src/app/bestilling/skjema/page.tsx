'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Printer, FileText } from 'lucide-react'
import { useBestillingSkjema } from '@/hooks/useBestillingSkjema'
import { useKundegrupper } from '@/hooks/useKundegruppe'
import { usePerioderList } from '@/hooks/usePerioder'
import { KundeForBestilling, PeriodeMedMenyer } from '@/lib/api/bestilling-skjema'

// Mapping av ukedager
const UKEDAGER: Record<number, string> = {
  1: 'Mandag',
  2: 'Tirsdag',
  3: 'Onsdag',
  4: 'Torsdag',
  5: 'Fredag',
  6: 'Lordag',
  7: 'Sondag',
}

function getLeveringsdag(dag: number | null): string {
  if (dag === null) return '-'
  return UKEDAGER[dag] || `Dag ${dag}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
}

function formatPeriodeLabel(periode: { ukenr: number | null; fradato: string | null }): string {
  const uke = periode.ukenr ? `Uke ${periode.ukenr}` : ''
  const dato = periode.fradato ? formatDate(periode.fradato) : ''
  return uke && dato ? `${uke} (${dato})` : uke || dato || 'Ukjent periode'
}

export default function BestillingSkjemaPage() {
  const [kundegruppeId, setKundegruppeId] = useState<number | undefined>(undefined)
  const [fraPeriodeId, setFraPeriodeId] = useState<number | undefined>(undefined)
  const [tilPeriodeId, setTilPeriodeId] = useState<number | undefined>(undefined)
  const printRef = useRef<HTMLDivElement>(null)

  const { data: kundegrupper, isLoading: kundegrupperLoading } = useKundegrupper({
    page_size: 100,
  })

  // Hent alle perioder for velgerne
  const { data: perioderData, isLoading: perioderLoading } = usePerioderList({
    page_size: 50,
    sort_by: 'fradato',
    sort_order: 'asc',
  })

  // Sett standardverdier når perioder er lastet
  useEffect(() => {
    if (perioderData?.items && perioderData.items.length > 0 && !fraPeriodeId && !tilPeriodeId) {
      // Finn dagens dato
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Finn perioder som er i dag eller fremover
      const kommendePerioder = perioderData.items.filter((p) => {
        if (!p.fradato) return false
        const fradato = new Date(p.fradato)
        return fradato >= today
      })

      if (kommendePerioder.length >= 2) {
        setFraPeriodeId(kommendePerioder[0].menyperiodeid)
        setTilPeriodeId(kommendePerioder[Math.min(3, kommendePerioder.length - 1)].menyperiodeid)
      } else if (perioderData.items.length >= 2) {
        // Fallback til de siste periodene
        setFraPeriodeId(perioderData.items[0].menyperiodeid)
        setTilPeriodeId(perioderData.items[Math.min(3, perioderData.items.length - 1)].menyperiodeid)
      }
    }
  }, [perioderData, fraPeriodeId, tilPeriodeId])

  const { data: skjemaData, isLoading: skjemaLoading } = useBestillingSkjema({
    kundegruppe_id: kundegruppeId,
    fra_periode_id: fraPeriodeId,
    til_periode_id: tilPeriodeId,
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header med filter (skjules ved print) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Bestillingsskjema</h1>
          <p className="text-muted-foreground mt-1">
            Generer bestillingsskjema for utskrift
          </p>
        </div>
        <Button onClick={handlePrint} disabled={!skjemaData?.kunder?.length}>
          <Printer className="h-4 w-4 mr-2" />
          Skriv ut
        </Button>
      </div>

      {/* Filtere (skjules ved print) */}
      <div className="flex gap-4 items-end flex-wrap print:hidden">
        <div className="w-64">
          <label className="text-sm font-medium mb-1 block">Kundegruppe</label>
          <Select
            value={kundegruppeId?.toString() || '__all__'}
            onValueChange={(val) =>
              setKundegruppeId(val === '__all__' ? undefined : parseInt(val))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle kundegrupper" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Alle kundegrupper</SelectItem>
              {kundegrupper?.items?.map((gruppe) => (
                <SelectItem key={gruppe.gruppeid} value={gruppe.gruppeid.toString()}>
                  {gruppe.gruppe}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Fra periode</label>
          <Select
            value={fraPeriodeId?.toString() || ''}
            onValueChange={(val) => setFraPeriodeId(parseInt(val))}
            disabled={perioderLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Velg periode" />
            </SelectTrigger>
            <SelectContent>
              {perioderData?.items?.map((periode) => (
                <SelectItem key={periode.menyperiodeid} value={periode.menyperiodeid.toString()}>
                  {formatPeriodeLabel(periode)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Til periode</label>
          <Select
            value={tilPeriodeId?.toString() || ''}
            onValueChange={(val) => setTilPeriodeId(parseInt(val))}
            disabled={perioderLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Velg periode" />
            </SelectTrigger>
            <SelectContent>
              {perioderData?.items?.map((periode) => (
                <SelectItem key={periode.menyperiodeid} value={periode.menyperiodeid.toString()}>
                  {formatPeriodeLabel(periode)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {(kundegrupperLoading || skjemaLoading) && (
        <div className="space-y-4 print:hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {/* Ingen kunder */}
      {!skjemaLoading && (!skjemaData?.kunder || skjemaData.kunder.length === 0) && (
        <Card className="print:hidden">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Ingen kunder funnet</h3>
            <p className="text-muted-foreground mt-2">
              Ingen kunder matcher kriteriene (bestillerselv=true, avsluttet=false)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bestillingsskjema - printvennlig */}
      <div ref={printRef} id="print-content" className="space-y-8 print:space-y-0 print:block">
        {skjemaData?.kunder?.map((kunde) => (
          <KundeBestillingKort
            key={kunde.kundeid}
            kunde={kunde}
            perioder={skjemaData.perioder}
          />
        ))}
      </div>

      {/* Print-spesifikke stiler */}
      <style jsx global>{`
        /* Skjul print-header på skjerm */
        .print-header {
          display: none !important;
        }

        @media print {
          /* Vis print-header ved utskrift */
          .print-header {
            display: block !important;
            visibility: visible !important;
            border-bottom: 1px solid #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }

          .print-header * {
            visibility: visible !important;
          }

          .print-header .flex {
            display: flex !important;
          }

          @page {
            size: A4 portrait;
            margin: 0.5cm;
          }

          /* Skjul navigasjon og unødvendige elementer */
          header,
          nav,
          aside,
          footer,
          [data-sidebar],
          .sidebar,
          [class*="TopNav"],
          [class*="top-nav"],
          .sticky.top-0,
          .print\\:hidden,
          button,
          [class*="backdrop-blur"],
          [class*="chatbot"],
          [class*="Chatbot"],
          .fixed.bottom-4,
          .fixed.bottom-6,
          [class*="fixed"][class*="bottom"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* Reset body og html */
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Fjern container-begrensninger */
          .container,
          main,
          [class*="container"],
          [class*="max-w-"] {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0.5cm !important;
          }

          /* Skjul bakgrunnsfarger på wrapper */
          .min-h-screen,
          [class*="bg-muted"] {
            background: white !important;
            min-height: auto !important;
          }

          /* Hovedinnhold-område */
          .p-6 {
            padding: 0 !important;
          }

          /* Kunde-kort */
          .kunde-kort {
            display: block !important;
            visibility: visible !important;
            page-break-after: always;
            page-break-inside: avoid;
            margin: 0 0 0.5cm 0 !important;
            padding: 0.3cm !important;
            border: 1px solid #000 !important;
            background: white !important;
            box-shadow: none !important;
          }

          .kunde-kort:last-child,
          .kunde-kort:only-child {
            page-break-after: auto;
          }

          .kunde-kort * {
            visibility: visible !important;
          }

          .kunde-kort .flex {
            display: flex !important;
          }

          /* Card innhold */
          .kunde-kort > div {
            display: block !important;
            visibility: visible !important;
          }

          /* Tabeller */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10pt !important;
          }

          th, td {
            border: 1px solid #999 !important;
            padding: 2px 4px !important;
          }

          /* Perioder */
          .space-y-8 > *,
          .space-y-4 > * {
            margin-top: 0.3cm !important;
          }

          /* Tekststørrelser */
          .text-xl, .text-lg {
            font-size: 12pt !important;
          }

          .text-sm, .text-xs {
            font-size: 9pt !important;
          }

          /* Antall-felt */
          .w-16.h-6.border {
            width: 1.5cm !important;
            height: 0.5cm !important;
            border: 1px solid #000 !important;
          }

          /* Sørg for at print-innholdet alltid er synlig */
          #print-content {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            width: 100% !important;
          }

          #print-content > * {
            display: block !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  )
}

interface KundeBestillingKortProps {
  kunde: KundeForBestilling
  perioder: PeriodeMedMenyer[]
}

function KundeBestillingKort({ kunde, perioder }: KundeBestillingKortProps) {
  return (
    <Card className="kunde-kort print:border print:shadow-none print:mb-0">
      {/* Print header - kun synlig ved utskrift */}
      <div className="print-header">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {/* NÆR logo placeholder */}
            <div className="w-10 h-10 border border-black rounded-full flex items-center justify-center text-xs font-bold">
              NÆR
            </div>
            <div>
              <div className="text-lg font-bold">LKC</div>
              <div className="text-sm">Larvik Kommunale Catering</div>
              <div className="text-xs">Vikingveien 4 &nbsp;&nbsp; 3274 LARVIK</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">Bestillingsskjema</div>
            <div className="text-sm">BestillerSelv: Ja</div>
          </div>
        </div>
      </div>

      {/* Kundeinfo header */}
      <CardHeader className="pb-2 print:pb-1 print:pt-0">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl print:text-lg">
              {kunde.kundeid} - {kunde.kundenavn || 'Ukjent kunde'}
            </CardTitle>
            {kunde.avdeling && (
              <p className="text-sm text-muted-foreground">{kunde.avdeling}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <p>
              <span className="text-muted-foreground print:text-black">Menygruppe:</span>{' '}
              {kunde.menygruppe_navn || `ID ${kunde.menygruppeid}`}
            </p>
            <p>
              <span className="text-muted-foreground print:text-black">Leveringsdag:</span>{' '}
              {getLeveringsdag(kunde.leveringsdag)}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground print:text-black mt-1 print:text-xs">
          {kunde.adresse && <span>{kunde.adresse}</span>}
          {kunde.postnr && kunde.sted && (
            <span>
              {kunde.postnr} {kunde.sted}
            </span>
          )}
          {kunde.telefonnummer && <span>Tlf: {kunde.telefonnummer}</span>}
        </div>
      </CardHeader>

      <CardContent className="print:pt-2">
        {/* Perioder med produkter */}
        <div className="space-y-4 print:space-y-2">
          {perioder.map((periode) => (
            <PeriodeTabell key={periode.menyperiodeid} periode={periode} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface PeriodeTabellProps {
  periode: PeriodeMedMenyer
}

function PeriodeTabell({ periode }: PeriodeTabellProps) {
  // Samle alle produkter fra alle menyer i perioden
  const alleProdukter = periode.menyer.flatMap((meny) => meny.produkter)

  if (alleProdukter.length === 0) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden print:border-black">
      <div className="bg-muted px-3 py-2 font-medium print:bg-gray-100 print:py-1">
        Uke {periode.ukenr}
        {periode.fradato && periode.tildato && (
          <span className="text-muted-foreground ml-2 text-sm">
            ({formatDate(periode.fradato)} - {formatDate(periode.tildato)})
          </span>
        )}
      </div>
      <table className="w-full text-sm print:text-xs">
        <thead>
          <tr className="border-b print:border-black">
            <th className="text-left px-3 py-2 w-16 print:py-1">ID</th>
            <th className="text-left px-3 py-2 print:py-1">Produkt</th>
            <th className="text-center px-3 py-2 w-24 print:py-1 print:w-20">Antall</th>
          </tr>
        </thead>
        <tbody>
          {alleProdukter.map((produkt) => (
            <tr key={produkt.produktid} className="border-b last:border-0 print:border-black">
              <td className="px-3 py-2 text-muted-foreground print:py-1">
                {produkt.produktid}
              </td>
              <td className="px-3 py-2 print:py-1">
                {produkt.visningsnavn || produkt.produktnavn}
              </td>
              <td className="px-3 py-2 text-center print:py-1">
                <div className="w-16 h-6 border border-gray-300 mx-auto print:border-black"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
