'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Send, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useKundeMeny, useSubmitKundeBestilling } from '@/hooks/useBestillingRegistrer'

interface PeriodeBestillingState {
  [periodeid: number]: {
    [produktid: number]: number
  }
}

export default function KundePortalPage() {
  const params = useParams()
  const token = params.token as string

  const [selectedPerioder, setSelectedPerioder] = useState<number[]>([])
  const [bestillinger, setBestillinger] = useState<PeriodeBestillingState>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Hent kundemeny via token
  const { data: menyData, isLoading, error } = useKundeMeny(token)

  // Mutation for å sende inn bestilling
  const submitMutation = useSubmitKundeBestilling(token)

  // Toggle periode valg
  const togglePeriode = (periodeid: number) => {
    setSelectedPerioder((prev) =>
      prev.includes(periodeid) ? prev.filter((p) => p !== periodeid) : [...prev, periodeid]
    )
  }

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

  // Hent alle unike produkter fra valgte perioder
  const produkter = useMemo(() => {
    if (!menyData?.perioder) return []

    const produktMap = new Map<
      number,
      { produktid: number; produktnavn: string | null; visningsnavn: string | null }
    >()

    menyData.perioder
      .filter((p) => selectedPerioder.includes(p.periodeid))
      .forEach((periode) => {
        periode.produkter.forEach((produkt) => {
          if (!produktMap.has(produkt.produktid)) {
            produktMap.set(produkt.produktid, {
              produktid: produkt.produktid,
              produktnavn: produkt.produktnavn,
              visningsnavn: produkt.visningsnavn,
            })
          }
        })
      })

    return Array.from(produktMap.values()).sort((a, b) =>
      (a.visningsnavn || a.produktnavn || '').localeCompare(
        b.visningsnavn || b.produktnavn || ''
      )
    )
  }, [menyData, selectedPerioder])

  // Send inn bestilling
  const handleSubmit = async () => {
    // Bygg request
    const perioder = selectedPerioder.map((periodeid) => ({
      periodeid,
      linjer: Object.entries(bestillinger[periodeid] || {})
        .filter(([_, antall]) => antall > 0)
        .map(([produktid, antall]) => ({
          produktid: parseInt(produktid),
          antall,
        })),
    }))

    try {
      await submitMutation.mutateAsync({ perioder })
      setIsSubmitted(true)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const formatPeriodeLabel = (periode: {
    ukenr: number | null
    fradato: string | null
    tildato: string | null
  }) => {
    const uke = periode.ukenr ? `Uke ${periode.ukenr}` : ''
    const fraDato = periode.fradato
      ? new Date(periode.fradato).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
      : ''
    const tilDato = periode.tildato
      ? new Date(periode.tildato).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
      : ''
    const datoRange = fraDato && tilDato ? `${fraDato} - ${tilDato}` : ''
    return { uke, datoRange }
  }

  const formatExpiryDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('no-NO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-lg mx-auto mt-20">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ugyldig lenke</AlertTitle>
            <AlertDescription>
              {error.message || 'Denne lenken er ugyldig eller har utlopt.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Success state
  if (isSubmitted && submitMutation.data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-lg mx-auto mt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold">Takk for din bestilling!</h2>
                <p className="text-muted-foreground">{submitMutation.data.melding}</p>
                {submitMutation.data.ordre_ids.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ordrenummer: {submitMutation.data.ordre_ids.join(', ')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold">
                NER
              </div>
              <div>
                <div className="text-xl font-bold">LKC</div>
                <div className="text-sm text-muted-foreground">Larvik Kommunale Catering</div>
                <div className="text-xs text-muted-foreground">Vikingveien 4, 3274 LARVIK</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Bestillingsskjema</div>
              {menyData?.token_expires_at && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end mt-1">
                  <Clock className="h-3 w-3" />
                  Gyldig til {formatExpiryDate(menyData.token_expires_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Velkommen */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold">
              Velkommen, {menyData?.kundenavn || 'kunde'}!
            </h2>
            <p className="text-muted-foreground mt-1">
              Fyll ut din bestilling for de valgte ukene.
              {menyData?.menygruppe_navn && (
                <span className="ml-2 text-sm">
                  (Menygruppe: {menyData.menygruppe_navn})
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Periodevalg */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Velg uker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {menyData?.perioder.map((periode) => {
                const { uke, datoRange } = formatPeriodeLabel(periode)
                return (
                  <label
                    key={periode.periodeid}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer transition-colors',
                      selectedPerioder.includes(periode.periodeid)
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Checkbox
                      checked={selectedPerioder.includes(periode.periodeid)}
                      onCheckedChange={() => togglePeriode(periode.periodeid)}
                    />
                    <div>
                      <div className="font-medium">{uke}</div>
                      {datoRange && (
                        <div className="text-xs text-muted-foreground">{datoRange}</div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>

            {menyData?.perioder.length === 0 && (
              <p className="text-muted-foreground">Ingen perioder tilgjengelig</p>
            )}
          </CardContent>
        </Card>

        {/* Produkttabell */}
        {selectedPerioder.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Produkter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Produkt</th>
                      {menyData?.perioder
                        .filter((p) => selectedPerioder.includes(p.periodeid))
                        .map((periode) => (
                          <th key={periode.periodeid} className="text-center py-2 px-3 w-24">
                            Uke {periode.ukenr}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produkter.map((produkt) => (
                      <tr key={produkt.produktid} className="border-b last:border-0">
                        <td className="py-3 px-3">
                          {produkt.visningsnavn || produkt.produktnavn}
                        </td>
                        {menyData?.perioder
                          .filter((p) => selectedPerioder.includes(p.periodeid))
                          .map((periode) => (
                            <td key={periode.periodeid} className="py-2 px-3 text-center">
                              <Input
                                type="number"
                                min={0}
                                className="w-20 mx-auto text-center"
                                value={
                                  bestillinger[periode.periodeid]?.[produkt.produktid] || ''
                                }
                                onChange={(e) =>
                                  updateAntall(
                                    periode.periodeid,
                                    produkt.produktid,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {produkter.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Ingen produkter funnet for valgte uker
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {selectedPerioder.length > 0 && produkter.length > 0 && (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send inn bestilling
            </Button>
          </div>
        )}

        {submitMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Feil</AlertTitle>
            <AlertDescription>
              {submitMutation.error.message || 'Kunne ikke sende inn bestilling'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
