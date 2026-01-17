"use client"

import { WebshopNav } from "@/components/webshop/WebshopNav"
import { CartProvider } from "@/contexts/CartContext"
import { WebshopCustomerProvider, useWebshopCustomer } from "@/contexts/WebshopCustomerContext"
import { Toaster } from "@/components/ui/toaster"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function WebshopAccessCheck({ children }: { children: React.ReactNode }) {
  const {
    hasAccess,
    isLoading,
    errorMessage,
    currentKundeName,
    availableKunder,
  } = useWebshopCustomer()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Sjekker tilgang...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ingen tilgang til webshop</AlertTitle>
          <AlertDescription className="mt-2">
            {errorMessage || "Du har ikke tilgang til webshopen. Kontakt administrator for å få tilgang."}
          </AlertDescription>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/">Gå til forsiden</Link>
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  const hasMultipleCustomers = availableKunder.length > 1

  return (
    <>
      <WebshopNav
        kundeNavn={currentKundeName || undefined}
        showCustomerSelector={hasMultipleCustomers}
      />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </>
  )
}

export default function WebshopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WebshopCustomerProvider>
      <CartProvider>
        <WebshopAccessCheck>
          {children}
        </WebshopAccessCheck>
        <Toaster />
      </CartProvider>
    </WebshopCustomerProvider>
  )
}
