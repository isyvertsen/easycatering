"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ShoppingCart,
  Package,
  ClipboardList,
  LogOut,
  Menu,
  Store,
  User,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/CartContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { CustomerSelector } from "@/components/webshop/CustomerSelector"

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

const navigationItems: NavItem[] = [
  { name: "Produkter", href: "/webshop", icon: Package },
  { name: "Mine ordrer", href: "/webshop/mine-ordre", icon: ClipboardList },
]

function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { getTotalItems } = useCart()
  const totalItems = getTotalItems()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Webshop
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/webshop" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg",
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}

          <Link
            href="/webshop/checkout"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg",
              pathname === "/webshop/checkout" ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            Handlekurv
            {totalItems > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {totalItems}
              </Badge>
            )}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

interface WebshopNavProps {
  kundeNavn?: string
  showCustomerSelector?: boolean
}

export function WebshopNav({ kundeNavn, showCustomerSelector = false }: WebshopNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { getTotalItems } = useCart()
  const totalItems = getTotalItems()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 max-w-7xl mx-auto">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/webshop" className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-bold">Webshop</span>
          </Link>
          {showCustomerSelector ? (
            <div className="hidden sm:block ml-2">
              <CustomerSelector />
            </div>
          ) : kundeNavn ? (
            <span className="hidden sm:inline text-sm text-muted-foreground ml-2">
              | {kundeNavn}
            </span>
          ) : null}
        </div>

        {/* Center: Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/webshop" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Cart button */}
          <Link href="/webshop/checkout">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>
          </Link>

          <ThemeToggle collapsed={true} />

          {/* User menu */}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || ''}
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="hidden md:inline text-sm max-w-[100px] truncate">
                    {session.user.name || session.user.email}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{session.user.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="flex items-center gap-2 cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Logg ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
