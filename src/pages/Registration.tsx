import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, User, CreditCard, Mail, Lock, Eye, EyeOff, Users, UserPlus } from "lucide-react";
import { angolaProvinces } from "@/data/angola-locations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import agrilinkLogo from "@/assets/agrilink-logo.png";
import { OtpVerificationModal } from "@/components/OtpVerificationModal";
import { toast } from "@/hooks/use-toast";
import { CountryPhoneInput, countries, Country } from "@/components/CountryPhoneInput";
import { changeLanguage, getSavedCountry } from "@/i18n";

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const Registration = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, user } = useAuth();
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [userType, setUserType] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [identityDocument, setIdentityDocument] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [wasReferred, setWasReferred] = useState<'nao' | 'sim'>('nao');
  const [agentCode, setAgentCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [agentCodeValid, setAgentCodeValid] = useState<boolean | null>(null);
  
  // Country selection for phone
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    const savedCode = getSavedCountry();
    return countries.find(c => c.code === savedCode) || countries[0];
  });
  
  // OTP verification modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState("");
  
  // Flag para indicar que estamos no processo de registro (para evitar redirecionamento)
  const [isRegistering, setIsRegistering] = useState(false);

  // Handle country change - also changes language
  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    changeLanguage(country.code);
  };

  // Se o usuário já está logado e NÃO está no processo de registro, redirecionar
  React.useEffect(() => {
    if (user && !isRegistering && !showOtpModal) {
      navigate('/app', { replace: true });
    }
  }, [user, isRegistering, showOtpModal, navigate]);

  const validateAgentCode = async (code: string) => {
    if (!code || code.length !== 6) {
      setAgentCodeValid(null);
      return;
    }
    setValidatingCode(true);
    try {
      const { data, error } = await supabase.rpc('validate_agent_code', { p_code: code });
      if (error) throw error;
      setAgentCodeValid(data === true);
    } catch (error) {
      console.error('Erro ao validar código:', error);
      setAgentCodeValid(false);
    } finally {
      setValidatingCode(false);
    }
  };

  const sendOtpEmail = async (userId: string) => {
    try {
      console.log("Sending OTP email to:", email);
      const { data, error } = await supabase.functions.invoke('send-otp-email', {
        body: {
          user_id: userId,
          email: email,
          full_name: fullName,
        },
      });

      if (error) {
        console.error("Error sending OTP email:", error);
        throw error;
      }

      console.log("OTP email response:", data);
      return { success: true, data };
    } catch (error: any) {
      console.error("Failed to send OTP email:", error);
      return { success: false, error };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    if (!email || !phone) return;
    if (wasReferred === 'sim' && !agentCodeValid) {
      setErrorMessage("Código de agente inválido. Verifique e tente novamente.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setIsRegistering(true); // Marcar que estamos no processo de registro
    try {
      // Combine country code with phone number
      const fullPhone = `${selectedCountry.dialCode} ${phone}`;
      
      const { error, data } = await register({
        email,
        phone: fullPhone,
        password,
        full_name: fullName,
        identity_document: identityDocument,
        user_type: userType as "agricultor" | "agente" | "comprador",
        province_id: selectedProvince,
        municipality_id: selectedMunicipality,
        referred_by_agent_id: wasReferred === 'sim' && agentCode ? agentCode.toUpperCase() : null,
      });

      if (error) {
        if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
          setErrorMessage("Este email já está registrado. Tente fazer login.");
        } else {
          setErrorMessage(error.message || "Não foi possível criar a conta. Verifique os dados e tente novamente.");
        }
        return;
      }
      
      // Get user ID from the registration response
      const userId = data?.user?.id;
      
      if (!userId) {
        setErrorMessage("Erro ao obter dados do usuário. Tente novamente.");
        return;
      }

      setRegisteredUserId(userId);

      // IMPORTANTE: Fazer logout para impedir entrada automática no app
      // O usuário só poderá entrar após verificar o email
      await supabase.auth.signOut();

      // Send OTP email using custom SMTP
      const otpResult = await sendOtpEmail(userId);
      
      if (!otpResult.success) {
        toast({
          title: "Conta criada",
          description: "Conta criada, mas houve um problema ao enviar o código. Tente reenviar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Código enviado!",
          description: "Verifique seu e-mail para o código de verificação.",
        });
      }
      
      // Show OTP verification modal
      setShowOtpModal(true);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrorMessage(error?.message || "Erro inesperado ao criar conta.");
      setIsRegistering(false); // Resetar flag em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setShowOtpModal(false);
    setIsRegistering(false);
    toast({
      title: "Conta verificada!",
      description: "Seu email foi verificado. Faça login para continuar.",
    });
    navigate("/login");
  };

  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    setIsRegistering(false);
    toast({
      title: "Verificação pendente",
      description: "Você pode verificar seu email ao fazer login.",
    });
    navigate("/login");
  };

  const availableMunicipalities =
    angolaProvinces.find((p) => p.id === selectedProvince)?.municipalities || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl relative">

       {/* Overlay de carregamento verde */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center gap-3 animate-pulse">
              <div className="animate-spin h-14 w-14 border-4 border-green-600 border-b-transparent rounded-full"></div>
              <p className="text-green-700 font-semibold flex items-center gap-2">Processando...</p>
              <p className="text-gray-500 text-sm flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 8v4l3 2" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Aguarde um instante…
              </p>
            </div>
          </div>
        )}


        <div className="text-center mb-8">
          <img src={agrilinkLogo} alt="AgriLink" className="h-16 mx-auto mb-2" />
          <h1 className="text-3xl font-bold text-primary">{t('registration.title')}</h1>
          <p className="text-primary/70">{t('registration.subtitle')}</p>
        </div>

        <Card className="border-0 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Users className="h-5 w-5" />
              {t('registration.infoTitle')}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Usuário */}
              <div className="space-y-2">
                <Label>{t('registration.userType')}</Label>
                {isMobile() ? (
                  <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary bg-background"
                    required
                  >
                    <option value="">{t('registration.selectUserType')}</option>
                    <option value="agricultor">{t('registration.farmer')}</option>
                    <option value="agente">{t('registration.agent')}</option>
                    <option value="comprador">{t('registration.buyer')}</option>
                  </select>
                ) : (
                  <Select value={userType} onValueChange={setUserType} required>
                    <SelectTrigger>
                      <SelectValue placeholder={t('registration.selectUserType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agricultor">{t('registration.farmer')}</SelectItem>
                      <SelectItem value="agente">{t('registration.agent')}</SelectItem>
                      <SelectItem value="comprador">{t('registration.buyer')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label>{t('registration.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('registration.fullNamePlaceholder')}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* BI */}
              <div className="space-y-2">
                <Label>{t('registration.identityDocument')}</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={identityDocument}
                    onChange={(e) => setIdentityDocument(e.target.value)}
                    placeholder="000000000AA000"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Telefone com seletor de país */}
              <div className="space-y-2">
                <Label>{t('registration.phone')}</Label>
                <CountryPhoneInput
                  value={phone}
                  onChange={setPhone}
                  selectedCountry={selectedCountry}
                  onCountryChange={handleCountryChange}
                  required
                />
              </div>

              {/* Indicação por Agente */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Label className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('registration.referredByAgent')}
                </Label>
                <RadioGroup value={wasReferred} onValueChange={(v) => setWasReferred(v as 'sim' | 'nao')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="nao" />
                    <Label htmlFor="nao" className="font-normal cursor-pointer">{t('registration.no')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="sim" />
                    <Label htmlFor="sim" className="font-normal cursor-pointer">{t('registration.yes')}</Label>
                  </div>
                </RadioGroup>

                {wasReferred === 'sim' && (
                  <div className="space-y-2 mt-3">
                    <Label>{t('registration.agentCode')}</Label>
                    <div className="relative">
                      <Input
                        value={agentCode}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setAgentCode(value);
                          if (value.length === 6) validateAgentCode(value);
                          else setAgentCodeValid(null);
                        }}
                        placeholder={t('registration.agentCodePlaceholder')}
                        className="uppercase"
                        maxLength={6}
                        required
                      />
                      {validatingCode && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                    {agentCodeValid === true && <p className="text-sm text-green-600">✓ {t('registration.validCode')}</p>}
                    {agentCodeValid === false && <p className="text-sm text-destructive">✗ {t('registration.invalidCode')}</p>}
                  </div>
                )}
              </div>

              {/* Senhas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.password')}
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
                <div className="space-y-2">
                  <Label>{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.confirmPassword')}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <div className="text-destructive text-sm">{t('registration.passwordsNotMatch')}</div>
              )}

              {errorMessage && <div className="text-destructive text-sm">{errorMessage}</div>}

              {/* Localização */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Província */}
                <div className="space-y-2">
                  <Label>{t('registration.province')}</Label>
                  {isMobile() ? (
                    <select
                      value={selectedProvince}
                      onChange={(e) => { setSelectedProvince(e.target.value); setSelectedMunicipality(""); }}
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary bg-background"
                      required
                    >
                      <option value="">{t('registration.selectProvince')}</option>
                      {angolaProvinces.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  ) : (
                    <Select value={selectedProvince} onValueChange={(v) => { setSelectedProvince(v); setSelectedMunicipality(""); }} required>
                      <SelectTrigger><SelectValue placeholder={t('registration.selectProvince')} /></SelectTrigger>
                      <SelectContent>
                        {angolaProvinces.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Município */}
                <div className="space-y-2">
                  <Label>{t('registration.municipality')}</Label>
                  {isMobile() ? (
                    <select
                      value={selectedMunicipality}
                      onChange={(e) => setSelectedMunicipality(e.target.value)}
                      disabled={!selectedProvince}
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary bg-background"
                      required
                    >
                      <option value="">{t('registration.selectMunicipality')}</option>
                      {availableMunicipalities.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                    </select>
                  ) : (
                    <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality} required disabled={!selectedProvince}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('registration.selectMunicipality')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMunicipalities.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Botão */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover rounded-xl py-2 text-base font-medium"
                disabled={
                  loading ||
                  password !== confirmPassword ||
                  !userType ||
                  !selectedProvince ||
                  !selectedMunicipality ||
                  !email ||
                  !phone ||
                  (wasReferred === 'sim' && (!agentCodeValid || validatingCode))
                }
              >
                {loading ? t('common.processing') : t('registration.createAccount')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">{t('registration.alreadyHaveAccount')}</p>
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t('registration.loginHere')}
          </Link>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={handleCloseOtpModal}
        email={email}
        userId={registeredUserId}
        fullName={fullName}
        onSuccess={handleOtpSuccess}
      />
    </div>
  );
};

export default Registration;
