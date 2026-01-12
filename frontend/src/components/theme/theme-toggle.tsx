"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full text-foreground hover:bg-muted",
          collapsed ? "justify-center px-0" : "justify-start"
        )}
      >
        <Sun className={cn(
          "h-5 w-5 text-muted-foreground",
          !collapsed && "mr-3"
        )} />
        {!collapsed && <span>Tema</span>}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full text-foreground hover:bg-muted",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          title={collapsed ? "Bytt tema" : undefined}
        >
          {theme === "dark" ? (
            <Moon className={cn(
              "h-5 w-5 text-muted-foreground",
              !collapsed && "mr-3"
            )} />
          ) : theme === "light" ? (
            <Sun className={cn(
              "h-5 w-5 text-muted-foreground",
              !collapsed && "mr-3"
            )} />
          ) : (
            <Monitor className={cn(
              "h-5 w-5 text-muted-foreground",
              !collapsed && "mr-3"
            )} />
          )}
          {!collapsed && (
            <span>
              {theme === "dark" ? "Mørkt" : theme === "light" ? "Lyst" : "System"}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? "end" : "start"} side="right">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Lyst</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Mørkt</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
