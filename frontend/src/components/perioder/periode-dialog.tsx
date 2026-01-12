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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Periode } from "@/lib/api/perioder"

const periodeSchema = z.object({
  ukenr: z.number().min(1).max(53).optional().nullable(),
  fradato: z.string().optional().nullable(),
  tildato: z.string().optional().nullable(),
})

export type PeriodeFormValues = z.infer<typeof periodeSchema>

interface PeriodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periode?: Periode | null
  onSubmit: (data: PeriodeFormValues) => void
  loading?: boolean
}

export function PeriodeDialog({
  open,
  onOpenChange,
  periode,
  onSubmit,
  loading
}: PeriodeDialogProps) {
  const form = useForm<PeriodeFormValues>({
    resolver: zodResolver(periodeSchema),
    defaultValues: {
      ukenr: null,
      fradato: null,
      tildato: null,
    },
  })

  useEffect(() => {
    if (periode) {
      form.reset({
        ukenr: periode.ukenr,
        fradato: periode.fradato ? periode.fradato.split('T')[0] : null,
        tildato: periode.tildato ? periode.tildato.split('T')[0] : null,
      })
    } else {
      form.reset({
        ukenr: null,
        fradato: null,
        tildato: null,
      })
    }
  }, [periode, form, open])

  const handleSubmit = (data: PeriodeFormValues) => {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {periode ? "Rediger periode" : "Ny periode"}
          </DialogTitle>
          <DialogDescription>
            {periode
              ? "Oppdater informasjon om perioden"
              : "Opprett en ny menyperiode"
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ukenr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ukenummer</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={53}
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="1-53"
                    />
                  </FormControl>
                  <FormDescription>
                    Hvilket ukenummer gjelder denne perioden
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fradato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fra dato</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tildato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Til dato</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || null)}
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
                {loading ? "Lagrer..." : periode ? "Oppdater" : "Opprett"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
