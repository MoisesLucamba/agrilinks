import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw } from "lucide-react";

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onSuccess: () => void;
}

export const OtpVerificationModal = ({
  isOpen,
  onClose,
  email,
  onSuccess,
}: OtpVerificationModalProps) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Por favor, insira o código de 6 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Use Supabase Auth's built-in OTP verification
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) {
        console.error("Error verifying OTP:", error);
        toast({
          title: "Código inválido",
          description: "O código está incorreto ou expirou. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      if (data?.user) {
        // Update email_verified in public.users table
        await supabase.rpc('sync_user_email_verified', {
          p_user_id: data.user.id,
        });

        toast({
          title: "E-mail verificado!",
          description: "Sua conta foi verificada com sucesso.",
        });
        onSuccess();
      } else {
        toast({
          title: "Código inválido",
          description: "O código está incorreto ou expirou. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Erro na verificação",
        description: "Ocorreu um erro ao verificar o código.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      // Use Supabase Auth's built-in OTP email sending
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) throw error;

      toast({
        title: "Código reenviado",
        description: "Um novo código foi enviado para seu e-mail.",
      });
      setCountdown(60);
      setOtp("");
    } catch (error: any) {
      console.error("Error resending OTP:", error);
      toast({
        title: "Erro ao reenviar",
        description: "Não foi possível reenviar o código.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Verificação de E-mail
          </DialogTitle>
          <DialogDescription>
            Enviamos um código de 6 dígitos para <strong>{email}</strong>. 
            Digite o código abaixo para confirmar seu e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar Código"
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Não recebeu o código?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending || countdown > 0}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : countdown > 0 ? (
                `Reenviar em ${countdown}s`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar código
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            O código expira em 15 minutos. Verifique também sua pasta de spam.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
