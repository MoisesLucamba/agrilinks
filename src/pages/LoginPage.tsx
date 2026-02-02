import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock, LogIn, UserPlus, Eye, EyeOff, Info } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import orbisLinkLogo from '@/assets/orbislink-logo.png'
import { OtpVerificationModal } from '@/components/OtpVerificationModal'
import { toast } from '@/hooks/use-toast'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showConfirmEmailModal, setShowConfirmEmailModal] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  
  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [pendingUserId, setPendingUserId] = useState('')
  const [pendingUserName, setPendingUserName] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  // Submissão do login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    try {
      const { error } = await login(email, password)

      if (error) {
        // Se o erro for email não confirmado, buscar dados do usuário e mostrar OTP modal
        if (error.message.includes('email not confirmed') || error.message.includes('User not confirmed') || error.message.includes('Email not confirmed')) {
          // Buscar o user_id pelo email para poder enviar OTP
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, email_verified')
            .eq('email', email)
            .maybeSingle()
          
          if (userData && !userData.email_verified) {
            setPendingUserId(userData.id)
            setPendingUserName(userData.full_name || 'Usuário')
            
            // Enviar OTP automaticamente
            try {
              await supabase.functions.invoke('send-otp-email', {
                body: {
                  user_id: userData.id,
                  email: email,
                  full_name: userData.full_name || 'Usuário',
                },
              })
              toast({
                title: "Código enviado!",
                description: "Verifique seu e-mail para o código de verificação.",
              })
            } catch (otpError) {
              console.error('Error sending OTP:', otpError)
            }
            
            setShowOtpModal(true)
          } else {
            setShowConfirmEmailModal(true)
          }
        } else {
          console.error('Login error:', error)
        }
        return
      }

      navigate('/app')
    } catch (error: any) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recuperar senha
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      alert('Por favor, insira seu email primeiro')
      return
    }

    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      alert('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setShowForgotPassword(false)
    } catch (error: any) {
      alert('Erro ao enviar email: ' + error.message)
    } finally {
      setResetLoading(false)
    }
  }

  // Reenviar e-mail de confirmação
  const handleResendConfirmation = async () => {
    if (!email) {
      alert('Por favor, insira seu e-mail primeiro')
      return
    }

    setResendLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      if (error) throw error

      alert('E-mail de confirmação reenviado! Verifique sua caixa de entrada ou spam.')
    } catch (error: any) {
      alert('Erro ao reenviar e-mail: ' + error.message)
    } finally {
      setResendLoading(false)
    }
  }

  // Quando OTP for verificado com sucesso
  const handleOtpSuccess = async () => {
    setShowOtpModal(false)
    toast({
      title: "Email verificado!",
      description: "Seu email foi verificado. Faça login novamente.",
    })
    // Tentar login novamente automaticamente
    if (email && password) {
      setLoading(true)
      try {
        const { error } = await login(email, password)
        if (!error) {
          navigate('/app')
        }
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCloseOtpModal = () => {
    setShowOtpModal(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 sm:p-6 relative">

      {/* Overlay de carregamento */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-card p-6 rounded-2xl shadow-strong border border-border flex flex-col items-center gap-4 animate-scale-in">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="text-foreground font-semibold">Processando...</p>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Aguarde um instante…
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Logo e mensagem */}
        <div className="text-center mb-6">
          <img src={orbisLinkLogo} alt="OrbisLink" className="h-24 sm:h-28 mx-auto mb-4 drop-shadow-lg" />
          <p className="text-muted-foreground text-base sm:text-lg">Conecta-te ao Mercado</p>
        </div>

        {/* Card login */}
        <Card className="bg-card border border-border/50 rounded-2xl shadow-strong">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-xl sm:text-2xl text-center flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Entrar na Plataforma
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Faça login para acessar sua conta
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Links de ajuda */}
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading || !email}
                  className="text-muted-foreground hover:text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? 'Reenviando...' : 'Reenviar confirmação'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-xl shadow-soft hover:shadow-medium transition-all"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Não tem conta? Cadastre-se como:
              </p>
              
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base rounded-xl border-2 hover:bg-primary/5 transition-all"
                  onClick={() => navigate('/cadastro')}
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Agricultor, Agente ou Comprador
                </Button>
              </div>
            </div>

            <div className="text-center pt-4">
              <Link
                to="/site"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Ver site institucional →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <Link
            to="/termos-publicidade"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Termos de Publicidade OrbisLink
          </Link>

          <footer className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              © <span className="font-semibold text-primary">OrbisLink Lda</span> 2025 — Todos os direitos reservados.
            </p>
          </footer>
        </div>
      </div>

      {/* Modal Esqueci Senha */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card border border-border rounded-2xl shadow-strong animate-scale-in">
            <CardHeader>
              <CardTitle className="text-xl">Recuperar Senha</CardTitle>
              <CardDescription>
                Digite seu email para receber um link de recuperação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 h-11 rounded-xl" disabled={resetLoading}>
                    {resetLoading ? 'Enviando...' : 'Enviar Link'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-11 rounded-xl"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal E-mail não confirmado */}
      {showConfirmEmailModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card border-2 border-warning rounded-2xl shadow-strong animate-scale-in">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Info className="text-warning w-5 h-5" />
              </div>
              <CardTitle className="text-lg">E-mail não confirmado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam. 
                Clique no link que enviamos e você será redirecionado para esta página.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full h-11 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-warning/50 text-warning hover:bg-warning/10"
                  onClick={() => setShowConfirmEmailModal(false)}
                >
                  Entendi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de verificação OTP */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={handleCloseOtpModal}
        email={email}
        userId={pendingUserId}
        fullName={pendingUserName}
        onSuccess={handleOtpSuccess}
      />

    </div>
  )
}

export default LoginPage
