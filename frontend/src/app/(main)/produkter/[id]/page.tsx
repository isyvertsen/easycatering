"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { useProdukt, useUpdateProdukt } from "@/hooks/useProdukter"
import { useKategorierList } from "@/hooks/useKategorier"
import { useLeverandorerList } from "@/hooks/useLeverandorer"
import { Produkt } from "@/lib/api/produkter"
import { toast } from "sonner"

export default function EditProduktPage() {
  const router = useRouter()
  const params = useParams()
  const produktId = parseInt(params.id as string)

  const { data: produkt, isLoading } = useProdukt(produktId)
  const { data: kategorierData, isLoading: kategorierLoading } = useKategorierList()
  const { data: leverandorerData, isLoading: leverandorerLoading } = useLeverandorerList()
  const updateMutation = useUpdateProdukt()

  const kategorier = kategorierData?.items || []
  const leverandorer = leverandorerData?.items || []

  const [formData, setFormData] = useState<Partial<Produkt>>({})

  useEffect(() => {
    if (produkt) {
      setFormData(produkt)
    }
  }, [produkt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateMutation.mutateAsync({
        id: produktId,
        data: formData
      })
      toast.success("Produkt oppdatert!")
      router.push("/produkter")
    } catch (error) {
      toast.error("Kunne ikke oppdatere produkt")
    }
  }

  const handleChange = (field: keyof Produkt, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <p>Laster...</p>
        </div>
      </div>
    )
  }

  if (!produkt) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <p>Produkt ikke funnet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/produkter")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rediger Produkt</h1>
            <p className="text-muted-foreground">
              ID: {produktId} - {produkt.produktnavn}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Produktinformasjon</CardTitle>
              <CardDescription>
                Oppdater produktets detaljer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="produktnavn">Produktnavn *</Label>
                  <Input
                    id="produktnavn"
                    value={formData.produktnavn || ""}
                    onChange={(e) => handleChange("produktnavn", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kategoriid">Kategori</Label>
                  <Select
                    value={formData.kategoriid?.toString() || ""}
                    onValueChange={(value) => handleChange("kategoriid", value ? parseInt(value) : null)}
                    disabled={kategorierLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={kategorierLoading ? "Laster..." : "Velg kategori"} />
                    </SelectTrigger>
                    <SelectContent>
                      {kategorier.map((kategori) => (
                        <SelectItem key={kategori.kategoriid} value={kategori.kategoriid.toString()}>
                          {kategori.kategori}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="levrandorid">Leverandør</Label>
                  <Select
                    value={formData.levrandorid?.toString() || ""}
                    onValueChange={(value) => handleChange("levrandorid", value ? parseInt(value) : null)}
                    disabled={leverandorerLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={leverandorerLoading ? "Laster..." : "Velg leverandør"} />
                    </SelectTrigger>
                    <SelectContent>
                      {leverandorer.map((leverandor) => (
                        <SelectItem key={leverandor.leverandorid} value={leverandor.leverandorid.toString()}>
                          {leverandor.leverandornavn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ean_kode">GTIN/EAN-kode (Basis)</Label>
                  <Input
                    id="ean_kode"
                    value={formData.ean_kode || ""}
                    onChange={(e) => handleChange("ean_kode", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gtin_fpak">GTIN F-pak (Forbrukerpakk)</Label>
                  <Input
                    id="gtin_fpak"
                    value={formData.gtin_fpak || ""}
                    onChange={(e) => handleChange("gtin_fpak", e.target.value)}
                    placeholder="GTIN for forbrukerenhet"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gtin_dpak">GTIN D-pak (Distribusjonspakk)</Label>
                  <Input
                    id="gtin_dpak"
                    value={formData.gtin_dpak || ""}
                    onChange={(e) => handleChange("gtin_dpak", e.target.value)}
                    placeholder="GTIN for grossistenhet"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gtin_pall">GTIN Pall</Label>
                  <Input
                    id="gtin_pall"
                    value={formData.gtin_pall || ""}
                    onChange={(e) => handleChange("gtin_pall", e.target.value)}
                    placeholder="GTIN for pallenivå"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leverandorsproduktnr">Leverandørsproduktnr</Label>
                  <Input
                    id="leverandorsproduktnr"
                    value={formData.leverandorsproduktnr || ""}
                    onChange={(e) => handleChange("leverandorsproduktnr", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pakningstype">Pakningstype</Label>
                  <Input
                    id="pakningstype"
                    value={formData.pakningstype || ""}
                    onChange={(e) => handleChange("pakningstype", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pakningsstorrelse">Pakningsstørrelse</Label>
                  <Input
                    id="pakningsstorrelse"
                    value={formData.pakningsstorrelse || ""}
                    onChange={(e) => handleChange("pakningsstorrelse", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="antalleht">Antall enheter</Label>
                  <Input
                    id="antalleht"
                    type="number"
                    step="0.01"
                    value={formData.antalleht || ""}
                    onChange={(e) => handleChange("antalleht", parseFloat(e.target.value) || null)}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Priser</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pris">Pris</Label>
                    <Input
                      id="pris"
                      type="number"
                      step="0.01"
                      value={formData.pris || ""}
                      onChange={(e) => handleChange("pris", parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paknpris">Pakningspris</Label>
                    <Input
                      id="paknpris"
                      type="number"
                      step="0.01"
                      value={formData.paknpris || ""}
                      onChange={(e) => handleChange("paknpris", parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mvaverdi">MVA (%)</Label>
                    <Input
                      id="mvaverdi"
                      type="number"
                      step="0.01"
                      value={formData.mvaverdi || ""}
                      onChange={(e) => handleChange("mvaverdi", parseFloat(e.target.value) || null)}
                    />
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Lager</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lagermengde">Lagermengde</Label>
                    <Input
                      id="lagermengde"
                      type="number"
                      step="0.01"
                      value={formData.lagermengde || ""}
                      onChange={(e) => handleChange("lagermengde", parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bestillingsgrense">Bestillingsgrense</Label>
                    <Input
                      id="bestillingsgrense"
                      type="number"
                      step="0.01"
                      value={formData.bestillingsgrense || ""}
                      onChange={(e) => handleChange("bestillingsgrense", parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bestillingsmengde">Bestillingsmengde</Label>
                    <Input
                      id="bestillingsmengde"
                      type="number"
                      step="0.01"
                      value={formData.bestillingsmengde || ""}
                      onChange={(e) => handleChange("bestillingsmengde", parseFloat(e.target.value) || null)}
                    />
                  </div>
                </div>
              </div>

              {/* Display Names */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Visningsnavn</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visningsnavn">Visningsnavn</Label>
                    <Input
                      id="visningsnavn"
                      value={formData.visningsnavn || ""}
                      onChange={(e) => handleChange("visningsnavn", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visningsnavn2">Visningsnavn 2</Label>
                    <Input
                      id="visningsnavn2"
                      value={formData.visningsnavn2 || ""}
                      onChange={(e) => handleChange("visningsnavn2", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Status</h3>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="webshop"
                      checked={formData.webshop || false}
                      onCheckedChange={(checked) => handleChange("webshop", checked)}
                    />
                    <Label htmlFor="webshop" className="cursor-pointer">
                      Tilgjengelig i webshop
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rett_komponent"
                      checked={formData.rett_komponent || false}
                      onCheckedChange={(checked) => handleChange("rett_komponent", checked)}
                    />
                    <Label htmlFor="rett_komponent" className="cursor-pointer">
                      Rettkomponent (kan brukes i rettsammensetning)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="utgatt"
                      checked={formData.utgatt || false}
                      onCheckedChange={(checked) => handleChange("utgatt", checked)}
                    />
                    <Label htmlFor="utgatt" className="cursor-pointer">
                      Utgått
                    </Label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/produkter")}
                >
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? "Lagrer..." : "Lagre endringer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
