"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  CalendarDays,
  ChefHat,
  Truck,
  UserCheck,
  BarChart3,
  Settings,
  Menu,
  UtensilsCrossed,
  LogOut,
  Barcode,
  Tag,
  BookOpen,
  FolderTree,
  Factory,
  Clock,
  ChevronDown,
  MessageSquare,
  User
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react"
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
import { ReportIssueDialog } from "@/components/feedback/ReportIssueDialog"
import { ThemeToggle } from "@/components/theme/theme-toggle"

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  name: string
  icon: React.ElementType
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    name: "Meny",
    icon: CalendarDays,
    items: [
      { name: "Menyer", href: "/menus", icon: CalendarDays },
      { name: "Perioder", href: "/perioder", icon: Clock },
      { name: "Oppskrifter", href: "/recipes", icon: ChefHat },
      { name: "Retter", href: "/dishes/create", icon: UtensilsCrossed },
    ]
  },
  {
    name: "Produkter",
    icon: Package,
    items: [
      { name: "Produkter", href: "/produkter", icon: Package },
      { name: "Kategorier", href: "/kategorier", icon: FolderTree },
      { name: "Leverandører", href: "/leverandorer", icon: Factory },
      { name: "EAN-kodestyring", href: "/products/ean-management", icon: Barcode },
    ]
  },
  {
    name: "Ordre",
    icon: ShoppingCart,
    items: [
      { name: "Kunder", href: "/customers", icon: Users },
      { name: "Ordrer", href: "/orders", icon: ShoppingCart },
      { name: "Leveranser", href: "/deliveries", icon: Truck },
      { name: "Etiketter", href: "/labels", icon: Tag },
    ]
  },
  {
    name: "Admin",
    icon: Settings,
    items: [
      { name: "Ansatte", href: "/employees", icon: UserCheck },
      { name: "Brukere", href: "/admin/users", icon: UserCheck },
      { name: "Rapporter", href: "/reports", icon: BarChart3 },
      { name: "Dokumentasjon", href: "/admin/documentation", icon: BookOpen },
      { name: "Innstillinger", href: "/settings", icon: Settings },
    ]
  }
]

function NavDropdown({ group }: { group: NavGroup }) {
  const pathname = usePathname()
  const hasActiveItem = group.items.some(
    item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-1 px-3 py-2 text-sm font-medium",
            hasActiveItem && "bg-primary/10 text-primary"
          )}
        >
          <group.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{group.name}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {group.items.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  isActive && "bg-primary/10 text-primary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Navigasjon</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-6">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg",
              pathname === "/" ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>

          {navigationGroups.map((group) => (
            <div key={group.name}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase">
                {group.name}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href))
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
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export function TopNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 max-w-7xl mx-auto">
          {/* Left: Mobile menu + Logo */}
          <div className="flex items-center gap-2">
            <MobileNav />
            <Link href="/" className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-bold hidden sm:inline">LKC</span>
            </Link>
          </div>

          {/* Center: Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === "/"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            {navigationGroups.map((group) => (
              <NavDropdown key={group.name} group={group} />
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle collapsed={true} />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFeedbackOpen(true)}
              title="Rapporter problem"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

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
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Innstillinger
                    </Link>
                  </DropdownMenuItem>
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

      <ReportIssueDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}
