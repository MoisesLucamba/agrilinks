import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import agrilinkLogo from "@/assets/agrilink-logo.png";

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Tenta trocar o código da URL por uma sessão válida
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("Erro no exchangeCodeForSession:", error);
          setStatus("error");
          setMessage("Erro na confirmação. O link pode ter expirado ou já foi usado.");
          return;
        }

        // Se criou sessão, está confirmado!
        if (data?.session?.user) {
          setStatus("success");
          setMessage("E-mail confirmado com sucesso! Você será redirecionado automaticamente.");
          setTimeout(() => navigate("/app"), 3000);
          return;
        }

        // Caso inesperado: sem erro e sem usuário
        setStatus("error");
        setMessage(
          "Não foi possível confirmar sua conta. Tente fazer login manualmente."
        );
      } catch (err) {
        console.error("Erro inesperado:", err);
        setStatus("error");
        setMessage("Erro inesperado ao confirmar e-mail.");
      }
    };

    confirmEmail();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={agrilinkLogo} alt="AgriLink" className="h-16 mx-auto mb-2" />
          <h1 className="text-3xl font-bold text-primary">AgriLink</h1>
        </div>

        <Card className="border-0 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-center">Confirmação de E-mail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              {status === "loading" && (
                <>
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  <p className="text-center text-muted-foreground">
                    Confirmando seu e-mail...
                  </p>
                </>
              )}

              {status === "success" && (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-green-600">
                      E-mail confirmado!
                    </p>
                    <p className="text-muted-foreground">{message}</p>
                    <p className="text-sm text-muted-foreground">
                      Redirecionando para o app...
                    </p>
                  </div>
                </>
              )}

              {status === "error" && (
                <>
                  <XCircle className="h-16 w-16 text-destructive" />
                  <div className="text-center space-y-4">
                    <p className="text-lg font-semibold text-destructive">
                      Erro na confirmação
                    </p>
                    <p className="text-muted-foreground">{message}</p>
                    <Button
                      onClick={() => navigate("/login")}
                      className="w-full"
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmation;