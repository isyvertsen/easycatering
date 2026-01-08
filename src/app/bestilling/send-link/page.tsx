'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, ChevronsUpDown, Link2, Copy, CheckCircle2, Loader2, Mail, MailX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCustomersList } from '@/hooks/useCustomers'
import { useGenererKundelenke, useAktiveTokens } from '@/hooks/useBestillingRegistrer'
import { toast } from 'sonner'

export default function SendLinkPage() {
  const [kundeOpen, setKundeOpen] = useState(false)
  const [selectedKundeId, setSelectedKundeId] = useState<number | null>(null)
  const [expiresDays, setExpiresDays] = useState(7)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailAddress, setEmailAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Hent kunder
  const { data: kunderData, isLoading: kunderLoading } = useCustomersList({
    page_size: 500,
    sort_by: 'kundenavn',
    sort_order: 'asc',
  })

  // Finn valgt kunde
  const selectedKunde = useMemo(() => {
    if (!selectedKundeId || !kunderData?.items) return null
    return kunderData.items.find((k) => k.kundeid === selectedKundeId)
  }, [selectedKundeId, kunderData])

  // Hent aktive tokens for valgt kunde
  const { data: aktiveTokens, isLoading: tokensLoading } = useAktiveTokens(selectedKundeId ?? undefined)

  // Mutation for å generere lenke
  const genererLenkeMutation = useGenererKundelenke()

  // Generer lenke
  const handleGenererLenke = async () => {
    if (!selectedKundeId) {
      toast.error('Velg en kunde')
      return
    }

    try {
      const result = await genererLenkeMutation.mutateAsync({
        kundeid: selectedKundeId,
        expires_days: expiresDays,
      })
      setGeneratedLink(result.link)
      setEmailSent(result.email_sent)
      setEmailAddress(result.email_address)

      if (result.email_sent) {
        toast.success(`Lenke generert og sendt til ${result.email_address}`)
      } else if (selectedKunde?.epost) {
        toast.warning('Lenke generert, men e-post kunne ikke sendes')
      } else {
        toast.success('Lenke generert (kunden har ingen e-postadresse)')
      }
    } catch (error) {
      toast.error('Kunne ikke generere lenke')
    }
  }

  // Kopier lenke
  const handleCopyLink = async () => {
    if (!generatedLink) return

    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      toast.success('Lenke kopiert!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Kunne ikke kopiere lenke')
    }
  }

  // Format dato
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Send Kundelenke</h1>
        <p className="text-muted-foreground mt-1">
          Generer en unik lenke som kunden kan bruke til å legge inn bestilling
        </p>
      </div>

      {/* Kundevalg */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Velg kunde</CardTitle>
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
                          setGeneratedLink(null)
                          setEmailSent(false)
                          setEmailAddress(null)
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
                  <span className="text-muted-foreground">E-post:</span>{' '}
                  {selectedKunde.epost || '-'}
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

      {/* Generer lenke */}
      {selectedKunde && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Generer ny lenke</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires">Gyldig i (dager)</Label>
                <Input
                  id="expires"
                  type="number"
                  min={1}
                  max={90}
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(parseInt(e.target.value) || 7)}
                  className="w-24"
                />
              </div>
              <Button
                onClick={handleGenererLenke}
                disabled={genererLenkeMutation.isPending}
              >
                {genererLenkeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Generer lenke
              </Button>
            </div>

            {generatedLink && (
              <div className="space-y-3">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <code className="text-sm break-all">{generatedLink}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyLink}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>

                {/* E-poststatus */}
                {emailSent ? (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      E-post sendt til <strong>{emailAddress}</strong>
                    </AlertDescription>
                  </Alert>
                ) : selectedKunde?.epost ? (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <MailX className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      E-post kunne ikke sendes. Kopier lenken og send manuelt til {selectedKunde.epost}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-gray-50 border-gray-200">
                    <MailX className="h-4 w-4 text-gray-500" />
                    <AlertDescription className="text-gray-600">
                      Kunden har ingen e-postadresse registrert. Kopier lenken og del den manuelt.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Aktive lenker */}
      {selectedKunde && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Aktive lenker for denne kunden</CardTitle>
          </CardHeader>
          <CardContent>
            {tokensLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : aktiveTokens && aktiveTokens.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lenke</TableHead>
                    <TableHead>Utloper</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aktiveTokens.map((token) => (
                    <TableRow key={token.token}>
                      <TableCell>
                        <code className="text-xs">{token.link}</code>
                      </TableCell>
                      <TableCell>{formatDate(token.expires_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Ingen aktive lenker for denne kunden
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
