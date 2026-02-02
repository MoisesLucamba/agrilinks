import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tractor, BarChart3, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import orbisLinkLogo from "@/assets/orbislink-logo.png";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl animate-fade-in">
        {/* Logo & Tagline */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="relative inline-block mb-4">
            <img 
              src={orbisLinkLogo} 
              alt="OrbisLink" 
              className="h-20 sm:h-24 mx-auto drop-shadow-lg"
            />
            <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-accent animate-pulse-soft" />
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Conectando produtores diretamente a grandes compradores
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Agricultor/Agente Card */}
          <Card className="group bg-card border border-border/50 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-fit group-hover:scale-105 transition-transform duration-300">
                <Tractor className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Agricultor/Agente</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Publique seus produtos agrícolas e conecte-se com grandes compradores
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <Button 
                size="lg" 
                className="w-full h-12 text-base font-semibold rounded-xl shadow-soft hover:shadow-medium transition-all"
                onClick={() => navigate('/cadastro')}
              >
                Fazer Cadastro
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full h-12 text-base font-semibold rounded-xl border-2 hover:bg-primary/5 transition-all"
                onClick={() => navigate('/publicar-produto')}
              >
                Publicar Produto
              </Button>
            </CardContent>
          </Card>

          {/* Equipa OrbisLink Card */}
          <Card className="group bg-card border border-border/50 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-business/10 to-business/5 rounded-2xl w-fit group-hover:scale-105 transition-transform duration-300">
                <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 text-business" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Equipa OrbisLink</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Acesse o dashboard administrativo e gerencie os produtos publicados
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                size="lg" 
                variant="secondary"
                className="w-full h-12 text-base font-semibold rounded-xl shadow-soft hover:shadow-medium transition-all"
                onClick={() => navigate('/dashboard')}
              >
                Ver Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 space-y-4">
          <p className="text-sm text-muted-foreground">
            MVP OrbisLink B2B — Wireframe desenvolvido no Lovable
          </p>
          <p className="text-xs text-muted-foreground/70">
            © <span className="font-semibold text-primary">OrbisLink Lda</span> 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
