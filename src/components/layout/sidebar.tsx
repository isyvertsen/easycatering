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
  X,
  UtensilsCrossed,
  LogOut,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Tag,
  MessageSquare,
  BookOpen
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react"
import { User } from "lucide-react"
import { ReportIssueDialog } from "@/components/feedback/ReportIssueDialog"
import { ThemeToggle } from "@/components/theme/theme-toggle"

const navigationGroups = [
  {
    name: "",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ]
  },
  {
    name: "Meny & Oppskrifter",
    items: [
      { name: "Menyer", href: "/menus", icon: CalendarDays },
      { name: "Oppskrifter", href: "/recipes", icon: ChefHat },
      { name: "Retter", href: "/dishes/create", icon: UtensilsCrossed },
    ]
  },
  {
    name: "Drift",
    items: [
      { name: "Kunder", href: "/customers", icon: Users },
      { name: "Ordrer", href: "/orders", icon: ShoppingCart },
      { name: "Produkter", href: "/produkter", icon: Package },
      { name: "EAN-kodestyring", href: "/products/ean-management", icon: Barcode },
      { name: "Etiketter", href: "/labels", icon: Tag },
      { name: "Leveranser", href: "/deliveries", icon: Truck },
    ]
  },
  {
    name: "Administrasjon",
    items: [
      { name: "Ansatte", href: "/employees", icon: UserCheck },
      { name: "Brukere", href: "/admin/users", icon: UserCheck },
      { name: "Dokumentasjon", href: "/admin/documentation", icon: BookOpen },
      { name: "Rapporter", href: "/reports", icon: BarChart3 },
      { name: "Innstillinger", href: "/settings", icon: Settings },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { data: session } = useSession()

  // Toggle collapsed state (localStorage removed to avoid SSR issues)
  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 bg-background border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "lg:w-20 w-64" : "w-64"
      )}>
        <div className="flex h-16 items-center border-b border-border px-6 flex-shrink-0 relative">
          {!collapsed && (
            <h1 className="text-xl font-bold text-foreground">Larvik Catering</h1>
          )}
          {collapsed && (
            <h1 className="text-xl font-bold text-foreground text-center w-full">LC</h1>
          )}

          {/* Desktop toggle button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {navigationGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {group.name && !collapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.name}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href))

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted",
                          collapsed && "justify-center"
                        )}
                        onClick={() => setSidebarOpen(false)}
                        title={collapsed ? item.name : undefined}
                      >
                        <item.icon className={cn(
                          "h-5 w-5",
                          !collapsed && "mr-3",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} />
                        {!collapsed && item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-border flex-shrink-0 space-y-2">
            {/* User info section */}
            {session?.user && (
              <div className={cn(
                "flex items-center px-3 py-2 rounded-lg bg-muted",
                collapsed ? "justify-center" : "gap-3"
              )}>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || session.user.email || ''}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    {session.user.name && (
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.user.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Theme toggle */}
            <ThemeToggle collapsed={collapsed} />

            {/* Feedback button */}
            <Button
              variant="ghost"
              className={cn(
                "w-full text-foreground hover:bg-muted",
                collapsed ? "justify-center px-0" : "justify-start"
              )}
              onClick={() => setFeedbackOpen(true)}
              title={collapsed ? "Rapporter problem" : undefined}
            >
              <MessageSquare className={cn(
                "h-5 w-5 text-muted-foreground",
                !collapsed && "mr-3"
              )} />
              {!collapsed && "Rapporter problem"}
            </Button>

            {/* Logout button */}
            <Button
              variant="ghost"
              className={cn(
                "w-full text-foreground hover:bg-muted",
                collapsed ? "justify-center px-0" : "justify-start"
              )}
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              title={collapsed ? "Logg ut" : undefined}
            >
              <LogOut className={cn(
                "h-5 w-5 text-muted-foreground",
                !collapsed && "mr-3"
              )} />
              {!collapsed && "Logg ut"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Feedback Dialog */}
      <ReportIssueDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}