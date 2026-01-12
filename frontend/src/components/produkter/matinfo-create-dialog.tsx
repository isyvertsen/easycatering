"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, X, Loader2, Package } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

interface MatinfoCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (productId: string, gtin: string) => void
  prefillGtin?: string
  prefillName?: string
}

interface Allergen {
  code: string
  name: string
  level: "FREE_FROM" | "MAY_CONTAIN" | "CONTAINS"
}

interface Nutrient {
  code: string
  name: string
  measurement: number
  measurementType: string
  measurementPrecision: string
}

const COMMON_ALLERGENS = [
  { code: "AW", name: "Gluten", category: "Korn" },
  { code: "UW", name: "Hvete", category: "Korn" },
  { code: "NR", name: "Rug", category: "Korn" },
  { code: "GB", name: "Bygg", category: "Korn" },
  { code: "GO", name: "Havre", category: "Korn" },
  { code: "AC", name: "Skalldyr", category: "Skalldyr" },
  { code: "AE", name: "Egg", category: "Egg" },
  { code: "AF", name: "Fisk", category: "Fisk" },
  { code: "AP", name: "Peanøtter", category: "Nøtter" },
  { code: "AY", name: "Soya", category: "Belgfrukter" },
  { code: "AM", name: "Melk/Laktose", category: "Melk" },
  { code: "SA", name: "Mandler", category: "Nøtter" },
  { code: "SH", name: "Hasselnøtter", category: "Nøtter" },
  { code: "SW", name: "Valnøtter", category: "Nøtter" },
  { code: "SC", name: "Kasjunøtter", category: "Nøtter" },
  { code: "SP", name: "Pekannøtter", category: "Nøtter" },
  { code: "SR", name: "Paranøtter", category: "Nøtter" },
  { code: "ST", name: "Pistasjnøtter", category: "Nøtter" },
  { code: "SM", name: "Makadamianøtter", category: "Nøtter" },
  { code: "BC", name: "Selleri", category: "Grønnsaker" },
  { code: "BM", name: "Sennep", category: "Krydder" },
  { code: "AS", name: "Sesamfrø", category: "Frø" },
  { code: "AU", name: "Svoveldioksid/sulfitt", category: "Tilsetningsstoff" },
  { code: "NL", name: "Lupin", category: "Belgfrukter" },
  { code: "UM", name: "Bløtdyr", category: "Bløtdyr" },
]

const COMMON_NUTRIENTS = [
  { code: "ENER-", name: "Energi (kJ)", unit: "kJ", type: "APPROXIMATELY" },
  { code: "ENER_KCAL", name: "Energi (kcal)", unit: "kcal", type: "APPROXIMATELY" },
  { code: "FAT", name: "Fett", unit: "g", type: "APPROXIMATELY" },
  { code: "FASAT", name: "Mettet fett", unit: "g", type: "APPROXIMATELY" },
  { code: "CHOAVL", name: "Karbohydrater", unit: "g", type: "APPROXIMATELY" },
  { code: "SUGAR-", name: "Sukkerarter", unit: "g", type: "APPROXIMATELY" },
  { code: "FIBTG", name: "Kostfiber", unit: "g", type: "APPROXIMATELY" },
  { code: "PRO-", name: "Protein", unit: "g", type: "APPROXIMATELY" },
  { code: "SALTEQ", name: "Salt", unit: "g", type: "APPROXIMATELY" },
]

