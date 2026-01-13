"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import {
  ArrowLeft,
  Copy,
  Plus,
  Trash2,
  Package,
  UtensilsCrossed,
  CalendarDays,
  Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { usePeriodeView, useFjernMenyer } from "@/hooks/usePeriodeView"
import { PeriodeViewMenygruppe, PeriodeViewMeny } from "@/types/periode-view"
import { KopierPeriodeDialog } from "@/components/perioder/kopier-periode-dialog"
import { TilordneMenyerDialog } from "@/components/perioder/tilordne-menyer-dialog"
import { ProduktByttePopover } from "@/components/perioder/produkt-bytte-popover"

export default function PeriodeViewPage() {
  const params = useParams()
  const router = useRouter()
  const periodeId = parseInt(params.id as string)

  // Dialog states
  const [kopierDialogOpen, setKopierDialogOpen] = useState(false)
  const [tilordneDialogOpen, setTilordneDialogOpen] = useState(false)
  const [selectedMenyIds, setSelectedMenyIds] = useState<number[]>([])

  // Fetch period view data
  const { data: periodeView, isLoading, error } = usePeriodeView(periodeId)
  const fjernMenyerMutation = useFjernMenyer()

  // Handle menu selection toggle
  const handleToggleMeny = (menyId: number) => {
    setSelectedMenyIds((prev) =>
      prev.includes(menyId)
        ? prev.filter((id) => id !== menyId)
        : [...prev, menyId]
    )
  }

  // Handle bulk remove
  const handleFjernValgte = async () => {
    if (selectedMenyIds.length === 0) return

    await fjernMenyerMutation.mutateAsync({
      periodeId,
      menyIds: selectedMenyIds
    })
    setSelectedMenyIds([])
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy", { locale: nb })
    } catch {
      return dateString
    }
  }

  // Loading state
  if (isLoading) {
    return <PeriodeViewSkeleton />
  }

  // Error state
  if (error || !periodeView) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/perioder")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til perioder
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Kunne ikke laste periodevisning. Sjekk at backend-API er tilgjengelig.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation and actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push("/perioder")} className="mb-2 -ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til perioder
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Uke {periodeView.ukenr}
          </h1>
          <p className="text-muted-foreground mt-1">
            {formatDate(periodeView.fradato)} - {formatDate(periodeView.tildato)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setKopierDialogOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Kopier periode
          </Button>
          <Button variant="outline" onClick={() => setTilordneDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Legg til menyer
          </Button>
          <Button
            variant="outline"
            onClick={handleFjernValgte}
            disabled={selectedMenyIds.length === 0 || fjernMenyerMutation.isPending}
          >
            {fjernMenyerMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Fjern valgte ({selectedMenyIds.length})
          </Button>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menygrupper
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodeView.menygrupper.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt menyer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodeView.total_menyer}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt produkter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodeView.total_produkter}</div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchical accordion view */}
      <Card>
        <CardHeader>
          <CardTitle>Menystruktur</CardTitle>
          <CardDescription>
            Klikk for a utvide menygrupper og se detaljert innhold. Velg menyer for a fjerne dem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periodeView.menygrupper.length === 0 ? (
            <div className="text-center py-12">
              <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Ingen menyer i denne perioden enda
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setTilordneDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Legg til menyer
              </Button>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {periodeView.menygrupper.map((gruppe) => (
                <MenygruppeAccordionItem
                  key={gruppe.gruppeid}
                  gruppe={gruppe}
                  selectedMenyIds={selectedMenyIds}
                  onToggleMeny={handleToggleMeny}
                />
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <KopierPeriodeDialog
        open={kopierDialogOpen}
        onOpenChange={setKopierDialogOpen}
        kildePeriodeId={periodeId}
        kildeUkenr={periodeView.ukenr}
      />
      <TilordneMenyerDialog
        open={tilordneDialogOpen}
        onOpenChange={setTilordneDialogOpen}
        periodeId={periodeId}
      />
    </div>
  )
}

// Subcomponent for menu group accordion (Level 1)
function MenygruppeAccordionItem({
  gruppe,
  selectedMenyIds,
  onToggleMeny
}: {
  gruppe: PeriodeViewMenygruppe
  selectedMenyIds: number[]
  onToggleMeny: (menyId: number) => void
}) {
  const totalProdukter = gruppe.menyer.reduce((sum, m) => sum + m.produkt_antall, 0)

  return (
    <AccordionItem value={`gruppe-${gruppe.gruppeid}`}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <span className="font-semibold">{gruppe.beskrivelse}</span>
          <Badge variant="secondary">{gruppe.menyer.length} menyer</Badge>
          <Badge variant="outline">{totalProdukter} produkter</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-4 pt-2 space-y-2">
          {gruppe.menyer.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Ingen menyer i denne gruppen
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {gruppe.menyer.map((meny) => (
                <MenyAccordionItem
                  key={meny.menyid}
                  meny={meny}
                  isSelected={selectedMenyIds.includes(meny.menyid)}
                  onToggle={() => onToggleMeny(meny.menyid)}
                />
              ))}
            </Accordion>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// Subcomponent for menu accordion (Level 2)
function MenyAccordionItem({
  meny,
  isSelected,
  onToggle
}: {
  meny: PeriodeViewMeny
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <AccordionItem value={`meny-${meny.menyid}`} className="border rounded-lg mb-2">
      <div className="flex items-center gap-3 px-4 py-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
        />
        <AccordionTrigger className="hover:no-underline py-0 flex-1">
          <div className="flex items-center gap-3 w-full">
            <span className="flex-1 text-left">{meny.beskrivelse}</span>
            <Badge variant="outline" className="mr-2">
              <Package className="h-3 w-3 mr-1" />
              {meny.produkt_antall}
            </Badge>
          </div>
        </AccordionTrigger>
      </div>
      <AccordionContent>
        <div className="pb-3">
          {meny.produkter.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-8">Ingen produkter</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right w-24">Pris</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meny.produkter.map((produkt) => (
                  <TableRow key={produkt.produktid}>
                    <TableCell>{produkt.produktnavn}</TableCell>
                    <TableCell className="text-right">
                      {produkt.pris != null ? `kr ${produkt.pris.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProduktByttePopover
                        menyId={meny.menyid}
                        currentProduktId={produkt.produktid}
                        currentProduktNavn={produkt.produktnavn}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// Skeleton loading component
function PeriodeViewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
