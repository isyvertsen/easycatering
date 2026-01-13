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
import { ArrowLeft, Save } from "lucide-react"
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
    } else {
      setLoading(false)
    }
  }, [params.id])

  const fetchMenuGroups = async () => {
    try {
      const response = await api.get("/v1/menygruppe")
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
    </div>
  )
}