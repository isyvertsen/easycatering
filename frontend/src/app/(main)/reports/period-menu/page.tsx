"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { FileDown, Printer, Calendar, Users, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Period {
  menyperiodeid: number;
  ukenr: number;
  fradato: string;
  tildato: string;
}

interface CustomerMenuReport {
  period_start: string;
  period_end: string;
  menu_group: {
    gruppeid: number | null;
    gruppe: string | null;
  };
  customers: Array<{
    kundeid: number;
    kundenavn: string;
    adresse: string;
    postnr: string;
    sted: string;
    telefonnummer: string;
    e_post: string;
  }>;
  menu: {
    menyid: number;
    beskrivelse: string;
  };
  products: Array<{
    produktid: number;
    produktnavn: string;
    enhet: string;
    pris: number;
  }>;
}

export default function PeriodMenuReportPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedMenuGroup, setSelectedMenuGroup] = useState<string>("");
  const [menuGroups, setMenuGroups] = useState<any[]>([]);
  const [reportData, setReportData] = useState<CustomerMenuReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPeriods();
    fetchMenuGroups();
  }, []);

  const fetchPeriods = async () => {
    try {
      const response = await api.get("/v1/periode/");
      // API returns paginated response with items array
      setPeriods(response.data.items || response.data);
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke laste perioder",
        variant: "destructive",
      });
    }
  };

  const fetchMenuGroups = async () => {
    try {
      const response = await api.get("/v1/kunde-gruppe/");
      // API returns paginated response with items array
      setMenuGroups(response.data.items || response.data);
    } catch (error) {
      console.error("Failed to load menu groups:", error);
    }
  };

  const generateReport = async () => {
    if (!selectedPeriod) {
      toast({
        title: "Feil",
        description: "Velg en periode",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const params: any = { periode_id: selectedPeriod };
      if (selectedMenuGroup) {
        params.menu_group_id = selectedMenuGroup;
      }

      const response = await api.get("/v1/menu-management/customer-period-report", {
        params,
      });
      setReportData(response.data);
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke generere rapport",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!selectedPeriod) {
      toast({
        title: "Feil",
        description: "Velg en periode og generer rapport først",
        variant: "destructive",
      });
      return;
    }

    try {
      const params: any = { periode_id: selectedPeriod };
      if (selectedMenuGroup) {
        params.menu_group_id = selectedMenuGroup;
      }

      const response = await api.get("/v1/reports/period-menu-pdf", {
        params,
        responseType: "blob",
      });

      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and click it to download
      const a = document.createElement("a");
      a.href = url;
      a.download = `periode_${selectedPeriodData?.ukenr}_meny_rapport.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Suksess",
        description: "PDF-rapport lastet ned",
      });
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke generere PDF-rapport",
        variant: "destructive",
      });
    }
  };

  const print = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy", { locale: nb });
  };

  const selectedPeriodData = periods.find(
    (p) => p.menyperiodeid.toString() === selectedPeriod
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <h1 className="text-3xl font-bold">Period Menu Report</h1>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={print} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <Card className="mb-6 print:hidden">
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem
                      key={period.menyperiodeid}
                      value={period.menyperiodeid.toString()}
                    >
                      Week {period.ukenr} - {formatDate(period.fradato)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Menu Group (Optional)
              </label>
              <Select value={selectedMenuGroup} onValueChange={setSelectedMenuGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All groups</SelectItem>
                  {menuGroups.map((group) => (
                    <SelectItem key={group.gruppeid} value={group.gruppeid.toString()}>
                      {group.gruppe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <div className="space-y-8">
          {/* Report Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Customer Menu Report</h2>
            {selectedPeriodData && (
              <p className="text-lg text-muted-foreground">
                Week {selectedPeriodData.ukenr} - {formatDate(selectedPeriodData.fradato)} to{" "}
                {formatDate(selectedPeriodData.tildato)}
              </p>
            )}
          </div>

          {/* Report Content */}
          {reportData.map((report, index) => (
            <Card key={index} className="page-break-inside-avoid">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{report.menu.beskrivelse}</CardTitle>
                    {report.menu_group.gruppe && (
                      <Badge variant="outline" className="mt-2">
                        {report.menu_group.gruppe}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {report.customers.length} customers
                    </Badge>
                    <Badge variant="secondary">
                      <Package className="mr-1 h-3 w-3" />
                      {report.products.length} products
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customers Section */}
                <div>
                  <h3 className="font-semibold mb-3">Customers</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Contact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.customers.map((customer) => (
                        <TableRow key={customer.kundeid}>
                          <TableCell className="font-medium">
                            {customer.kundenavn}
                          </TableCell>
                          <TableCell>
                            {customer.adresse && (
                              <>
                                {customer.adresse}
                                <br />
                                {customer.postnr} {customer.sted}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.telefonnummer && (
                              <div>{customer.telefonnummer}</div>
                            )}
                            {customer.e_post && (
                              <div className="text-sm text-muted-foreground">
                                {customer.e_post}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Products Section */}
                <div>
                  <h3 className="font-semibold mb-3">Products</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.products.map((product) => (
                        <TableRow key={product.produktid}>
                          <TableCell className="font-medium">
                            {product.produktnavn}
                          </TableCell>
                          <TableCell>{product.enhet || "-"}</TableCell>
                          <TableCell className="text-right">
                            {product.pris ? `kr ${product.pris.toFixed(2)}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}