"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMenusList, useDeleteMenu } from "@/hooks/useMenus"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Calendar, FileText, Printer, Settings2 } from "lucide-react"

export default function MenusPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [menuGroups, setMenuGroups] = useState<Record<number, string>>({})
  const [params, setParams] = useState({
    skip: 0,
    limit: 20,
    search: "",
  })

  const { data, isLoading } = useMenusList(params)
  const deleteMutation = useDeleteMenu()

  // Fetch menu groups
  useEffect(() => {
    const fetchMenuGroups = async () => {
      try {
        const response = await api.get("/v1/menygruppe")
        const groupsMap: Record<number, string> = {}
        response.data.forEach((group: any) => {
          groupsMap[group.gruppeid] = group.gruppe || group.beskrivelse || ""
        })
        setMenuGroups(groupsMap)
      } catch (error) {
        console.error("Failed to fetch menu groups:", error)
      }
    }
    fetchMenuGroups()
  }, [])

  const handleSearch = (value: string) => {
    setSearch(value)
    setParams(prev => ({ ...prev, search: value, skip: 0 }))
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => {
          setDeleteId(null)
        }
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Menyer</h1>
        <p className="text-muted-foreground">
          Administrer menyer og ukentlig planlegging
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/menus/weekly-plan">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Calendar className="h-8 w-8 text-blue-600" />
                <Printer className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Ukentlig Menyplan</CardTitle>
              <CardDescription className="mt-2">
                Generer og skriv ut menybestillingsskjema for 4 uker
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/menus/order-registration">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-green-600" />
                <Edit className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Registrer Bestilling</CardTitle>
              <CardDescription className="mt-2">
                Registrer ordrer fra utfylte menyskjemaer
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/menus/templates">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-purple-600" />
                <Plus className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Menymaler</CardTitle>
              <CardDescription className="mt-2">
                Opprett og administrer gjenbrukbare menymaler
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/menus/management">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Settings2 className="h-8 w-8 text-orange-600" />
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Periode Administrasjon</CardTitle>
              <CardDescription className="mt-2">
                Administrer perioder, menyer og produkter
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Menu List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Søk i menyer..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 w-[300px]"
              />
            </div>
          </div>
          <Button asChild>
            <Link href="/menus/new">
              <Plus className="mr-2 h-4 w-4" />
              Ny meny
            </Link>
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Beskrivelse</TableHead>
                <TableHead>Menygruppe</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Laster...
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Ingen menyer funnet
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((menu) => (
                  <TableRow key={menu.menyid}>
                    <TableCell className="font-mono">{menu.menyid}</TableCell>
                    <TableCell>{menu.beskrivelse || "-"}</TableCell>
                    <TableCell>
                      {menu.menygruppe ? (menuGroups[menu.menygruppe] || "-") : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/menus/${menu.menyid}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Rediger
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(menu.menyid)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Slett
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handlingen kan ikke angres. Dette vil permanent slette menyen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}