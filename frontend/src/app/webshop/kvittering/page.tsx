"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export default function OrderConfirmationPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-6">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Bestilling mottatt!</h1>
              <p className="text-muted-foreground">
                Din ordre er registrert og sendt til godkjenning.
              </p>
            </div>

            <div className="bg-muted rounded-lg p-6 space-y-2 text-left">
              <h2 className="font-semibold text-lg">Hva skjer nå?</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span>
                    Du mottar en e-postbekreftelse med ordredetaljer og en lenke til ordren
                    (gyldig i 14 dager)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span>
                    Ordren blir gjennomgått og godkjent av administrator
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>
                    Du kan følge ordrestatus under "Mine bestillinger"
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">4.</span>
                  <span>
                    Når ordren er godkjent, blir den klargjort for levering
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg">
                <Link href="/webshop/mine-ordre">Se mine bestillinger</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/webshop">Fortsett å handle</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
