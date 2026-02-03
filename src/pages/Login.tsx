import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tractor, BarChart3, Truck, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import orbisLinkLogo from "@/assets/orbislink-logo.png";
import supplyChainHero from "@/assets/supply-chain-hero.jpg";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero Image */}
      <div className="relative lg:w-1/2 h-64 lg:h-auto">
        <img 
          src={supplyChainHero} 
          alt="Supply Chain Operations" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-business/90 via-business/70 to-transparent lg:bg-gradient-to-t lg:from-business/80 lg:via-business/40 lg:to-transparent" />
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-12">
          <div className="text-white max-w-lg">
            <h2 className="text-2xl lg:text-4xl font-black mb-3 leading-tight">
              Conectando produção, logística e mercados em escala
            </h2>
            <p className="text-sm lg:text-base text-white/90 font-medium">
              Infraestrutura B2B que organiza cadeias de abastecimento e reduz intermediários.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Options */}
      <div className="flex-1 bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-xl animate-fade-in">
          {/* Logo & Tagline */}
          <div className="text-center mb-10">
            <img 
              src={orbisLinkLogo} 
              alt="OrbisLink" 
              className="h-16 lg:h-20 mx-auto mb-4"
            />
            <p className="text-base lg:text-lg text-muted-foreground font-semibold">
              Seu elo com os mercados globais
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-5">
            {/* Agricultor/Agente Card */}
            <Card className="group border-2 border-border hover:border-accent rounded-2xl shadow-soft hover:shadow-strong transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-2/5 bg-gradient-to-br from-primary to-primary-hover p-6 flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <Tractor className="h-10 w-10 text-white" />
                    <Building2 className="h-8 w-8 text-accent" />
                  </div>
                </div>
                <div className="flex-1 p-5">
                  <CardTitle className="text-xl font-black mb-2 text-foreground">
                    Produtor / Agente
                  </CardTitle>
                  <CardDescription className="text-sm font-medium mb-4">
                    Publique produtos e conecte-se com grandes compradores
                  </CardDescription>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      className="flex-1 h-11 font-bold rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover shadow-soft"
                      onClick={() => navigate('/cadastro')}
                    >
                      Cadastrar
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 h-11 font-bold rounded-xl border-2 hover:bg-primary/5"
                      onClick={() => navigate('/publicar-produto')}
                    >
                      Publicar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Equipa OrbisLink Card */}
            <Card className="group border-2 border-border hover:border-primary rounded-2xl shadow-soft hover:shadow-strong transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-2/5 bg-gradient-to-br from-business to-business-light p-6 flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-10 w-10 text-white" />
                    <Truck className="h-8 w-8 text-accent" />
                  </div>
                </div>
                <div className="flex-1 p-5">
                  <CardTitle className="text-xl font-black mb-2 text-foreground">
                    Equipa OrbisLink
                  </CardTitle>
                  <CardDescription className="text-sm font-medium mb-4">
                    Dashboard administrativo e gestão de operações
                  </CardDescription>
                  <Button 
                    className="w-full h-11 font-bold rounded-xl bg-primary hover:bg-primary-hover shadow-soft"
                    onClick={() => navigate('/dashboard')}
                  >
                    Aceder Dashboard
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Features Strip */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-card rounded-xl border border-border">
              <div className="text-2xl font-black text-primary">B2B</div>
              <div className="text-xs font-semibold text-muted-foreground">Exclusivo</div>
            </div>
            <div className="p-3 bg-card rounded-xl border border-border">
              <div className="text-2xl font-black text-accent">24/7</div>
              <div className="text-xs font-semibold text-muted-foreground">Suporte</div>
            </div>
            <div className="p-3 bg-card rounded-xl border border-border">
              <div className="text-2xl font-black text-primary">100%</div>
              <div className="text-xs font-semibold text-muted-foreground">Digital</div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 space-y-2">
            <p className="text-xs text-muted-foreground font-semibold">
              Conectando mercados. Movendo economias.
            </p>
            <p className="text-xs text-muted-foreground/70">
              © <span className="font-bold text-primary">OrbisLink Lda</span> 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
