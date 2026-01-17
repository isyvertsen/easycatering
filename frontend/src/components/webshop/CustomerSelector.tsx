"use client"

import { useWebshopCustomer } from '@/contexts/WebshopCustomerContext'
import { useCart } from '@/contexts/CartContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

/**
 * Customer selector for webshop users with access to multiple customers.
 *
 * This component allows users to switch between different customers they have
 * access to. When a customer is selected, the cart is cleared and the new
 * customer's draft order is loaded.
 *
 * Only renders if the user has access to more than one customer.
 */
export function CustomerSelector() {
  const {
    selectedKundeid,
    setSelectedKundeid,
    availableKunder,
    isLoading,
  } = useWebshopCustomer()

  const { setKundeid, loadDraftOrder } = useCart()

  // Don't render if only one customer or loading
  if (isLoading || availableKunder.length <= 1) {
    return null
  }

  const handleCustomerChange = async (value: string) => {
    const newKundeid = parseInt(value, 10)
    if (isNaN(newKundeid)) return

    // Update both contexts
    setSelectedKundeid(newKundeid)
    setKundeid(newKundeid)

    // Load the new customer's draft order
    await loadDraftOrder()
  }

  const selectedKunde = availableKunder.find(k => k.kundeid === selectedKundeid)

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedKundeid?.toString() ?? ''}
        onValueChange={handleCustomerChange}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Velg kunde">
            {selectedKunde?.kunde_navn ?? 'Velg kunde'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableKunder.map((kunde) => (
            <SelectItem
              key={kunde.kundeid}
              value={kunde.kundeid.toString()}
              disabled={!kunde.has_webshop_access}
            >
              <div className="flex flex-col">
                <span>{kunde.kunde_navn}</span>
                {kunde.kundegruppe_navn && (
                  <span className="text-xs text-muted-foreground">
                    {kunde.kundegruppe_navn}
                  </span>
                )}
                {!kunde.has_webshop_access && (
                  <span className="text-xs text-destructive">
                    Ingen webshop-tilgang
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Shows the current customer name as a badge/label.
 * Use this when you don't need the full selector but want to display
 * which customer is currently active.
 */
export function CurrentCustomerLabel() {
  const { currentKundeName, isLoading } = useWebshopCustomer()

  if (isLoading || !currentKundeName) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Building2 className="h-4 w-4" />
      <span>{currentKundeName}</span>
    </div>
  )
}
