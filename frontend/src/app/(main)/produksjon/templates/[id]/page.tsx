"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { useTemplate, useUpdateTemplate, useDistributeTemplate } from "@/hooks/useProduksjon"
import { TemplateUpdateInput, TemplateDetalj } from "@/lib/api/produksjon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Trash2, GripVertical, Send, Loader2 } from "lucide-react"
import Link from "next/link"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { ErrorDisplay } from "@/components/error/error-display"
import { ProductSelector } from "@/components/produksjon/ProductSelector"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FormData {
  template_navn: string
  beskrivelse: string
  kundegruppe: number
  gyldig_fra: string
  gyldig_til: string
  aktiv: boolean
}

function EditTemplatePageContent() {
  const router = useRouter()
  const params = useParams()
  const templateId = Number(params.id)

  const { data: template, isLoading, error, refetch } = useTemplate(templateId)
  const updateMutation = useUpdateTemplate({
    onSuccess: () => {
      router.push('/produksjon/templates')
    }
  })
  const distributeMutation = useDistributeTemplate()

  const [detaljer, setDetaljer] = useState<Omit<TemplateDetalj, 'template_detaljid' | 'template_id'>[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      template_navn: "",
      beskrivelse: "",
      kundegruppe: 12,
      gyldig_fra: "",
      gyldig_til: "",
      aktiv: true,
    }
  })

  // Populate form when template loads
  useEffect(() => {
    if (template) {
      reset({
        template_navn: template.template_navn || "",
        beskrivelse: template.beskrivelse || "",
        kundegruppe: template.kundegruppe || 12,
        gyldig_fra: template.gyldig_fra ? template.gyldig_fra.split('T')[0] : "",
        gyldig_til: template.gyldig_til ? template.gyldig_til.split('T')[0] : "",
        aktiv: template.aktiv ?? true,
      })
      setDetaljer(template.detaljer || [])
    }
  }, [template, reset])

  const onSubmit = async (data: FormData) => {
    const input: TemplateUpdateInput = {
      ...data,
      gyldig_fra: data.gyldig_fra || undefined,
      gyldig_til: data.gyldig_til || undefined,
      detaljer: detaljer.map((d, idx) => ({
        produktid: d.produktid,
        kalkyleid: d.kalkyleid,
        standard_antall: d.standard_antall,
        maks_antall: d.maks_antall,
        paakrevd: d.paakrevd,
        linje_nummer: idx,
      })),
    }

    updateMutation.mutate({ id: templateId, data: input })
  }

  const handleAddProduct = (product: { produktid?: number; kalkyleid?: number; navn: string }) => {
    const newDetalj: Omit<TemplateDetalj, 'template_detaljid' | 'template_id'> = {
      produktid: product.produktid,
      kalkyleid: product.kalkyleid,
      standard_antall: 0,
      maks_antall: undefined,
      paakrevd: false,
      linje_nummer: detaljer.length,
      produkt: product.produktid ? { produktid: product.produktid, produktnavn: product.navn } : undefined,
      kalkyle: product.kalkyleid ? { kalkylekode: product.kalkyleid, kalkylenavn: product.navn } : undefined,
    }
    setDetaljer([...detaljer, newDetalj])
    setShowProductSelector(false)
  }

  const handleRemoveProduct = (index: number) => {
    setDetaljer(detaljer.filter((_, i) => i !== index))
  }

  const handleUpdateDetalj = (index: number, field: keyof TemplateDetalj, value: any) => {
    setDetaljer(detaljer.map((d, i) =>
      i === index ? { ...d, [field]: value } : d
    ))
  }

  const handleDistribute = async () => {
    try {
      await distributeMutation.mutateAsync({ templateId })
      setDistributeDialogOpen(false)
    } catch (error) {
      // Error handled in hook
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/produksjon/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Rediger template</h1>
        </div>
        <ErrorDisplay error={error} onRetry={refetch} showRetry={true} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/produksjon/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rediger template</h1>
            <p className="text-muted-foreground">
              {template?.template_navn}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setDistributeDialogOpen(true)}
        >
          <Send className="mr-2 h-4 w-4" />
          Distribuer
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
            <CardDescription>
              Definer template-informasjon og gyldighetsperiode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template_navn">Navn *</Label>
                <Input
                  id="template_navn"
                  {...register("template_navn", { required: "Navn er påkrevd" })}
                  placeholder="F.eks. Ukemeny uke 4"
                />
                {errors.template_navn && (
                  <p className="text-sm text-destructive">{errors.template_navn.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="kundegruppe">Kundegruppe</Label>
                <Input
                  id="kundegruppe"
                  type="number"
                  {...register("kundegruppe", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="beskrivelse">Beskrivelse</Label>
              <Textarea
                id="beskrivelse"
                {...register("beskrivelse")}
                placeholder="Valgfri beskrivelse av templaten..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gyldig_fra">Gyldig fra</Label>
                <Input
                  id="gyldig_fra"
                  type="date"
                  {...register("gyldig_fra")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gyldig_til">Gyldig til</Label>
                <Input
                  id="gyldig_til"
                  type="date"
                  {...register("gyldig_til")}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="aktiv"
                checked={watch("aktiv")}
                onCheckedChange={(checked) => setValue("aktiv", checked)}
              />
              <Label htmlFor="aktiv">Aktiv</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Produkter og retter</CardTitle>
                <CardDescription>
                  Legg til produkter eller oppskrifter som skal være tilgjengelige i templaten
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProductSelector(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Legg til produkt
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {detaljer.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ingen produkter lagt til ennå. Klikk "Legg til produkt" for å begynne.
              </div>
            ) : (
              <div className="space-y-2">
                {detaljer.map((detalj, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                    <div className="flex-1">
                      <p className="font-medium">
                        {detalj.produkt?.produktnavn || detalj.kalkyle?.kalkylenavn || "Ukjent produkt"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {detalj.produktid ? `Produkt #${detalj.produktid}` : `Oppskrift #${detalj.kalkyleid}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`standard-${index}`} className="text-sm whitespace-nowrap">
                          Standard:
                        </Label>
                        <Input
                          id={`standard-${index}`}
                          type="number"
                          min="0"
                          className="w-20"
                          value={detalj.standard_antall || 0}
                          onChange={(e) => handleUpdateDetalj(index, 'standard_antall', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Label htmlFor={`maks-${index}`} className="text-sm whitespace-nowrap">
                          Maks:
                        </Label>
                        <Input
                          id={`maks-${index}`}
                          type="number"
                          min="0"
                          className="w-20"
                          value={detalj.maks_antall || ""}
                          onChange={(e) => handleUpdateDetalj(index, 'maks_antall', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="-"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id={`paakrevd-${index}`}
                          checked={detalj.paakrevd || false}
                          onCheckedChange={(checked) => handleUpdateDetalj(index, 'paakrevd', checked)}
                        />
                        <Label htmlFor={`paakrevd-${index}`} className="text-sm">
                          Påkrevd
                        </Label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/produksjon/templates">Avbryt</Link>
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Lagrer..." : "Lagre endringer"}
          </Button>
        </div>
      </form>

      {/* Product Selector Dialog */}
      <ProductSelector
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onSelect={handleAddProduct}
        excludeIds={detaljer.map(d => d.produktid || 0).filter(Boolean)}
      />

      {/* Distribute Dialog */}
      <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen} modal={false}>
        <DialogContent onPointerDownOutside={() => setDistributeDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Distribuer template</DialogTitle>
            <DialogDescription>
              Distribuer "{template?.template_navn}" til alle kunder i kundegruppe {template?.kundegruppe || 12}.
              Dette vil opprette en produksjonsbestilling for hver kunde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDistributeDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleDistribute}
              disabled={distributeMutation.isPending}
            >
              {distributeMutation.isPending ? "Distribuerer..." : "Distribuer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EditTemplatePage() {
  return (
    <ErrorBoundary showDetails={true}>
      <EditTemplatePageContent />
    </ErrorBoundary>
  )
}
