"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Save, Plus, Trash2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

interface MenuFormData {
  beskrivelse: string
  menygruppe: number | null
}

export default function MenuDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [menuGroups, setMenuGroups] = useState<any[]>([])
  const [menuProducts, setMenuProducts] = useState<any[]>([])
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
  const [formData, setFormData] = useState<MenuFormData>({
    beskrivelse: "",
    menygruppe: null,
  })

  const isNew = (params.id as string) === "new"
  const menuId = isNew ? null : parseInt(params.id as string)

  useEffect(() => {
    fetchMenuGroups()
    if (!isNew) {
      fetchMenu()
      fetchMenuProducts()
    } else {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (addProductDialogOpen) {
      fetchAvailableProducts()
    }
  }, [addProductDialogOpen])

  const fetchMenuGroups = async () => {
    try {
      const response = await api.get("/v1/menygruppe?page_size=100")
      // API returns { items: [...] }, not a direct array
      const groups = response.data.items || response.data
      setMenuGroups(Array.isArray(groups) ? groups : [])
    } catch (error) {
      console.error("Failed to fetch menu groups:", error)
    }
  }

  const fetchMenu = async () => {
    try {
      const response = await api.get(`/v1/meny/${menuId}`)
      setFormData({
        beskrivelse: response.data.beskrivelse || "",
        menygruppe: response.data.menygruppe,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load menu",
        variant: "destructive",
      })
      router.push("/menus")
    } finally {
      setLoading(false)
    }
  }

  const fetchMenuProducts = async () => {
    if (!menuId) return
    try {
      const response = await api.get(`/menyprodukt/details?meny_id=${menuId}`)
      setMenuProducts(response.data)
    } catch (error) {
      console.error("Failed to fetch menu products:", error)
    }
  }

  const fetchAvailableProducts = async () => {
    try {
      const response = await api.get("/v1/produkter?page_size=1000&aktiv=true")
      setAvailableProducts(response.data.items || response.data)
    } catch (error) {
      console.error("Failed to fetch products:", error)
    }
  }

  const handleAddProduct = async (produktId: number) => {
    if (!menuId) return
    try {
      await api.post("/menyprodukt/", {
        menyid: menuId,
        produktid: produktId,
      })
      toast({
        title: "Success",
        description: "Product added to menu",
      })
      fetchMenuProducts()
      setAddProductDialogOpen(false)
      setProductSearch("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to add product",
        variant: "destructive",
      })
    }
  }

  const handleRemoveProduct = async (produktId: number) => {
    if (!menuId) return
    try {
      await api.delete(`/menyprodukt/?meny_id=${menuId}&produkt_id=${produktId}`)
      toast({
        title: "Success",
        description: "Product removed from menu",
      })
      fetchMenuProducts()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to remove product",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (isNew) {
        await api.post("/v1/meny", formData)
        toast({
          title: "Success",
          description: "Menu created successfully",
        })
      } else {
        await api.put(`/v1/meny/${menuId}`, formData)
        toast({
          title: "Success",
          description: "Menu updated successfully",
        })
      }
      router.push("/menus")
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isNew ? "create" : "update"} menu`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/menus")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Menus
        </Button>
        <h1 className="text-3xl font-bold">
          {isNew ? "Create New Menu" : "Edit Menu"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="beskrivelse">Description</Label>
              <Textarea
                id="beskrivelse"
                value={formData.beskrivelse}
                onChange={(e) =>
                  setFormData({ ...formData, beskrivelse: e.target.value })
                }
                placeholder="Enter menu description"
                required
              />
            </div>

            <div>
              <Label htmlFor="menygruppe">Menu Group</Label>
              <Select
                value={formData.menygruppe?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    menygruppe: value && value !== "none" ? parseInt(value) : null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a menu group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen</SelectItem>
                  {menuGroups.map((group) => (
                    <SelectItem
                      key={group.gruppeid}
                      value={group.gruppeid?.toString() || ""}
                    >
                      {group.beskrivelse || `Gruppe ${group.gruppeid}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/menus")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isNew && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Menu Products</CardTitle>
              <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Product to Menu</DialogTitle>
                    <DialogDescription>
                      Search and select products to add to this menu
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="w-[100px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableProducts
                            .filter((p) =>
                              p.produktnavn?.toLowerCase().includes(productSearch.toLowerCase())
                            )
                            .filter((p) =>
                              !menuProducts.some((mp) => mp.produktid === p.produktid)
                            )
                            .slice(0, 50)
                            .map((product) => (
                              <TableRow key={product.produktid}>
                                <TableCell>{product.produktnavn}</TableCell>
                                <TableCell>{product.kategori?.kategorinavn || "-"}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddProduct(product.produktid)}
                                  >
                                    Add
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {menuProducts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No products added to this menu yet. Click "Add Product" to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuProducts.map((menuProduct) => (
                    <TableRow key={menuProduct.produktid}>
                      <TableCell>{menuProduct.produkt?.produktnavn || "Unknown"}</TableCell>
                      <TableCell>
                        {menuProduct.produkt?.kategori?.kategorinavn || "-"}
                      </TableCell>
                      <TableCell>
                        {menuProduct.produkt?.pris
                          ? `kr ${menuProduct.produkt.pris.toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveProduct(menuProduct.produktid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}