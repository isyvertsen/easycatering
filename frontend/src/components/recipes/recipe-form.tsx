"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Recipe } from "@/types/models"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const recipeSchema = z.object({
  kalkylenavn: z.string().min(1, "Navn er påkrevd"),
  kalkylekode: z.coerce.number().optional().nullable(),
  refporsjon: z.string().optional().nullable(),
  antallporsjoner: z.coerce.number().optional().nullable(),
  enhet: z.string().optional().nullable(),
  brukestil: z.string().optional().nullable(),
  informasjon: z.string().optional().nullable(),
  merknad: z.string().optional().nullable(),
  produksjonsmetode: z.string().optional().nullable(),
  gruppeid: z.coerce.number().optional().nullable(),
})

type RecipeFormData = z.infer<typeof recipeSchema>

interface RecipeFormProps {
  recipe?: Recipe
  onSubmit: (data: Partial<Recipe>) => Promise<void>
  isLoading?: boolean
}

export function RecipeForm({ recipe, onSubmit, isLoading }: RecipeFormProps) {
  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      kalkylenavn: recipe?.kalkylenavn || "",
      kalkylekode: recipe?.kalkylekode || null,
      refporsjon: recipe?.refporsjon?.trim() || "",
      antallporsjoner: recipe?.antallporsjoner || null,
      enhet: recipe?.enhet?.trim() || null,
      brukestil: recipe?.brukestil?.trim() || "",
      informasjon: recipe?.informasjon || "",
      merknad: recipe?.merknad || "",
      produksjonsmetode: recipe?.produksjonsmetode?.trim() || "",
      gruppeid: recipe?.gruppeid || null,
    },
  })

  const handleSubmit = async (data: RecipeFormData) => {
    try {
      // Remove kalkylekode from submission data (it's a read-only field)
      const { kalkylekode, ...submitData } = data
      await onSubmit(submitData)
    } catch (error) {
      console.error("Failed to submit recipe:", error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="kalkylenavn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Navn</FormLabel>
              <FormControl>
                <Input placeholder="F.eks. Fiskesuppe" {...field} />
              </FormControl>
              <FormDescription>
                Gi oppskriften et beskrivende navn
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kalkylekode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kalkylekode</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  disabled
                  className="bg-muted"
                />
              </FormControl>
              <FormDescription>
                Autogenerert ID for oppskriften
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="antallporsjoner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Antall porsjoner</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Standard antall porsjoner
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enhet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enhet</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg enhet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Kilo">Kilo</SelectItem>
                    <SelectItem value="Liter">Liter</SelectItem>
                    <SelectItem value="Porsjoner">Porsjoner</SelectItem>
                    <SelectItem value="Stk">Stk</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="refporsjon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refporsjon</FormLabel>
                <FormControl>
                  <Input
                    placeholder="F.eks. 1 person"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="produksjonsmetode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produksjonsmetode</FormLabel>
              <FormControl>
                <Input 
                  placeholder="F.eks. Tradisjonell, Sous vide, etc." 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brukestil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brukes til</FormLabel>
              <FormControl>
                <Input 
                  placeholder="F.eks. Middag, Lunsj, etc." 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="informasjon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fremgangsmåte</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detaljert fremgangsmåte for oppskriften..."
                  className="resize-y min-h-[200px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Instruksjoner for tilberedning
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="merknad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merknader</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Spesielle merknader, allergener, etc..."
                  className="resize-y min-h-[120px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Viktige merknader om oppskriften
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Lagrer..." : recipe ? "Oppdater" : "Opprett"}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Avbryt
          </Button>
        </div>
      </form>
    </Form>
  )
}