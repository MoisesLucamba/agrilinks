import { Button } from "./ui/button";
import { ArrowRight, Link2, Truck, BarChart3, Building2, ShoppingCart, Package, Zap, Shield, Eye, TrendingUp } from "lucide-react";
import supplyChainHero from "@/assets/supply-chain-hero.jpg";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Hero Image Background */}
      <div className="absolute inset-0">
        <img 
          src={supplyChainHero} 
          alt="Supply Chain" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-business/95 via-business/85 to-primary/70"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm border border-accent/30 rounded-full px-4 py-2 mb-6">
              <Link2 className="h-4 w-4 text-accent" />
              <span className="text-sm font-bold text-white">Plataforma B2B de Integração</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Conectando{" "}
              <span className="text-accent">produção</span>, {" "}
              <span className="text-accent">logística</span> e{" "}
              <span className="text-accent">mercados</span> em escala
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed font-medium max-w-2xl">
              A OrbisLink conecta fabricantes, distribuidores e grandes compradores em um único ecossistema digital, 
              permitindo entregas diretas da fábrica para supermercados, grossistas e revendedores.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button size="lg" className="h-14 px-8 text-lg font-black rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover shadow-strong">
                Começar Agora
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-bold rounded-xl border-2 border-white text-white hover:bg-white hover:text-business">
                Como Funciona
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl lg:text-3xl font-black text-accent">100+</div>
                <div className="text-white/80 text-sm font-semibold">Parceiros</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl lg:text-3xl font-black text-accent">Nacional</div>
                <div className="text-white/80 text-sm font-semibold">Cobertura</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl lg:text-3xl font-black text-accent">24/7</div>
                <div className="text-white/80 text-sm font-semibold">Operação</div>
              </div>
            </div>
          </div>

          {/* Features Cards */}
          <div className="grid gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-strong hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent rounded-xl">
                  <Truck className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Logística Integrada</h3>
                  <p className="text-white/80 font-medium">Entregas com parceiros certificados</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-strong hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent rounded-xl">
                  <Building2 className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Menos Intermediários</h3>
                  <p className="text-white/80 font-medium">Conexão direta fábrica-comprador</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-strong hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent rounded-xl">
                  <BarChart3 className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Dados Estratégicos</h3>
                  <p className="text-white/80 font-medium">Inteligência de mercado em tempo real</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-strong hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent rounded-xl">
                  <Shield className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Parceiros Validados</h3>
                  <p className="text-white/80 font-medium">Processos claros e confiáveis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Section */}
      <div className="relative bg-foreground text-background py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black mb-4">O Desafio do Mercado Atual</h2>
            <p className="text-lg text-background/80 font-medium max-w-3xl mx-auto">
              Em mercados em crescimento, as cadeias de fornecimento ainda operam de forma fragmentada, 
              com múltiplos intermediários, pouca visibilidade de preços, falhas logísticas e falta de dados para planeamento.
            </p>
          </div>
          
          <div className="bg-accent rounded-2xl p-8 text-center">
            <p className="text-xl lg:text-2xl font-black text-accent-foreground">
              A OrbisLink nasce para resolver esse desalinhamento, criando conexões diretas, seguras e eficientes entre quem produz e quem compra em grande escala.
            </p>
          </div>
        </div>
      </div>

      {/* What We Do Section */}
      <div className="relative bg-background py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-foreground mb-4">O que a OrbisLink faz</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Link2, title: "Conecta Diretamente", desc: "Fabricantes a supermercados, grossistas e revendedores" },
              { icon: ShoppingCart, title: "Centraliza Pedidos", desc: "B2B em um único ambiente digital" },
              { icon: Truck, title: "Organiza Entregas", desc: "Logística integrada com parceiros certificados" },
              { icon: TrendingUp, title: "Reduz Custos", desc: "Operacionais e riscos de fornecimento" },
              { icon: BarChart3, title: "Gera Dados", desc: "Estratégicos de consumo e demanda" },
              { icon: Eye, title: "Transparência Total", desc: "Preços, prazos e volumes visíveis" },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border-2 border-border hover:border-primary shadow-soft hover:shadow-medium transition-all duration-300 group">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-black text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sectors Section */}
      <div className="relative bg-primary py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">Sectores Estratégicos Atendidos</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <div className="p-4 bg-accent rounded-2xl w-fit mx-auto mb-4">
                <Package className="h-10 w-10 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Alimentos & Bebidas</h3>
              <p className="text-white/80 font-medium">
                Garantia de fornecimento contínuo, redução de rupturas e maior estabilidade de preços para produtos de consumo diário.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <div className="p-4 bg-accent rounded-2xl w-fit mx-auto mb-4">
                <Zap className="h-10 w-10 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Higiene & Limpeza</h3>
              <p className="text-white/80 font-medium">
                Distribuição eficiente de produtos essenciais, com logística otimizada e maior previsibilidade de estoque.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <div className="p-4 bg-accent rounded-2xl w-fit mx-auto mb-4">
                <Building2 className="h-10 w-10 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Materiais de Construção</h3>
              <p className="text-white/80 font-medium">
                Organização da cadeia de distribuição para apoiar o crescimento urbano e o desenvolvimento económico.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Section */}
      <div className="relative bg-background py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-foreground mb-4">Por que escolher a OrbisLink</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { title: "Eficiência", desc: "Menos intermediários, mais controlo" },
              { title: "Confiabilidade", desc: "Parceiros validados e processos claros" },
              { title: "Escala", desc: "Preparada para operar em nível nacional" },
              { title: "Transparência", desc: "Preços, prazos e volumes visíveis" },
              { title: "Inteligência", desc: "Dados que orientam decisões estratégicas" },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border-2 border-border hover:border-accent shadow-soft hover:shadow-medium transition-all duration-300 text-center">
                <h3 className="text-lg font-black text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Target Audience Section */}
      <div className="relative bg-business py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">OrbisLink é para quem</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Building2, title: "Fabricantes", desc: "Que querem vender em escala com previsibilidade" },
              { icon: ShoppingCart, title: "Supermercados & Grossistas", desc: "Que precisam de fornecimento confiável" },
              { icon: Package, title: "Revendedores", desc: "Que buscam melhores preços e prazos" },
              { icon: Truck, title: "Parceiros Logísticos", desc: "Que desejam operar de forma estruturada" },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center group hover:bg-white/15 transition-all duration-300">
                <div className="p-4 bg-accent rounded-2xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">{item.title}</h3>
                <p className="text-white/80 font-medium text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vision Section */}
      <div className="relative bg-accent py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-black text-accent-foreground mb-6">Nossa Visão</h2>
          <p className="text-xl lg:text-2xl font-bold text-accent-foreground/90 mb-8">
            Ser a plataforma que organiza e conecta os sectores essenciais da economia, criando um mercado mais eficiente, transparente e sustentável.
          </p>
          <div className="inline-block bg-foreground/10 backdrop-blur-sm rounded-2xl px-8 py-4">
            <p className="text-lg font-black text-accent-foreground">
              Conectando mercados. Movendo economias.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
