import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, MapPin, ShoppingCart, DollarSign, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductStats {
  product: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalQuantity: number;
}

interface MarketAnalysis {
  analysis: string;
  stats: ProductStats[];
  totalProducts: number;
  generatedAt: string;
}

const MarketData = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketAnalysis | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Buscar produtos do banco de dados
  const fetchProducts = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setProducts(data || []);
      return data || [];
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      setError("Erro ao carregar produtos");
      return [];
    }
  };

  // Calcular estatísticas locais
  const calculateLocalStats = (productsData: any[]): ProductStats[] => {
    const productsByType: Record<string, any[]> = {};
    
    productsData.forEach((p) => {
      if (!productsByType[p.product_type]) {
        productsByType[p.product_type] = [];
      }
      productsByType[p.product_type].push(p);
    });

    return Object.entries(productsByType).map(([type, items]) => {
      const prices = items.map((p) => p.price);
      const quantities = items.map((p) => p.quantity);
      return {
        product: type,
        count: items.length,
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        totalQuantity: quantities.reduce((a, b) => a + b, 0)
      };
    }).sort((a, b) => b.count - a.count);
  };

  // Gerar análise de mercado via edge function
  const generateAnalysis = async (productsData: any[]) => {
    if (productsData.length === 0) {
      setError("Nenhum produto disponível para análise");
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("market-analysis", {
        body: { products: productsData, language: "pt" }
      });

      if (fnError) throw fnError;

      setMarketData(data);
      setError(null);
    } catch (err: any) {
      console.error("Erro na análise de mercado:", err);
      // Use local stats if AI analysis fails
      const localStats = calculateLocalStats(productsData);
      setMarketData({
        analysis: "",
        stats: localStats,
        totalProducts: productsData.length,
        generatedAt: new Date().toISOString()
      });
      toast.error("Análise IA indisponível, mostrando dados locais");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const productsData = await fetchProducts();
      if (productsData.length > 0) {
        const localStats = calculateLocalStats(productsData);
        setMarketData({
          analysis: "",
          stats: localStats,
          totalProducts: productsData.length,
          generatedAt: new Date().toISOString()
        });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleRefresh = async () => {
    const productsData = await fetchProducts();
    await generateAnalysis(productsData);
  };

  const formatPrice = (price: number) => `${price.toLocaleString("pt-AO")} Kz`;

  const getDemandLevel = (count: number, total: number): string => {
    const percentage = (count / total) * 100;
    if (percentage >= 20) return "muito alta";
    if (percentage >= 10) return "alta";
    if (percentage >= 5) return "média";
    return "baixa";
  };

  const getDemandBadge = (demand: string) => {
    switch (demand) {
      case "muito alta":
        return <Badge className="bg-success text-success-foreground">Muito Alta</Badge>;
      case "alta":
        return <Badge className="bg-primary text-primary-foreground">Alta</Badge>;
      case "média":
        return <Badge className="bg-accent text-accent-foreground">Média</Badge>;
      default:
        return <Badge variant="outline">{demand}</Badge>;
    }
  };

  const getTrendIcon = (avgPrice: number, minPrice: number, maxPrice: number) => {
    const range = maxPrice - minPrice;
    const position = (avgPrice - minPrice) / range;
    if (position > 0.6) return <TrendingUp className="h-4 w-4 text-success" />;
    if (position < 0.4) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <DollarSign className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando dados de mercado...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-card-border sticky top-0 z-50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
                  Dados de Mercado
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Análise baseada em {marketData?.totalProducts || 0} produtos ativos
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={analyzing}
              className="shrink-0 gap-2"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{analyzing ? "Analisando..." : "Atualizar"}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Error State */}
        {error && products.length === 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis */}
        {marketData?.analysis && (
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Análise de Mercado (IA)
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {marketData.analysis}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Product Statistics */}
        {marketData?.stats && marketData.stats.length > 0 && (
          <>
            {/* Top Products */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Produtos Mais Ofertados
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3 sm:space-y-4">
                    {marketData.stats.slice(0, 5).map((product, index) => (
                      <div 
                        key={product.product} 
                        className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm sm:text-base truncate">{product.product}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {product.count} ofertas • {product.totalQuantity.toLocaleString()} kg
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getDemandBadge(getDemandLevel(product.count, marketData.totalProducts))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Price Analysis */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Análise de Preços por Produto
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketData.stats.map((item) => (
                  <Card key={item.product} className="hover:shadow-medium transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">{item.product}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {item.count} ofertas disponíveis
                          </CardDescription>
                        </div>
                        {getTrendIcon(item.avgPrice, item.minPrice, item.maxPrice)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Preço Médio</p>
                          <p className="text-xl sm:text-2xl font-bold text-primary">
                            {formatPrice(Math.round(item.avgPrice))}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div>
                            <p className="text-muted-foreground">Mínimo</p>
                            <p className="font-medium">{formatPrice(item.minPrice)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Máximo</p>
                            <p className="font-medium">{formatPrice(item.maxPrice)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">Oferta:</span>
                          {getDemandBadge(getDemandLevel(item.count, marketData.totalProducts))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Empty State */}
        {(!marketData?.stats || marketData.stats.length === 0) && !error && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nenhum produto disponível</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Quando houver produtos cadastrados, as análises aparecerão aqui.
              </p>
              <Button onClick={() => navigate("/home")}>
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        {marketData && marketData.stats.length > 0 && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground text-center">
              * Os dados apresentados são baseados em produtos ativos na plataforma AgriLink. 
              Última atualização: {new Date(marketData.generatedAt).toLocaleString("pt-AO")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketData;