export function MatinfoCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  prefillGtin,
  prefillName,
}: MatinfoCreateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Basic info
  const [gtin, setGtin] = useState(prefillGtin || "")
  const [name, setName] = useState(prefillName || "")
  const [brandName, setBrandName] = useState("")
  const [producerName, setProducerName] = useState("")
  const [providerName, setProviderName] = useState("")
  const [packageSize, setPackageSize] = useState("")
  const [ingredientStatement, setIngredientStatement] = useState("")

  // Allergens
  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [selectedAllergenCode, setSelectedAllergenCode] = useState("")
  const [selectedAllergenLevel, setSelectedAllergenLevel] = useState<"FREE_FROM" | "MAY_CONTAIN" | "CONTAINS">("CONTAINS")

  // Nutrients
  const [nutrients, setNutrients] = useState<Nutrient[]>([])
  const [selectedNutrientCode, setSelectedNutrientCode] = useState("")
  const [selectedNutrientValue, setSelectedNutrientValue] = useState("")

  const handleAddAllergen = () => {
    if (!selectedAllergenCode) return

    const allergenInfo = COMMON_ALLERGENS.find(a => a.code === selectedAllergenCode)
    if (!allergenInfo) return

    // Check if allergen already exists
    if (allergens.some(a => a.code === selectedAllergenCode)) {
      toast({
        title: "Allergen finnes allerede",
        description: "Dette allergenet er allerede lagt til",
        variant: "destructive",
      })
      return
    }

    setAllergens([...allergens, {
      code: selectedAllergenCode,
      name: allergenInfo.name,
      level: selectedAllergenLevel,
    }])

    setSelectedAllergenCode("")
  }

  const handleRemoveAllergen = (code: string) => {
    setAllergens(allergens.filter(a => a.code !== code))
  }

  const handleAddNutrient = () => {
    if (!selectedNutrientCode || !selectedNutrientValue) return

    const nutrientInfo = COMMON_NUTRIENTS.find(n => n.code === selectedNutrientCode)
    if (!nutrientInfo) return

    // Check if nutrient already exists
    if (nutrients.some(n => n.code === selectedNutrientCode)) {
      toast({
        title: "Næringsstoff finnes allerede",
        description: "Dette næringsstoffet er allerede lagt til",
        variant: "destructive",
      })
      return
    }

    setNutrients([...nutrients, {
      code: selectedNutrientCode,
      name: nutrientInfo.name,
      measurement: parseFloat(selectedNutrientValue),
      measurementType: nutrientInfo.unit,
      measurementPrecision: nutrientInfo.type,
    }])

    setSelectedNutrientCode("")
    setSelectedNutrientValue("")
  }

  const handleRemoveNutrient = (code: string) => {
    setNutrients(nutrients.filter(n => n.code !== code))
  }

  const handleSubmit = async () => {
    // Validation
    if (!gtin || !name) {
      toast({
        title: "Mangler påkrevd informasjon",
        description: "GTIN og produktnavn er påkrevd",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const productData = {
        gtin,
        name,
        brandName: brandName || undefined,
        producerName: producerName || undefined,
        providerName: providerName || undefined,
        packageSize: packageSize || undefined,
        ingredientStatement: ingredientStatement || undefined,
        allergens,
        nutrients,
      }

      const response = await apiClient.post("/v1/matinfo/products", productData)

      toast({
        title: "Produkt opprettet!",
        description: `${name} er nå lagret i databasen`,
      })

      if (onSuccess) {
        onSuccess(response.data.id, gtin)
      }

      // Reset form
      resetForm()
      onOpenChange(false)

    } catch (error: any) {
      console.error("Feil ved opprettelse av produkt:", error)
      toast({
        title: "Feil ved opprettelse",
        description: error.response?.data?.detail || "Kunne ikke opprette produkt",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setGtin("")
    setName("")
    setBrandName("")
    setProducerName("")
    setProviderName("")
    setPackageSize("")
    setIngredientStatement("")
    setAllergens([])
    setNutrients([])
    setActiveTab("basic")
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "CONTAINS": return "destructive"
      case "MAY_CONTAIN": return "secondary"
      case "FREE_FROM": return "outline"
      default: return "default"
    }
  }

  const getLevelText = (level: string) => {
    switch (level) {
      case "CONTAINS": return "Inneholder"
      case "MAY_CONTAIN": return "Kan inneholde"
      case "FREE_FROM": return "Fri for"
      default: return level
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Opprett nytt produkt manuelt
          </DialogTitle>
          <DialogDescription>
            Legg til produktinformasjon, næringsdata og allergener manuelt
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Grunninfo</TabsTrigger>
            <TabsTrigger value="allergens">
              Allergener ({allergens.length})
            </TabsTrigger>
            <TabsTrigger value="nutrients">
              Næringsdata ({nutrients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="gtin">GTIN / EAN-kode *</Label>
                <Input
                  id="gtin"
                  value={gtin}
                  onChange={(e) => setGtin(e.target.value)}
                  placeholder="7035620042140"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="name">Produktnavn *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tine Lettmelk 1,2%"
                />
              </div>

              <div>
                <Label htmlFor="brandName">Merke</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="TINE"
                />
              </div>

              <div>
                <Label htmlFor="producerName">Produsent</Label>
                <Input
                  id="producerName"
                  value={producerName}
                  onChange={(e) => setProducerName(e.target.value)}
                  placeholder="Tine SA"
                />
              </div>

              <div>
                <Label htmlFor="providerName">Leverandør</Label>
                <Input
                  id="providerName"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="Tine SA"
                />
              </div>

              <div>
                <Label htmlFor="packageSize">Pakkestørrelse</Label>
                <Input
                  id="packageSize"
                  value={packageSize}
                  onChange={(e) => setPackageSize(e.target.value)}
                  placeholder="1 L"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ingredients">Ingredienser</Label>
                <Textarea
                  id="ingredients"
                  value={ingredientStatement}
                  onChange={(e) => setIngredientStatement(e.target.value)}
                  placeholder="Pastørisert KUMELK, vitaminer (A og D)"
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="allergens" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Select value={selectedAllergenCode} onValueChange={setSelectedAllergenCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg allergen" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ALLERGENS.map((allergen) => (
                      <SelectItem key={allergen.code} value={allergen.code}>
                        {allergen.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAllergenLevel} onValueChange={(v: any) => setSelectedAllergenLevel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTAINS">Inneholder</SelectItem>
                    <SelectItem value="MAY_CONTAIN">Kan inneholde</SelectItem>
                    <SelectItem value="FREE_FROM">Fri for</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleAddAllergen} disabled={!selectedAllergenCode}>
                  <Plus className="h-4 w-4 mr-2" />
                  Legg til
                </Button>
              </div>

              {allergens.length > 0 ? (
                <div className="space-y-2">
                  {allergens.map((allergen) => (
                    <div
                      key={allergen.code}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{allergen.name}</span>
                        <Badge variant={getLevelBadgeVariant(allergen.level)}>
                          {getLevelText(allergen.level)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAllergen(allergen.code)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Ingen allergener lagt til ennå
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="nutrients" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Select value={selectedNutrientCode} onValueChange={setSelectedNutrientCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg næringsstoff" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_NUTRIENTS.map((nutrient) => (
                      <SelectItem key={nutrient.code} value={nutrient.code}>
                        {nutrient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  step="0.01"
                  placeholder="Verdi"
                  value={selectedNutrientValue}
                  onChange={(e) => setSelectedNutrientValue(e.target.value)}
                />

                <Button onClick={handleAddNutrient} disabled={!selectedNutrientCode || !selectedNutrientValue}>
                  <Plus className="h-4 w-4 mr-2" />
                  Legg til
                </Button>
              </div>

              {nutrients.length > 0 ? (
                <div className="space-y-2">
                  {nutrients.map((nutrient) => (
                    <div
                      key={nutrient.code}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{nutrient.name}</span>
                        <span className="text-muted-foreground">
                          {nutrient.measurement} {nutrient.measurementType}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNutrient(nutrient.code)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Ingen næringsdata lagt til ennå
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Oppretter...
              </>
            ) : (
              "Opprett produkt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
