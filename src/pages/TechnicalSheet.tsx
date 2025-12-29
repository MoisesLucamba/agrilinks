import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Printer, Phone, MapPin, Calendar, Package, DollarSign, Truck, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface Product {
  id: string;
  product_type: string;
  province_id: string;
  municipality_id: string;
  farmer_name: string;
  quantity: number;
  harvest_date: string;
  price: number;
  logistics_access: string;
  contact: string;
  description?: string;
  created_at: string;
}

const TechnicalSheet = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError("ID do produto não fornecido");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Produto não encontrado");
        } else {
          setProduct(data);
        }
      } catch (err) {
        console.error("Erro ao buscar produto:", err);
        setError("Erro ao carregar dados do produto");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-AO", {
      month: "long",
      year: "numeric"
    });
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString("pt-AO")} Kz/kg`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!product) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(34, 139, 34);
    doc.text("AgriLink B2B", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Ficha Técnica do Produto", pageWidth / 2, 28, { align: "center" });
    
    // Line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, pageWidth - 20, 35);
    
    // Product Title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(product.product_type, pageWidth / 2, 50, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${product.province_id} – ${product.municipality_id}`, pageWidth / 2, 58, { align: "center" });
    
    // Info
    let yPos = 75;
    const lineHeight = 12;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const infoItems = [
      { label: "Agricultor/Cooperativa:", value: product.farmer_name },
      { label: "Quantidade Disponível:", value: `${product.quantity.toLocaleString()} kg` },
      { label: "Data de Colheita:", value: formatDate(product.harvest_date) },
      { label: "Preço:", value: formatPrice(product.price) },
      { label: "Região:", value: `${product.province_id} – ${product.municipality_id}` },
      { label: "Contato:", value: product.contact },
      { label: "Acesso Logístico:", value: product.logistics_access },
    ];
    
    infoItems.forEach(item => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 25, yPos);
      doc.setFont(undefined, "normal");
      doc.text(item.value, 80, yPos);
      yPos += lineHeight;
    });
    
    // Footer
    yPos += 20;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Esta ficha pode ser impressa ou enviada para compradores B2B", pageWidth / 2, yPos, { align: "center" });
    doc.text(`Data de geração: ${new Date().toLocaleDateString("pt-AO")}`, pageWidth / 2, yPos + 8, { align: "center" });
    
    doc.save(`ficha-tecnica-${product.product_type.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando ficha técnica...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Produto não encontrado</CardTitle>
            <CardDescription>
              {error || "A ficha técnica solicitada não existe."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/home")} className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - escondido na impressão */}
      <div className="print:hidden p-4 border-b border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Ficha Técnica</h1>
              <p className="text-sm text-muted-foreground">{product.product_type}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none gap-2">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button onClick={handleExportPDF} className="flex-1 sm:flex-none gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Technical Sheet Content */}
      <div className="p-4 print:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="text-center pb-6">
              <div className="mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">AgriLink B2B</h1>
                <p className="text-muted-foreground">Ficha Técnica do Produto</p>
              </div>
              <Separator />
            </CardHeader>
            
            <CardContent className="space-y-6 sm:space-y-8">
              {/* Product Title */}
              <div className="text-center">
                <h2 className="text-2xl sm:text-4xl font-bold text-primary mb-2">
                  {product.product_type}
                </h2>
                <p className="text-lg sm:text-xl text-muted-foreground">
                  {product.province_id} – {product.municipality_id}
                </p>
              </div>

              {/* Main Info Grid */}
              <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-5 sm:space-y-6">
                  {/* Agricultor */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg">Agricultor/Cooperativa</h3>
                      <p className="text-muted-foreground break-words">{product.farmer_name}</p>
                    </div>
                  </div>

                  {/* Quantidade */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">Quantidade Disponível</h3>
                      <p className="text-xl sm:text-2xl font-bold text-primary">
                        {product.quantity.toLocaleString()} kg
                      </p>
                    </div>
                  </div>

                  {/* Data de Colheita */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">Data de Colheita</h3>
                      <p className="text-muted-foreground">{formatDate(product.harvest_date)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 sm:space-y-6">
                  {/* Preço */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">Preço</h3>
                      <p className="text-xl sm:text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
                    </div>
                  </div>

                  {/* Localização */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">Região</h3>
                      <p className="text-muted-foreground">{product.province_id} – {product.municipality_id}</p>
                    </div>
                  </div>

                  {/* Contato */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">Contato</h3>
                      <p className="text-muted-foreground font-mono text-sm sm:text-base">{product.contact}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logística */}
              <div className="bg-muted/50 p-4 sm:p-6 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg mb-2">Acesso Logístico</h3>
                    <p className="text-muted-foreground">{product.logistics_access}</p>
                  </div>
                </div>
              </div>

              {/* Description if available */}
              {product.description && (
                <div className="bg-muted/30 p-4 sm:p-6 rounded-lg">
                  <h3 className="font-semibold text-base sm:text-lg mb-2">Descrição</h3>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              )}

              {/* Footer */}
              <Separator />
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>🔹 Esta ficha pode ser impressa ou enviada para compradores B2B</p>
                <p>
                  <strong>AgriLink B2B</strong> - Conectando produtores a grandes compradores
                </p>
                <p>
                  Data de geração: {new Date().toLocaleDateString("pt-AO")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TechnicalSheet;
