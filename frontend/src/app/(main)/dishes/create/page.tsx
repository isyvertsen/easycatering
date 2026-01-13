"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Calculator, Printer, Sparkles, Save, Search, FolderOpen, FilePlus, Settings } from "lucide-react"
import { toast } from "sonner"
import { useRecipesList } from "@/hooks/useRecipes"
import { useProducts } from "@/hooks/useProducts"
import { Product } from "@/types/models"
import { useCombinedDish, useCreateCombinedDish, useUpdateCombinedDish, useCombinedDishesList } from "@/hooks/useCombinedDishes"
import { usePreparationInstructions, usePreparationInstructionMutations, useInstructionEnhancement } from "@/hooks/usePreparationInstructions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { NutritionDisplay } from "@/components/recipes/nutrition-display"
import { AllergenDisplay } from "@/components/recipes/allergen-display"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface RecipeComponent {
  kalkylekode: number
  kalkylenavn: string
  amount_grams: number
}

interface ProductComponent {
  produktid: number
  produktnavn: string
  amount_grams: number
}

function CreateDishPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dishId = searchParams.get('id') ? parseInt(searchParams.get('id')!) : undefined

  const [dishName, setDishName] = useState("")
  const [preparationInstructions, setPreparationInstructions] = useState("none")
  const [recipeComponents, setRecipeComponents] = useState<RecipeComponent[]>([])
  const [productComponents, setProductComponents] = useState<ProductComponent[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("")
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [recipeAmount, setRecipeAmount] = useState<string>("")
  const [productAmount, setProductAmount] = useState<string>("")
  const [nutritionData, setNutritionData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  const [printZplLoading, setPrintZplLoading] = useState(false)
  const [printDirectLoading, setPrintDirectLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("")
  const [availablePrinters, setAvailablePrinters] = useState<Array<{id: string, name: string, ipAddress: string, isDefault: boolean}>>([])
  const [nameGenerating, setNameGenerating] = useState(false)
  const [autoGenerateName, setAutoGenerateName] = useState(true)
  const [manuallyEdited, setManuallyEdited] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showSavedDishes, setShowSavedDishes] = useState(false)
  const [showCreateInstructionDialog, setShowCreateInstructionDialog] = useState(false)
  const [newInstructionText, setNewInstructionText] = useState("")
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false)
  const [enhanceResult, setEnhanceResult] = useState<{
    original: string
    enhanced: string
    reasoning: string
  } | null>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Fetch preparation instructions from API
  const { instructions: instructionsList, refetch: refetchInstructions } = usePreparationInstructions(true)
  const { createInstruction, loading: instructionMutationLoading } = usePreparationInstructionMutations()
  const { enhanceInstruction, enhancing } = useInstructionEnhancement()

  const { data: recipesData } = useRecipesList({ skip: 0, limit: 1000 })
  const recipes = recipesData?.items || []

  // Fetch only products marked as dish components (rett_komponent = true)
  const { data: productsData } = useProducts({ skip: 0, limit: 1000, rett_komponent: true })
  // API returns paginated response with items property
  const products: Product[] = Array.isArray(productsData)
    ? productsData
    : (productsData as any)?.items || []

  // Hooks for combined dishes
  const { data: existingDish, isLoading: dishLoading } = useCombinedDish(dishId)
  const { data: savedDishesData } = useCombinedDishesList({ skip: 0, limit: 100, search: searchTerm })
  const savedDishes = savedDishesData?.items || []
  const createDish = useCreateCombinedDish()
  const updateDish = useUpdateCombinedDish()

  // Load existing dish data when editing
  useEffect(() => {
    if (existingDish && recipes.length > 0 && products.length > 0) {
      setDishName(existingDish.name)
      setManuallyEdited(true) // Prevent auto-generation when loading
      setAutoGenerateName(false) // Disable auto-generation for existing dishes

      // Load recipe components
      const loadedRecipes = existingDish.recipe_components.map(rc => ({
        kalkylekode: rc.kalkylekode,
        kalkylenavn: rc.kalkylenavn,
        amount_grams: rc.amount_grams
      }))
      setRecipeComponents(loadedRecipes)

      // Load product components
      const loadedProducts = existingDish.product_components.map(pc => ({
        produktid: pc.produktid,
        produktnavn: pc.visningsnavn || pc.produktnavn,
        amount_grams: pc.amount_grams
      }))
      setProductComponents(loadedProducts)

      toast.success(`Lastet inn rett: ${existingDish.name}`)
    }
  }, [existingDish, recipes.length, products.length])

  // Load printers from localStorage (client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    try {
      const savedPrinters = window.localStorage.getItem('zebraPrinters')
      if (savedPrinters) {
        const printers = JSON.parse(savedPrinters)
        setAvailablePrinters(printers)

        // Set default printer as selected
        const defaultPrinter = printers.find((p: any) => p.isDefault)
        if (defaultPrinter) {
          setSelectedPrinterId(defaultPrinter.id)
        } else if (printers.length > 0) {
          // If no default, select first printer
          setSelectedPrinterId(printers[0].id)
        }
      }
    } catch (e) {
      console.error('Failed to load printers:', e)
    }
  }, [])

  const handleAddRecipe = () => {
    if (!selectedRecipeId || !recipeAmount) {
      toast.error("Velg oppskrift og angi mengde")
      return
    }

    const recipe = recipes.find((r) => r.kalkylekode === parseInt(selectedRecipeId))
    if (!recipe) return

    setRecipeComponents([
      ...recipeComponents,
      {
        kalkylekode: parseInt(selectedRecipeId),
        kalkylenavn: recipe.kalkylenavn,
        amount_grams: parseFloat(recipeAmount),
      },
    ])

    setSelectedRecipeId("")
    setRecipeAmount("")
  }

  const handleAddProduct = () => {
    if (!selectedProductId || !productAmount) {
      toast.error("Velg produkt og angi mengde")
      return
    }

    const product = products.find((p) => p.produktid === parseInt(selectedProductId))
    if (!product) return

    setProductComponents([
      ...productComponents,
      {
        produktid: parseInt(selectedProductId),
        produktnavn: product.produktnavn || product.visningsnavn || `Produkt ${product.produktid}`,
        amount_grams: parseFloat(productAmount),
      },
    ])

    setSelectedProductId("")
    setProductAmount("")
  }

  const handleRemoveRecipe = (index: number) => {
    setRecipeComponents(recipeComponents.filter((_, i) => i !== index))
  }

  const handleRemoveProduct = (index: number) => {
    setProductComponents(productComponents.filter((_, i) => i !== index))
  }

  const handleCalculate = async () => {
    if (!dishName.trim()) {
      toast.error("Angi navn på retten")
      return
    }

    if (recipeComponents.length === 0 && productComponents.length === 0) {
      toast.error("Legg til minst én oppskrift eller produkt")
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.post("/v1/oppskrifter/kombinere", {
        name: dishName,
        recipes: recipeComponents.map((c) => ({
          kalkylekode: c.kalkylekode,
          amount_grams: c.amount_grams,
        })),
        products: productComponents.map((p) => ({
          produktid: p.produktid,
          amount_grams: p.amount_grams,
        })),
      })

      setNutritionData(response.data)
      toast.success("Næringsverdier beregnet!")
    } catch (error) {
      console.error("Feil ved beregning:", error)
      toast.error("Kunne ikke beregne næringsverdier")
    } finally {
      setLoading(false)
    }
  }

  const printLabel = async () => {
    if (!dishName.trim()) {
      toast.error("Angi navn på retten først")
      return
    }

    if (recipeComponents.length === 0 && productComponents.length === 0) {
      toast.error("Legg til minst én oppskrift eller produkt")
      return
    }

    setPrintLoading(true)
    try {
      const requestData = {
        name: dishName,
        preparation_instructions: preparationInstructions === "none" ? undefined : preparationInstructions,
        recipes: recipeComponents.map((c) => ({
          kalkylekode: c.kalkylekode,
          amount_grams: c.amount_grams,
        })),
        products: productComponents.map((p) => ({
          produktid: p.produktid,
          amount_grams: p.amount_grams,
        })),
      }

      const response = await apiClient.post("/v1/oppskrifter/kombinere/label", requestData, {
        responseType: 'blob'
      })

      const blob = response.data

      // Create filename with date and time
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-') // HH-MM-SS
      const sanitizedDishName = dishName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '')
      const filename = `etikett_${sanitizedDishName}_${dateStr}_${timeStr}.pdf`

      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast.success("Etikett generert!")
    } catch (error: any) {
      console.error("Feil ved generering av etikett:", error)
      const errorMessage = error?.message || "Ukjent feil"
      toast.error(`Kunne ikke generere etikett: ${errorMessage}`)
    } finally {
      setPrintLoading(false)
    }
  }

  const printZplLabel = async () => {
    if (!dishName.trim()) {
      toast.error("Angi navn på retten først")
      return
    }

    if (recipeComponents.length === 0 && productComponents.length === 0) {
      toast.error("Legg til minst én oppskrift eller produkt")
      return
    }

    setPrintZplLoading(true)
    try {
      const requestData = {
        name: dishName,
        preparation_instructions: preparationInstructions === "none" ? undefined : preparationInstructions,
        recipes: recipeComponents.map((c) => ({
          kalkylekode: c.kalkylekode,
          amount_grams: c.amount_grams,
        })),
        products: productComponents.map((p) => ({
          produktid: p.produktid,
          amount_grams: p.amount_grams,
        })),
      }

      console.log("Generating ZPL label with data:", requestData)

      const response = await apiClient.post("/v1/oppskrifter/kombinere/label-zpl", requestData, {
        responseType: 'blob'
      })

      console.log("ZPL blob received, size:", response.data.size)
      const blob = response.data

      // Create filename with date and time
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-') // HH-MM-SS
      const sanitizedDishName = dishName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '')
      const filename = `etikett_zpl_${sanitizedDishName}_${dateStr}_${timeStr}.zpl`

      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast.success("ZPL etikett generert!")
    } catch (error: any) {
      console.error("Feil ved generering av ZPL etikett:", error)
      const errorMessage = error?.message || "Ukjent feil"
      toast.error(`Kunne ikke generere ZPL etikett: ${errorMessage}`)
    } finally {
      setPrintZplLoading(false)
    }
  }

  const printDirectToZebra = async () => {
    if (!dishName.trim()) {
      toast.error("Angi navn på retten først")
      return
    }

    if (recipeComponents.length === 0 && productComponents.length === 0) {
      toast.error("Legg til minst én oppskrift eller produkt")
      return
    }

    if (!selectedPrinterId) {
      toast.error("Velg en printer først")
      return
    }

    const selectedPrinter = availablePrinters.find(p => p.id === selectedPrinterId)
    if (!selectedPrinter) {
      toast.error("Finner ikke valgt printer")
      return
    }

    setPrintDirectLoading(true)
    try {
      const requestData = {
        name: dishName,
        preparation_instructions: preparationInstructions === "none" ? undefined : preparationInstructions,
        recipes: recipeComponents.map((c) => ({
          kalkylekode: c.kalkylekode,
          amount_grams: c.amount_grams,
        })),
        products: productComponents.map((p) => ({
          produktid: p.produktid,
          amount_grams: p.amount_grams,
        })),
      }

      console.log("Generating ZPL for direct print with data:", requestData)

      // Get ZPL code from backend
      const response = await apiClient.post("/v1/oppskrifter/kombinere/label-zpl", requestData, {
        responseType: 'blob'
      })

      console.log("ZPL blob received, converting to text...")
      const blob = response.data
      const zplCode = await blob.text()

      console.log("Sending ZPL to printer:", selectedPrinter.name, "at", selectedPrinter.ipAddress)

      // Send ZPL directly to Zebra printer via HTTP
      // Zebra printers accept ZPL on /pstprnt endpoint
      const printerUrl = `http://${selectedPrinter.ipAddress}/pstprnt`

      const printResponse = await fetch(printerUrl, {
        method: 'POST',
        body: zplCode,
        headers: {
          'Content-Type': 'text/plain',
        },
        mode: 'no-cors' // Required for cross-origin requests to printer
      })

      // Note: no-cors mode means we can't read the response
      // We assume success if no error is thrown
      console.log("Print request sent successfully")
      toast.success(`Etikett sendt til ${selectedPrinter.name}!`)

    } catch (error: any) {
      console.error("Feil ved utskrift til Zebra printer:", error)

      let errorMessage = "Kunne ikke skrive ut til printer"

      if (error.message?.includes('fetch')) {
        errorMessage = `Kunne ikke koble til ${selectedPrinter.name} på ${selectedPrinter.ipAddress}. Sjekk at printeren er tilgjengelig på nettverket.`
      } else {
        errorMessage = `Kunne ikke skrive ut: ${error?.message || "Ukjent feil"}`
      }

      toast.error(errorMessage)
    } finally {
      setPrintDirectLoading(false)
    }
  }

  const generateDishName = async (isAutomatic = false) => {
    if (recipeComponents.length === 0 && productComponents.length === 0) {
      if (!isAutomatic) {
        toast.error("Legg til minst én oppskrift eller produkt først")
      }
      return
    }

    // Skip if manually edited and this is automatic
    if (isAutomatic && manuallyEdited) {
      return
    }

    setNameGenerating(true)
    try {
      const response = await apiClient.post("/v1/oppskrifter/kombinere/generate-name", {
        recipes: recipeComponents.map((c) => ({
          kalkylekode: c.kalkylekode,
          amount_grams: c.amount_grams,
        })),
        products: productComponents.map((p) => ({
          produktid: p.produktid,
          amount_grams: p.amount_grams,
        })),
      })

      setDishName(response.data.name)
      setManuallyEdited(false) // Reset when auto-generating
      if (!isAutomatic) {
        toast.success("Navn generert!")
      }
    } catch (error) {
      console.error("Feil ved generering av navn:", error)
      if (!isAutomatic) {
        toast.error("Kunne ikke generere navn")
      }
    } finally {
      setNameGenerating(false)
    }
  }

  const handleSaveDish = async () => {
    if (!dishName.trim()) {
      toast.error("Angi navn på retten")
      return
    }

    if (recipeComponents.length === 0 && productComponents.length === 0) {
      toast.error("Legg til minst én oppskrift eller produkt")
      return
    }

    setSaveLoading(true)
    try {
      const dishData = {
        name: dishName,
        preparation_instructions: preparationInstructions === "none" ? undefined : preparationInstructions,
        recipes: recipeComponents.map((c) => ({
          kalkylekode: c.kalkylekode,
          amount_grams: c.amount_grams,
        })),
        products: productComponents.map((p) => ({
          produktid: p.produktid,
          amount_grams: p.amount_grams,
        })),
      }

      if (dishId) {
        // Update existing dish
        await updateDish.mutateAsync({ id: dishId, data: dishData })
      } else {
        // Create new dish
        const newDish = await createDish.mutateAsync(dishData)
        // Update URL to include dish ID for future updates
        router.replace(`/dishes/create?id=${newDish.id}`)
      }
    } catch (error) {
      console.error("Feil ved lagring:", error)
      // Toast is handled by the hook
    } finally {
      setSaveLoading(false)
    }
  }

  const handleLoadDish = (dishIdToLoad: number) => {
    router.push(`/dishes/create?id=${dishIdToLoad}`)
    setShowSavedDishes(false)
  }

  const handleNewDish = () => {
    // Clear all state
    setDishName("")
    setPreparationInstructions("none")
    setRecipeComponents([])
    setProductComponents([])
    setNutritionData(null)
    setAutoGenerateName(true)
    setManuallyEdited(false)
    setShowSavedDishes(false)

    // Remove ID from URL to go to create mode
    router.push('/dishes/create')

    toast.success("Nytt skjema opprettet")
  }

  // Handler for creating a new preparation instruction
  const handleCreateInstruction = async () => {
    if (!newInstructionText.trim()) {
      toast.error("Angi instruksjonstekst")
      return
    }

    const result = await createInstruction({
      text: newInstructionText.trim(),
      is_active: true,
      ai_enhanced: false,
    })

    if (result) {
      toast.success("Instruksjon opprettet")
      setPreparationInstructions(result.text) // Automatically select the new instruction
      setNewInstructionText("")
      setShowCreateInstructionDialog(false)
      refetchInstructions()
    }
  }

  // Handler for enhancing an instruction with AI
  const handleEnhanceInstruction = async () => {
    if (!newInstructionText.trim()) {
      toast.error("Angi instruksjonstekst")
      return
    }

    toast.loading("AI analyserer tilberedningsinstruksjonen...", { id: "enhance-instruction" })

    const result = await enhanceInstruction(newInstructionText.trim())

    if (result) {
      toast.success("AI-analyse fullført!", { id: "enhance-instruction" })
      setEnhanceResult({
        original: result.original_text,
        enhanced: result.enhanced_text,
        reasoning: result.reasoning,
      })
      setShowEnhanceDialog(true)
    } else {
      toast.error("Kunne ikke analysere instruksjonen med AI", { id: "enhance-instruction" })
    }
  }

  // Handler for accepting AI enhancement
  const handleAcceptEnhancement = async () => {
    if (!enhanceResult) return

    const result = await createInstruction({
      text: enhanceResult.enhanced,
      is_active: true,
      ai_enhanced: true,
    })

    if (result) {
      toast.success("Forbedret instruksjon opprettet")
      setPreparationInstructions(result.text) // Automatically select the new instruction
      setNewInstructionText("")
      setShowCreateInstructionDialog(false)
      setShowEnhanceDialog(false)
      setEnhanceResult(null)
      refetchInstructions()
    }
  }

  // Handler for rejecting AI enhancement
  const handleRejectEnhancement = () => {
    setShowEnhanceDialog(false)
    setEnhanceResult(null)
  }

  // Handler for preparation instruction selection change
  const handlePreparationInstructionChange = (value: string) => {
    if (value === "create_new") {
      setShowCreateInstructionDialog(true)
    } else {
      setPreparationInstructions(value)
    }
  }

  const totalWeight =
    recipeComponents.reduce((sum, c) => sum + c.amount_grams, 0) +
    productComponents.reduce((sum, p) => sum + p.amount_grams, 0)

  // Auto-generate name when components change
  useEffect(() => {
    if (!autoGenerateName) return

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer for debounced generation
    debounceTimer.current = setTimeout(() => {
      if (recipeComponents.length > 0 || productComponents.length > 0) {
        generateDishName(true) // true = automatic generation
      }
    }, 500) // Wait 500ms after last change

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [recipeComponents, productComponents, autoGenerateName])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {dishId ? `Rediger rett${dishName ? `: ${dishName}` : ''}` : 'Sett sammen rett'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {dishId
              ? 'Gjør endringer og lagre for å oppdatere retten'
              : 'Kombiner flere oppskrifter til en rett og beregn næringsverdier'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleNewDish}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Ny rett
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSavedDishes(!showSavedDishes)}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {showSavedDishes ? 'Skjul lagrede retter' : 'Last inn lagret rett'}
          </Button>
        </div>
      </div>

      {/* Search and load saved dishes */}
      {showSavedDishes && (
        <Card>
          <CardHeader>
            <CardTitle>Lagrede retter</CardTitle>
            <CardDescription>
              Søk etter og last inn en tidligere lagret rett for å redigere eller bruke som mal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk etter rett..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {savedDishes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchTerm ? 'Ingen retter funnet' : 'Ingen lagrede retter ennå'}
                </p>
              ) : (
                savedDishes.map((dish: any) => (
                  <div
                    key={dish.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleLoadDish(dish.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{dish.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dish.recipe_components?.length || 0} oppskrifter, {dish.product_components?.length || 0} produkter
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Last inn
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Dish builder */}
        <div className="space-y-6">
          {/* Dish name */}
          <Card>
            <CardHeader>
              <CardTitle>Rettens navn</CardTitle>
              <CardDescription>
                {autoGenerateName
                  ? "Navnet oppdateres automatisk når du legger til komponenter"
                  : "Angi et navn for den kombinerte retten"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="F.eks. Kjøttkaker med brun saus"
                value={dishName}
                onChange={(e) => {
                  setDishName(e.target.value)
                  setManuallyEdited(true)
                }}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-generate"
                  checked={autoGenerateName}
                  onCheckedChange={(checked) => setAutoGenerateName(checked as boolean)}
                />
                <label
                  htmlFor="auto-generate"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Generer navn automatisk
                </label>
              </div>

              {!autoGenerateName && (
                <Button
                  onClick={() => generateDishName(false)}
                  disabled={nameGenerating || (recipeComponents.length === 0 && productComponents.length === 0)}
                  variant="outline"
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {nameGenerating ? "Genererer navn..." : "Foreslå navn med AI"}
                </Button>
              )}

              {nameGenerating && (
                <p className="text-xs text-muted-foreground text-center animate-pulse">
                  Genererer navn...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Preparation Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Tilberedningsinstruksjon</CardTitle>
              <CardDescription>
                Velg en instruksjon som skal skrives ut på etiketten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={preparationInstructions} onValueChange={handlePreparationInstructionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg instruksjon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen instruksjon</SelectItem>
                  {instructionsList.map((instruction) => (
                    <SelectItem key={instruction.id} value={instruction.text}>
                      {instruction.text}
                    </SelectItem>
                  ))}
                  <SelectItem value="create_new" className="text-primary font-medium border-t mt-2 pt-2">
                    <div className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Opprett ny instruksjon...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Add components - Recipes or Products */}
          <Card>
            <CardHeader>
              <CardTitle>Legg til komponenter</CardTitle>
              <CardDescription>Velg oppskrifter eller produkter og angi mengde</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="recipes" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="recipes">Oppskrifter</TabsTrigger>
                  <TabsTrigger value="products">Produkter</TabsTrigger>
                </TabsList>

                <TabsContent value="recipes" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Oppskrift <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                      <SelectTrigger className={!selectedRecipeId ? "border-gray-300" : ""}>
                        <SelectValue placeholder="Velg oppskrift" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes.map((recipe) => (
                          <SelectItem key={recipe.kalkylekode} value={recipe.kalkylekode.toString()}>
                            {recipe.kalkylenavn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Mengde (gram) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="F.eks. 450"
                      value={recipeAmount}
                      onChange={(e) => setRecipeAmount(e.target.value)}
                      className={!recipeAmount ? "border-gray-300" : ""}
                    />
                    {!recipeAmount && (
                      <p className="text-sm text-muted-foreground">Angi mengde i gram</p>
                    )}
                  </div>

                  <Button
                    onClick={handleAddRecipe}
                    className="w-full"
                    disabled={!selectedRecipeId || !recipeAmount}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Legg til oppskrift
                  </Button>
                  {(!selectedRecipeId || !recipeAmount) && (
                    <p className="text-sm text-muted-foreground text-center">
                      Velg oppskrift og angi mengde for å legge til
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Produkt <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className={!selectedProductId ? "border-gray-300" : ""}>
                        <SelectValue placeholder="Velg produkt" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.produktid} value={product.produktid.toString()}>
                            {product.produktnavn || product.visningsnavn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Mengde (gram) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="F.eks. 100"
                      value={productAmount}
                      onChange={(e) => setProductAmount(e.target.value)}
                      className={!productAmount ? "border-gray-300" : ""}
                    />
                    {!productAmount && (
                      <p className="text-sm text-muted-foreground">Angi mengde i gram</p>
                    )}
                  </div>

                  <Button
                    onClick={handleAddProduct}
                    className="w-full"
                    disabled={!selectedProductId || !productAmount}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Legg til produkt
                  </Button>
                  {(!selectedProductId || !productAmount) && (
                    <p className="text-sm text-muted-foreground text-center">
                      Velg produkt og angi mengde for å legge til
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Components and Nutrition display */}
        <div className="space-y-6">
          {/* Components list */}
          <Card>
            <CardHeader>
              <CardTitle>Komponenter i retten</CardTitle>
              <CardDescription>
                Total vekt: {totalWeight.toFixed(0)}g
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recipeComponents.length === 0 && productComponents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ingen komponenter lagt til ennå
                </p>
              ) : (
                <div className="space-y-4">
                  {recipeComponents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Oppskrifter</h4>
                      <div className="space-y-2">
                        {recipeComponents.map((component, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg highlight-recipe"
                          >
                            <div>
                              <p className="font-medium">{component.kalkylenavn}</p>
                              <p className="text-sm text-muted-foreground">
                                {component.amount_grams}g ({((component.amount_grams / totalWeight) * 100).toFixed(1)}%)
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRecipe(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {productComponents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Produkter</h4>
                      <div className="space-y-2">
                        {productComponents.map((product, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg highlight-product"
                          >
                            <div>
                              <p className="font-medium">{product.produktnavn}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.amount_grams}g ({((product.amount_grams / totalWeight) * 100).toFixed(1)}%)
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProduct(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(recipeComponents.length > 0 || productComponents.length > 0) && (
                <div className="space-y-2 mt-4">
                  <Button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {loading ? "Beregner..." : "Beregn næringsverdier"}
                  </Button>

                  <Button
                    onClick={handleSaveDish}
                    disabled={saveLoading || !dishName.trim()}
                    className="w-full"
                    size="lg"
                    variant="default"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saveLoading ? "Lagrer..." : dishId ? "Oppdater rett" : "Lagre rett"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {nutritionData && (
            <>
              <NutritionDisplay
                data={{
                  kalkylekode: 0,
                  kalkylenavn: nutritionData.name,
                  portions: 1,
                  total_weight_grams: nutritionData.total_weight_grams,
                  total_nutrition: nutritionData.total_nutrition,
                  nutrition_per_100g: nutritionData.combined_nutrition_per_100g,
                  nutrition_per_portion: nutritionData.total_nutrition,
                  ingredients_nutrition: [],
                  data_quality: nutritionData.data_quality,
                }}
                loading={loading}
              />

              {nutritionData.allergens && (
                <AllergenDisplay allergens={nutritionData.allergens} />
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Skriv ut etikett</CardTitle>
                  <CardDescription>
                    Generer PDF etikett, last ned ZPL eller skriv ut direkte til Zebra-printer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={printLabel}
                    disabled={printLoading}
                    className="w-full"
                    size="lg"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    {printLoading ? "Genererer PDF..." : "Skriv ut PDF etikett"}
                  </Button>

                  <Button
                    onClick={printZplLabel}
                    disabled={printZplLoading}
                    className="w-full"
                    size="lg"
                    variant="outline"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    {printZplLoading ? "Genererer ZPL..." : "Last ned ZPL-fil"}
                  </Button>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="printer-select" className="text-sm font-medium">
                        Velg Zebra Printer
                      </Label>
                      <Link href="/settings/printers">
                        <Button variant="ghost" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Administrer
                        </Button>
                      </Link>
                    </div>

                    {availablePrinters.length > 0 ? (
                      <>
                        <Select value={selectedPrinterId} onValueChange={setSelectedPrinterId}>
                          <SelectTrigger id="printer-select">
                            <SelectValue placeholder="Velg printer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePrinters.map((printer) => (
                              <SelectItem key={printer.id} value={printer.id}>
                                <div className="flex items-center gap-2">
                                  <span>{printer.name}</span>
                                  {printer.isDefault && (
                                    <span className="text-xs text-muted-foreground">(Standard)</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedPrinterId && (
                          <p className="text-xs text-muted-foreground">
                            IP: {availablePrinters.find(p => p.id === selectedPrinterId)?.ipAddress}
                          </p>
                        )}

                        <Button
                          onClick={printDirectToZebra}
                          disabled={printDirectLoading || !selectedPrinterId}
                          className="w-full"
                          size="lg"
                          variant="default"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          {printDirectLoading ? "Skriver ut..." : "Skriv ut direkte til Zebra"}
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Ingen printere konfigurert
                        </p>
                        <Link href="/settings/printers">
                          <Button variant="outline" className="w-full" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Legg til printer
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create Instruction Dialog */}
      <Dialog open={showCreateInstructionDialog} onOpenChange={setShowCreateInstructionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opprett ny tilberedningsinstruksjon</DialogTitle>
            <DialogDescription>
              Skriv en ny instruksjon som vil bli lagt til i listen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-instruction-text">Instruksjonstekst</Label>
              <Textarea
                id="new-instruction-text"
                value={newInstructionText}
                onChange={(e) => setNewInstructionText(e.target.value)}
                placeholder="F.eks. Varmes i ovn 180°C i 15-20 minutter"
                className="min-h-[100px]"
                disabled={enhancing}
              />
            </div>
            {enhancing && (
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-primary/5">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">AI analyserer instruksjonen...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vurderer klarhet, sikkerhetsinformasjon og profesjonelt språk
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={handleEnhanceInstruction}
              disabled={enhancing || !newInstructionText.trim() || instructionMutationLoading}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {enhancing ? "AI arbeider..." : "Forbedre med AI"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateInstructionDialog(false)
                  setNewInstructionText("")
                }}
                disabled={enhancing || instructionMutationLoading}
              >
                Avbryt
              </Button>
              <Button onClick={handleCreateInstruction} disabled={instructionMutationLoading || enhancing}>
                {instructionMutationLoading ? "Oppretter..." : "Opprett"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Enhancement Dialog */}
      <Dialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI-forbedret instruksjon</DialogTitle>
            <DialogDescription>
              Sammenlign original og forbedret versjon, og velg om du vil bruke den
            </DialogDescription>
          </DialogHeader>
          {enhanceResult && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Original tekst</Label>
                <div className="p-3 border rounded-md bg-muted/50">
                  <p className="text-sm">{enhanceResult.original}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Forbedret tekst
                </Label>
                <div className="p-3 border rounded-md bg-primary/5">
                  <p className="text-sm font-medium">{enhanceResult.enhanced}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Begrunnelse</Label>
                <div className="p-3 border rounded-md bg-muted/30">
                  <p className="text-sm text-muted-foreground">{enhanceResult.reasoning}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectEnhancement}>
              Bruk original
            </Button>
            <Button onClick={handleAcceptEnhancement} disabled={instructionMutationLoading}>
              <Sparkles className="mr-2 h-4 w-4" />
              Bruk forbedret versjon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CreateDishPage() {
  return (
    <Suspense fallback={<div>Laster...</div>}>
      <CreateDishPageContent />
    </Suspense>
  )
}
