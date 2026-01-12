"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kategori } from "@/lib/api/kategorier"

const kategoriSchema = z.object({
  kategori: z.string().min(1, "Kategorinavn er påkrevd"),
  beskrivelse: z.string().optional(),
})

export type KategoriFormValues = z.infer<typeof kategoriSchema>

interface KategoriDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kategori?: Kategori | null
  onSubmit: (data: KategoriFormValues) => void
  loading?: boolean
}

export function KategoriDialog({
  open,
  onOpenChange,
  kategori,
  onSubmit,
  loading
}: KategoriDialogProps) {
  const form = useForm<KategoriFormValues>({
    resolver: zodResolver(kategoriSchema),
    defaultValues: {
      kategori: "",
      beskrivelse: "",
    },
  })

  useEffect(() => {
    if (kategori) {
      form.reset({
        kategori: kategori.kategori || "",
        beskrivelse: kategori.beskrivelse || "",
      })
    } else {
      form.reset({
        kategori: "",
        beskrivelse: "",
      })
    }
  }, [kategori, form, open])

  const handleSubmit = (data: KategoriFormValues) => {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {kategori ? "Rediger kategori" : "Ny kategori"}
          </DialogTitle>
          <DialogDescription>
            {kategori
              ? "Oppdater informasjon om kategorien"
              : "Opprett en ny kategori for produkter"
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kategori"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorinavn *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="F.eks. Meieriprodukter" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="beskrivelse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Valgfri beskrivelse av kategorien"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Lagrer..." : kategori ? "Oppdater" : "Opprett"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
