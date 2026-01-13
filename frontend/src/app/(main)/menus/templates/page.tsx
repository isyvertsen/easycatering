"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMenusList, useDeleteMenu, useCreateMenu } from "@/hooks/useMenus"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Copy, FileText, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function MenuTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [params, setParams] = useState({
    skip: 0,
    limit: 50,
    search: "",
  })

  const { data, isLoading } = useMenusList(params)
  const deleteMutation = useDeleteMenu()
  const createMutation = useCreateMenu()

  const handleSearch = (value: string) => {
    setSearch(value)
    setParams(prev => ({ ...prev, search: value, skip: 0 }))
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => {
          setDeleteId(null)
          toast({
            title: "Menymal slettet",
            description: "Menymalen ble slettet",
          })
        }
      })
    }
  }

  const handleCreate = () => {
    if (!newTemplateName.trim()) return

    createMutation.mutate(
      { beskrivelse: newTemplateName },
      {
        onSuccess: (newMenu) => {
          setCreateDialogOpen(false)
          setNewTemplateName("")
          toast({
            title: "Menymal opprettet",
            description: "Du kan nå legge til produkter i menymalen",
          })
          router.push(`/menus/${newMenu.menyid}`)
        },
        onError: () => {
          toast({
            title: "Feil",
            description: "Kunne ikke opprette menymal",
            variant: "destructive",
          })
        }
      }
    )
  }

  const handleDuplicate = (menuId: number, description: string) => {
    createMutation.mutate(
      { beskrivelse: `Kopi av ${description}` },
      {
        onSuccess: (newMenu) => {
          toast({
            title: "Menymal duplisert",
            description: `Ny menymal opprettet: ${newMenu.beskrivelse}`,
          })
        },
        onError: () => {
          toast({
            title: "Feil",
            description: "Kunne ikke duplisere menymal",
            variant: "destructive",
          })
        }
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/menus">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menymaler</h1>
          <p className="text-muted-foreground">
            Opprett og administrer gjenbrukbare menymaler
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Om menymaler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Menymaler er forhåndsdefinerte menyer som kan gjenbrukes på tvers av perioder.
            Du kan opprette en menymal med produkter, og deretter tilordne den til ulike perioder
            i periode-administrasjonen.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Søk i menymaler..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 w-[300px]"
              />
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ny menymal
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
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8" />
                      <p>Ingen menymaler funnet</p>
                      <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Opprett din første menymal
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((menu) => (
                  <TableRow key={menu.menyid}>
                    <TableCell className="font-mono">{menu.menyid}</TableCell>
                    <TableCell>{menu.beskrivelse || "-"}</TableCell>
                    <TableCell>
                      {menu.gruppe?.beskrivelse || "-"}
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
                            onClick={() => handleDuplicate(menu.menyid, menu.beskrivelse || `Meny ${menu.menyid}`)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Dupliser
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny menymal</DialogTitle>
            <DialogDescription>
              Opprett en ny menymal som kan gjenbrukes på tvers av perioder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn på menymal</Label>
              <Input
                id="name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="F.eks. Ukemeny A, Sommermeny, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !newTemplateName.trim()}>
              {createMutation.isPending ? "Oppretter..." : "Opprett"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handlingen kan ikke angres. Dette vil permanent slette menymalen.
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
