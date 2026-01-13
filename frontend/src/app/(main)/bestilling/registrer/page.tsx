'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, ChevronsUpDown, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCustomersList } from '@/hooks/useCustomers'
import { useBestillingSkjema } from '@/hooks/useBestillingSkjema'
import { usePerioderList } from '@/hooks/usePerioder'
import { useOpprettOrdre } from '@/hooks/useBestillingRegistrer'
import { toast } from 'sonner'

interface PeriodeBestillingState {
  [periodeid: number]: {
    [produktid: number]: number
  }
}

export default function BestillingRegistrerPage() {
  const [kundeOpen, setKundeOpen] = useState(false)
  const [selectedKundeId, setSelectedKundeId] = useState<number | null>(null)
  const [fraPeriodeId, setFraPeriodeId] = useState<number | undefined>(undefined)
  const [tilPeriodeId, setTilPeriodeId] = useState<number | undefined>(undefined)
  const [bestillinger, setBestillinger] = useState<PeriodeBestillingState>({})

  // Hent kunder
  const { data: kunderData, isLoading: kunderLoading } = useCustomersList({
    page_size: 500,
    sort_by: 'kundenavn',
    sort_order: 'asc',
  })

  // Hent perioder for velgerne
  const { data: perioderData, isLoading: perioderLoading } = usePerioderList({
    page_size: 50,
    sort_by: 'fradato',
    sort_order: 'asc',
  })

  // Sett standardverdier når perioder er lastet
  useEffect(() => {
    if (perioderData?.items && perioderData.items.length > 0 && !fraPeriodeId && !tilPeriodeId) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const kommendePerioder = perioderData.items.filter((p) => {
        if (!p.fradato) return false
        const fradato = new Date(p.fradato)
        return fradato >= today
      })

      if (kommendePerioder.length >= 2) {
        setFraPeriodeId(kommendePerioder[0].menyperiodeid)
        setTilPeriodeId(kommendePerioder[Math.min(3, kommendePerioder.length - 1)].menyperiodeid)
      } else if (perioderData.items.length >= 2) {
        setFraPeriodeId(perioderData.items[0].menyperiodeid)
        setTilPeriodeId(perioderData.items[Math.min(3, perioderData.items.length - 1)].menyperiodeid)
      }
    }
  }, [perioderData, fraPeriodeId, tilPeriodeId])

  // Hent bestillingsskjema med produkter (samme som skjema-siden)
  const { data: skjemaData, isLoading: skjemaLoading } = useBestillingSkjema({
    fra_periode_id: fraPeriodeId,
    til_periode_id: tilPeriodeId,
  })

  // Finn valgt kunde
  const selectedKunde = useMemo(() => {
    if (!selectedKundeId || !kunderData?.items) return null
    return kunderData.items.find((k) => k.kundeid === selectedKundeId)
  }, [selectedKundeId, kunderData])

  // Mutation for å opprette ordre
  const opprettOrdreMutation = useOpprettOrdre()

  // Oppdater antall for et produkt i en periode
  const updateAntall = (periodeid: number, produktid: number, antall: number) => {
    setBestillinger((prev) => ({
      ...prev,
      [periodeid]: {
        ...prev[periodeid],
        [produktid]: antall,
      },
    }))
  }

  // Lagre bestilling
  const handleSave = async () => {
    if (!selectedKundeId) {
      toast.error('Velg en kunde')
      return
    }

    // Bygg request - en ordre per periode som har produkter
    const perioder = Object.entries(bestillinger)
      .map(([periodeid, produkter]) => ({
        periodeid: parseInt(periodeid),
        linjer: Object.entries(produkter as Record<string, number>)
          .filter(([_, antall]) => antall > 0)
          .map(([produktid, antall]) => ({
            produktid: parseInt(produktid),
            antall,
          })),
      }))
      .filter((p) => p.linjer.length > 0)

    if (perioder.length === 0) {
      toast.error('Legg inn antall for minst ett produkt')
      return
    }

    try {
      const result = await opprettOrdreMutation.mutateAsync({
        kundeid: selectedKundeId,
        perioder,
      })
      toast.success(result.melding)

      // Reset form
      setBestillinger({})
    } catch (error) {
      toast.error('Kunne ikke opprette ordre')
    }
  }

  const formatPeriodeLabel = (periode: { ukenr: number | null; fradato: string | null }) => {
    const uke = periode.ukenr ? `Uke ${periode.ukenr}` : ''
    const dato = periode.fradato
      ? new Date(periode.fradato).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
      : ''
    return uke && dato ? `${uke} (${dato})` : uke || dato || 'Ukjent'
  }

  const formatDateRange = (fradato: string | null, tildato: string | null) => {
    const fra = fradato
      ? new Date(fradato).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
      : ''
    const til = tildato
      ? new Date(tildato).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
      : ''
    return fra && til ? `(${fra} - ${til})` : ''
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registrer Bestilling</h1>
          <p className="text-muted-foreground mt-1">
            Registrer bestillinger fra papirskjema
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!selectedKundeId || opprettOrdreMutation.isPending}
        >
          {opprettOrdreMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Lagre bestilling
        </Button>
      </div>

      {/* Periode-velgere */}
      <div className="flex gap-4 items-end flex-wrap">
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

      {/* Kundevalg */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Kunde</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={kundeOpen} onOpenChange={setKundeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={kundeOpen}
                className="w-full justify-between"
              >
                {selectedKunde
                  ? `${selectedKunde.kundeid} - ${selectedKunde.kundenavn}`
                  : 'Velg kunde...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Sok etter kunde..." />
                <CommandList>
                  <CommandEmpty>Ingen kunder funnet.</CommandEmpty>
                  <CommandGroup>
                    {kunderData?.items?.map((kunde) => (
                      <CommandItem
                        key={kunde.kundeid}
                        value={`${kunde.kundeid} ${kunde.kundenavn}`}
                        onSelect={() => {
                          setSelectedKundeId(kunde.kundeid)
                          setKundeOpen(false)
                          setBestillinger({})
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedKundeId === kunde.kundeid ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {kunde.kundeid} - {kunde.kundenavn}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedKunde && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Menygruppe:</span>{' '}
                  {selectedKunde.menygruppeid || 'Ikke satt'}
                </div>
                <div>
                  <span className="text-muted-foreground">Leveringsdag:</span>{' '}
                  {selectedKunde.leveringsdag || '-'}
                </div>
                {selectedKunde.adresse && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Adresse:</span>{' '}
                    {selectedKunde.adresse}, {selectedKunde.postnr} {selectedKunde.sted}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Produkter per periode - samme layout som bestillingsskjema */}
      {selectedKunde && skjemaLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {selectedKunde && skjemaData?.perioder && skjemaData.perioder.length > 0 && (
        <div className="space-y-6">
          {skjemaData.perioder.map((periode) => {
            // Samle alle produkter fra alle menyer i perioden
            const produkter = periode.menyer.flatMap((meny) => meny.produkter)

            if (produkter.length === 0) return null

            return (
              <Card key={periode.menyperiodeid}>
                <CardHeader className="pb-3 bg-muted/50">
                  <CardTitle className="text-lg">
                    Uke {periode.ukenr}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatDateRange(periode.fradato, periode.tildato)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 w-16">ID</th>
                        <th className="text-left py-2 px-3">Produkt</th>
                        <th className="text-right py-2 px-3 w-24">Antall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produkter.map((produkt) => (
                        <tr key={produkt.produktid} className="border-b last:border-0">
                          <td className="py-2 px-3 text-muted-foreground">
                            {produkt.produktid}
                          </td>
                          <td className="py-2 px-3">
                            {produkt.visningsnavn || produkt.produktnavn}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Input
                              type="number"
                              min={0}
                              className="w-20 ml-auto text-center"
                              value={
                                bestillinger[periode.menyperiodeid]?.[produkt.produktid] || ''
                              }
                              onChange={(e) =>
                                updateAntall(
                                  periode.menyperiodeid,
                                  produkt.produktid,
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedKunde && !skjemaLoading && (!skjemaData?.perioder || skjemaData.perioder.length === 0) && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Ingen produkter funnet for valgte perioder
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
