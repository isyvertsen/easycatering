"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Package, Users, Copy, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Period {
  menyperiodeid: number;
  ukenr: number;
  fradato: string;
  tildato: string;
}

interface Menu {
  menyid: number;
  beskrivelse: string;
  menygruppe: number;
  product_count?: number;
}

interface MenuPeriodSummary {
  periode: Period;
  menus: Menu[];
  total_products: number;
  customer_groups: Array<{
    gruppeid: number;
    gruppe: string;
    customer_count: number;
  }>;
}

interface Product {
  produktid: number;
  produktnavn: string;
  pakningstype?: string;
  pris?: number;
}

export default function MenuManagementPage() {
  const [periods, setPeriods] = useState<MenuPeriodSummary[]>([]);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPeriodOverview();
    fetchAllMenus();
  }, []);

  const fetchPeriodOverview = async () => {
    try {
      const response = await api.get("/menu-management/period-overview");
      setPeriods(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load period overview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMenus = async () => {
    try {
      const response = await api.get("/v1/meny");
      setAllMenus(response.data);
    } catch (error) {
      console.error("Failed to load menus:", error);
    }
  };

  const fetchMenuProducts = async (menuId: number) => {
    try {
      const response = await api.get(`/menyprodukt/details?meny_id=${menuId}`);
      setMenuProducts(response.data.map((mp: any) => mp.produkt));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load menu products",
        variant: "destructive",
      });
    }
  };

  const assignMenuToPeriod = async (periodeId: number, menuId: number) => {
    try {
      await api.post("/menu-management/assign-menu-to-period", null, {
        params: { periode_id: periodeId, meny_id: menuId },
      });
      toast({
        title: "Success",
        description: "Menu assigned to period successfully",
      });
      fetchPeriodOverview();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to assign menu",
        variant: "destructive",
      });
    }
  };

  const clonePeriodMenus = async (sourceId: number, targetId: number) => {
    try {
      const response = await api.post("/menu-management/clone-period-menus", null, {
        params: { source_periode_id: sourceId, target_periode_id: targetId },
      });
      toast({
        title: "Success",
        description: response.data.message,
      });
      fetchPeriodOverview();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to clone menus",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy", { locale: nb });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Menu Management</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Period
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Period Overview</TabsTrigger>
          <TabsTrigger value="menus">Menu Library</TabsTrigger>
          <TabsTrigger value="products">Product Assignment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid gap-4">
              {periods.map((summary) => (
                <Card key={summary.periode.menyperiodeid}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>
                          Week {summary.periode.ukenr} - {formatDate(summary.periode.fradato)} to{" "}
                          {formatDate(summary.periode.tildato)}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">
                            <Package className="mr-1 h-3 w-3" />
                            {summary.total_products} products
                          </Badge>
                          {summary.customer_groups.map((group) => (
                            <Badge key={group.gruppeid} variant="outline">
                              <Users className="mr-1 h-3 w-3" />
                              {group.gruppe}: {group.customer_count} customers
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPeriod(summary.periode)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Menu
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Menu to Period</DialogTitle>
                              <DialogDescription>
                                Select a menu to assign to week {summary.periode.ukenr}
                              </DialogDescription>
                            </DialogHeader>
                            <Select
                              onValueChange={(value) =>
                                assignMenuToPeriod(summary.periode.menyperiodeid, parseInt(value))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a menu" />
                              </SelectTrigger>
                              <SelectContent>
                                {allMenus.map((menu) => (
                                  <SelectItem key={menu.menyid} value={menu.menyid.toString()}>
                                    {menu.beskrivelse}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Clone to next period logic
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Clone
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.menus.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No menus assigned yet</p>
                      ) : (
                        summary.menus.map((menu) => (
                          <div
                            key={menu.menyid}
                            className="flex justify-between items-center p-2 rounded-lg border"
                          >
                            <div>
                              <p className="font-medium">{menu.beskrivelse}</p>
                              <p className="text-sm text-muted-foreground">
                                {menu.product_count || 0} products
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedMenu(menu);
                                fetchMenuProducts(menu.menyid);
                              }}
                            >
                              View Products
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="menus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Library</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Menu Group</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMenus.map((menu) => (
                    <TableRow key={menu.menyid}>
                      <TableCell>{menu.menyid}</TableCell>
                      <TableCell>{menu.beskrivelse}</TableCell>
                      <TableCell>{menu.menygruppe || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMenu(menu);
                            fetchMenuProducts(menu.menyid);
                          }}
                        >
                          Manage Products
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {selectedMenu ? (
            <Card>
              <CardHeader>
                <CardTitle>Products for: {selectedMenu.beskrivelse}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Packaging</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuProducts.map((product) => (
                      <TableRow key={product.produktid}>
                        <TableCell>{product.produktid}</TableCell>
                        <TableCell>{product.produktnavn}</TableCell>
                        <TableCell>{product.pakningstype || "-"}</TableCell>
                        <TableCell>
                          {product.pris ? `kr ${product.pris.toFixed(2)}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-muted-foreground">
              Select a menu to view its products
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}