"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/CartContext"
import { useCreateWebshopOrder, useDefaultDeliveryDate } from "@/hooks/useWebshop"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingBag, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { nb } from "date-fns/locale"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotalPrice, clearCart } = useCart()
  const createOrder = useCreateWebshopOrder()
  const { data: defaultDelivery } = useDefaultDeliveryDate()

  const [leveringsdato, setLeveringsdato] = useState("")
  const [informasjon, setInformasjon] = useState("")
  const [leveringsadresse, setLeveringsadresse] = useState("")

  // Set default delivery date when loaded
  useEffect(() => {
    if (defaultDelivery?.leveringsdato && !leveringsdato) {
      setLeveringsdato(defaultDelivery.leveringsdato)
    }
  }, [defaultDelivery, leveringsdato])

  // Redirect if cart is empty
  if (items.length === 0 && !createOrder.isPending) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Handlekurven er tom</h2>
              <p className="text-muted-foreground mb-6">
                Du må legge til produkter i handlekurven før du kan gå til kasse.
              </p>
              <Button asChild>
                <Link href="/webshop">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Tilbake til webbutikk
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createOrder.mutateAsync({
        ordrelinjer: items.map((item) => ({
          produktid: item.produktid,
          antall: item.antall,
          pris: item.pris,
        })),
        leveringsdato: leveringsdato || undefined,
        informasjon: informasjon || undefined,
        leveringsadresse: leveringsadresse || undefined,
      })

      // Clear cart on success
      clearCart()

      // Redirect to confirmation page
      router.push("/webshop/kvittering")
    } catch (error) {
      // Error is handled by the mutation hook
      console.error("Failed to create order:", error)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/webshop"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til webbutikk
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Kasse</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Form */}
        <Card>
          <CardHeader>
            <CardTitle>Bestillingsinformasjon</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leveringsdato">Leveringsdato</Label>
                {defaultDelivery?.ukedag_navn && (
                  <Alert className="mb-2">
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      Din faste leveringsdag er <strong>{defaultDelivery.ukedag_navn}</strong>.
                      {leveringsdato && (
                        <> Neste levering: <strong>{format(new Date(leveringsdato), "d. MMMM yyyy", { locale: nb })}</strong></>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <Input
                  id="leveringsdato"
                  type="date"
                  value={leveringsdato}
                  onChange={(e) => setLeveringsdato(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
                <p className="text-xs text-muted-foreground">
                  {defaultDelivery?.leveringsdato
                    ? "Du kan endre dato hvis du ønsker en annen leveringsdag"
                    : "Velg ønsket leveringsdato"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leveringsadresse">Leveringsadresse (valgfritt)</Label>
                <Textarea
                  id="leveringsadresse"
                  value={leveringsadresse}
                  onChange={(e) => setLeveringsadresse(e.target.value)}
                  placeholder="Fyll inn hvis avvikende fra standard adresse"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="informasjon">Kommentar til ordren (valgfritt)</Label>
                <Textarea
                  id="informasjon"
                  value={informasjon}
                  onChange={(e) => setInformasjon(e.target.value)}
                  placeholder="Ekstra informasjon eller spesielle ønsker"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? "Behandler..." : "Send bestilling"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ordresammendrag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                // Capitalize helper
                const capitalize = (str: string) =>
                  str.toLowerCase().replace(/(?:^|[\s-])(\w)/g, (m) => m.toUpperCase())

                return (
                  <div
                    key={item.produktid}
                    className="flex justify-between items-start pb-3 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {capitalize(item.produktnavn)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.pris.toFixed(2)} kr × {item.antall}
                      </p>
                    </div>
                    <p className="font-medium">
                      {(item.pris * item.antall).toFixed(2)} kr
                    </p>
                  </div>
                )
              })}

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Totalt:</span>
                  <span>{getTotalPrice().toFixed(2)} kr</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Informasjon om bestilling:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Ordren sendes til godkjenning</li>
                  <li>Du mottar e-postbekreftelse med ordredetaljer</li>
                  <li>E-postlenken er gyldig i 14 dager</li>
                  <li>Du kan følge ordrestatus under "Mine bestillinger"</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
