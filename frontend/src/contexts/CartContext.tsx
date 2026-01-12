"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CartItem } from '@/lib/api/webshop'

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'antall'> & { antall?: number }) => void
  removeItem: (produktid: number) => void
  updateQuantity: (produktid: number, antall: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'webshop-cart'

/**
 * Shopping Cart Provider
 *
 * Håndterer handlekurv-state på klientsiden med localStorage-persistering
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setItems(parsed)
      } catch (error) {
        console.error('Failed to parse cart from localStorage', error)
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

  const addItem = (item: Omit<CartItem, 'antall'> & { antall?: number }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.produktid === item.produktid)
      if (existing) {
        // Increment quantity
        return prev.map((i) =>
          i.produktid === item.produktid
            ? { ...i, antall: i.antall + (item.antall || 1) }
            : i
        )
      } else {
        // Add new item
        return [...prev, { ...item, antall: item.antall || 1 }]
      }
    })
  }

  const removeItem = (produktid: number) => {
    setItems((prev) => prev.filter((i) => i.produktid !== produktid))
  }

  const updateQuantity = (produktid: number, antall: number) => {
    if (antall <= 0) {
      removeItem(produktid)
      return
    }

    setItems((prev) =>
      prev.map((i) => (i.produktid === produktid ? { ...i, antall } : i))
    )
  }

  const clearCart = () => {
    setItems([])
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
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
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
