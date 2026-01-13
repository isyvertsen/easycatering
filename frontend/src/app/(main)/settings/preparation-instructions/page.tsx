"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit, Sparkles, Check, X, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import {
  usePreparationInstructions,
  usePreparationInstructionMutations,
  useInstructionEnhancement,
} from "@/hooks/usePreparationInstructions"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function PreparationInstructionsPage() {
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newInstructionText, setNewInstructionText] = useState("")
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false)
  const [enhanceResult, setEnhanceResult] = useState<{
    original: string
    enhanced: string
    reasoning: string
  } | null>(null)
  const [enhanceMode, setEnhanceMode] = useState<"create" | "edit">("create")
  const [tempEditId, setTempEditId] = useState<number | null>(null)

  const { instructions, loading, refetch } = usePreparationInstructions(!showInactive)
  const { createInstruction, updateInstruction, deleteInstruction, loading: mutationLoading } =
    usePreparationInstructionMutations()
  const { enhanceInstruction, enhancing } = useInstructionEnhancement()

  const handleCreate = async () => {
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
      setNewInstructionText("")
      setShowCreateDialog(false)
      refetch()
    }
  }

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) {
      toast.error("Angi instruksjonstekst")
      return
    }

    const result = await updateInstruction(id, { text: editText.trim() })

    if (result) {
      toast.success("Instruksjon oppdatert")
      setEditingId(null)
      setEditText("")
      refetch()
    }
  }

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    const result = await updateInstruction(id, { is_active: !currentActive })

    if (result) {
      toast.success(currentActive ? "Instruksjon deaktivert" : "Instruksjon aktivert")
      refetch()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Er du sikker på at du vil deaktivere denne instruksjonen?")) {
      return
    }

    const result = await deleteInstruction(id)

    if (result) {
      toast.success("Instruksjon deaktivert")
      refetch()
    }
  }

  const handleEnhance = async (text: string, mode: "create" | "edit", editId?: number) => {
    if (!text.trim()) {
      toast.error("Angi instruksjonstekst")
      return
    }

    // Close the create dialog first to avoid stacked modals
    if (mode === "create") {
      setShowCreateDialog(false)
    }

    toast.loading("AI analyserer tilberedningsinstruksjonen...", { id: "enhance-instruction" })

    const result = await enhanceInstruction(text.trim())

    if (result) {
      toast.success("AI-analyse fullført!", { id: "enhance-instruction" })
      setEnhanceResult({
        original: result.original_text,
        enhanced: result.enhanced_text,
        reasoning: result.reasoning,
      })
      setEnhanceMode(mode)
      setTempEditId(editId || null)
      // Use setTimeout to ensure first dialog is fully unmounted
      setTimeout(() => {
        setShowEnhanceDialog(true)
      }, 0)
    } else {
      toast.error("Kunne ikke analysere instruksjonen med AI", { id: "enhance-instruction" })
      // Reopen create dialog if enhancement failed
      if (mode === "create") {
        setShowCreateDialog(true)
      }
    }
  }

  const handleAcceptEnhancement = async () => {
    if (!enhanceResult) return

    if (enhanceMode === "create") {
      // Create new instruction with enhanced text
      const result = await createInstruction({
        text: enhanceResult.enhanced,
        is_active: true,
        ai_enhanced: true,
      })

      if (result) {
        toast.success("Forbedret instruksjon opprettet")
        setNewInstructionText("")
        setShowCreateDialog(false)
        setShowEnhanceDialog(false)
        setEnhanceResult(null)
        refetch()
      }
    } else if (enhanceMode === "edit" && tempEditId) {
      // Update existing instruction with enhanced text
      const result = await updateInstruction(tempEditId, {
        text: enhanceResult.enhanced,
        ai_enhanced: true,
      })

      if (result) {
        toast.success("Instruksjon oppdatert med AI-forbedring")
        setEditingId(null)
        setEditText("")
        setShowEnhanceDialog(false)
        setEnhanceResult(null)
        setTempEditId(null)
        refetch()
      }
    }
  }

  const handleRejectEnhancement = () => {
    setShowEnhanceDialog(false)
    setEnhanceResult(null)
    setTempEditId(null)
  }

  const startEdit = (id: number, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText("")
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tilberedningsinstruksjoner</h1>
          <p className="text-muted-foreground mt-2">
            Administrer forhåndsdefinerte instruksjoner som kan brukes på etiketter
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ny instruksjon
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={(checked) => setShowInactive(checked as boolean)}
        />
        <label
          htmlFor="show-inactive"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Vis deaktiverte instruksjoner
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instruksjoner ({instructions.length})</CardTitle>
          <CardDescription>
            Klikk for å redigere eller bruk AI for å forbedre tekstene
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Laster...</p>
          ) : instructions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {showInactive ? "Ingen instruksjoner funnet" : "Ingen aktive instruksjoner funnet"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instruksjon</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-48 text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructions.map((instruction) => (
                  <TableRow key={instruction.id}>
                    <TableCell>
                      {editingId === instruction.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(instruction.id)}
                              disabled={mutationLoading}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Lagre
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={mutationLoading}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Avbryt
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEnhance(editText, "edit", instruction.id)}
                              disabled={enhancing}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {enhancing ? "Forbedrer..." : "Forbedre med AI"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="flex-1">{instruction.text}</p>
                          {instruction.ai_enhanced && (
                            <Badge variant="secondary" className="ml-2">
                              <Sparkles className="mr-1 h-3 w-3" />
                              AI
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={instruction.is_active ? "default" : "secondary"}>
                        {instruction.is_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId !== instruction.id && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(instruction.id, instruction.text)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(instruction.id, instruction.is_active)}
                            disabled={mutationLoading}
                          >
                            {instruction.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny tilberedningsinstruksjon</DialogTitle>
            <DialogDescription>
              Skriv en ny instruksjon som kan brukes på etiketter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instruction-text">Instruksjonstekst</Label>
              <Textarea
                id="instruction-text"
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
              onClick={() => handleEnhance(newInstructionText, "create")}
              disabled={enhancing || !newInstructionText.trim() || mutationLoading}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {enhancing ? "AI arbeider..." : "Forbedre med AI"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={enhancing || mutationLoading}
              >
                Avbryt
              </Button>
              <Button onClick={handleCreate} disabled={mutationLoading || enhancing}>
                {mutationLoading ? "Oppretter..." : "Opprett"}
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
            <Button onClick={handleAcceptEnhancement} disabled={mutationLoading}>
              <Check className="mr-2 h-4 w-4" />
              Bruk forbedret versjon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
