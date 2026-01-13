"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { CartItem } from '@/lib/api/webshop'
import { webshopApi, DraftOrder } from '@/lib/api/webshop'
import { useSession } from 'next-auth/react'

interface CartContextType {
  items: CartItem[]
  draftOrderId: number | null
  isSaving: boolean
  isSynced: boolean
  lastSaved: Date | null
  addItem: (item: Omit<CartItem, 'antall'> & { antall?: number }) => void
  removeItem: (produktid: number) => void
  updateQuantity: (produktid: number, antall: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  loadDraftOrder: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'webshop-cart'
const DRAFT_ORDER_ID_KEY = 'webshop-draft-order-id'
const SAVE_DEBOUNCE_MS = 1000 // Wait 1 second before saving

// Validate cart item from localStorage
function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false
  const i = item as Record<string, unknown>
  return (
    typeof i.produktid === 'number' && i.produktid > 0 &&
    typeof i.produktnavn === 'string' &&
    typeof i.pris === 'number' && i.pris >= 0 &&
    typeof i.antall === 'number' && i.antall > 0 &&
    (i.visningsnavn === undefined || typeof i.visningsnavn === 'string') &&
    (i.bilde === undefined || typeof i.bilde === 'string')
  )
}

// Validate cart items array from localStorage
function validateCartItems(data: unknown): CartItem[] {
  if (!Array.isArray(data)) return []
  return data.filter(isValidCartItem)
}

/**
 * Shopping Cart Provider with backend sync
 *
 * Handles cart state with:
 * - localStorage for offline/guest access
 * - Backend sync for logged-in users (auto-save to database)
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [draftOrderId, setDraftOrderId] = useState<number | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSynced, setIsSynced] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const { data: session, status: sessionStatus } = useSession()
  const isLoggedIn = sessionStatus === 'authenticated'

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSaveRef = useRef(false)
  const isClearingRef = useRef(false) // Prevents auto-reload after intentional clear

  // Load cart from localStorage on mount with validation
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    const storedDraftId = localStorage.getItem(DRAFT_ORDER_ID_KEY)

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Validate all cart items before using
        const validItems = validateCartItems(parsed)
        if (validItems.length !== parsed.length) {
          console.warn('Some invalid cart items were filtered out')
        }
        setItems(validItems)
      } catch (error) {
        console.error('Failed to parse cart from localStorage', error)
      }
    }

    if (storedDraftId) {
      const draftId = parseInt(storedDraftId, 10)
      // Validate draft order ID is a positive integer
      if (!isNaN(draftId) && draftId > 0) {
        setDraftOrderId(draftId)
      } else {
        console.warn('Invalid draft order ID in localStorage, ignoring')
        localStorage.removeItem(DRAFT_ORDER_ID_KEY)
      }
    }

    setIsHydrated(true)
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, isHydrated])

  // Save draft order ID to localStorage
  useEffect(() => {
    if (isHydrated) {
      if (draftOrderId) {
        localStorage.setItem(DRAFT_ORDER_ID_KEY, draftOrderId.toString())
      } else {
        localStorage.removeItem(DRAFT_ORDER_ID_KEY)
      }
    }
  }, [draftOrderId, isHydrated])

  // Sync with backend (debounced)
  const syncToBackend = useCallback(async (cartItems: CartItem[]) => {
    if (!isLoggedIn || cartItems.length === 0) {
      setIsSynced(true)
      return
    }

    setIsSaving(true)
    try {
      const ordrelinjer = cartItems.map(item => ({
        produktid: item.produktid,
        antall: item.antall,
        pris: item.pris
      }))

      const draft = await webshopApi.updateDraftOrder(ordrelinjer)
      setDraftOrderId(draft.ordreid)
      setIsSynced(true)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to sync cart to backend', error)
      setIsSynced(false)
    } finally {
      setIsSaving(false)
      pendingSaveRef.current = false
    }
  }, [isLoggedIn])

  // Debounced save
  const debouncedSave = useCallback((cartItems: CartItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    pendingSaveRef.current = true
    setIsSynced(false)

    saveTimeoutRef.current = setTimeout(() => {
      syncToBackend(cartItems)
    }, SAVE_DEBOUNCE_MS)
  }, [syncToBackend])

  // Load draft order from backend
  const loadDraftOrder = useCallback(async () => {
    if (!isLoggedIn) return

    try {
      const draft = await webshopApi.getDraftOrder()
      if (draft && draft.ordrelinjer.length > 0) {
        // Convert backend order lines to cart items
        // Backend returns produktnavn/visningsnavn directly on line
        const cartItems: CartItem[] = draft.ordrelinjer.map(line => ({
          produktid: line.produktid,
          produktnavn: line.produktnavn || '',
          visningsnavn: line.visningsnavn,
          pris: line.pris ?? 0,
          antall: line.antall ?? 1
        }))

        setItems(cartItems)
        setDraftOrderId(draft.ordreid)
        setIsSynced(true)
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Failed to load draft order', error)
    }
  }, [isLoggedIn])

  // Load draft order when user logs in
  useEffect(() => {
    // Skip loading if cart was intentionally cleared (prevents race condition)
    if (isClearingRef.current) {
      return
    }
    if (isLoggedIn && isHydrated && items.length === 0) {
      loadDraftOrder()
    }
  }, [isLoggedIn, isHydrated, items.length, loadDraftOrder])

  const addItem = (item: Omit<CartItem, 'antall'> & { antall?: number }) => {
    // Reset clearing flag when adding items (cart is active again)
    isClearingRef.current = false

    setItems((prev) => {
      const existing = prev.find((i) => i.produktid === item.produktid)
      let newItems: CartItem[]

      if (existing) {
        newItems = prev.map((i) =>
          i.produktid === item.produktid
            ? { ...i, antall: i.antall + (item.antall || 1) }
            : i
        )
      } else {
        newItems = [...prev, { ...item, antall: item.antall || 1 }]
      }

      // Trigger backend sync
      if (isLoggedIn) {
        debouncedSave(newItems)
      }

      return newItems
    })
  }

  const removeItem = (produktid: number) => {
    setItems((prev) => {
      const newItems = prev.filter((i) => i.produktid !== produktid)

      // Trigger backend sync
      if (isLoggedIn) {
        if (newItems.length === 0 && draftOrderId) {
          // Delete draft order if cart is empty
          webshopApi.deleteDraftOrder(draftOrderId).catch(console.error)
          setDraftOrderId(null)
          setIsSynced(true)
        } else {
          debouncedSave(newItems)
        }
      }

      return newItems
    })
  }

  const updateQuantity = (produktid: number, antall: number) => {
    if (antall <= 0) {
      removeItem(produktid)
      return
    }

    setItems((prev) => {
      const newItems = prev.map((i) =>
        i.produktid === produktid ? { ...i, antall } : i
      )

      // Trigger backend sync
      if (isLoggedIn) {
        debouncedSave(newItems)
      }

      return newItems
    })
  }

  const clearCart = () => {
    // Prevent auto-reload of draft order after clearing
    isClearingRef.current = true

    // Cancel any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Delete draft order from backend
    if (isLoggedIn && draftOrderId) {
      webshopApi.deleteDraftOrder(draftOrderId).catch(console.error)
    }

    // Clear localStorage explicitly
    localStorage.removeItem(CART_STORAGE_KEY)
    localStorage.removeItem(DRAFT_ORDER_ID_KEY)

    setItems([])
    setDraftOrderId(null)
    setIsSynced(true)
    setLastSaved(null)
  }

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.antall, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + item.pris * item.antall, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        draftOrderId,
        isSaving,
        isSynced,
        lastSaved,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        loadDraftOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

/**
 * Hook for accessing cart context
 */
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
