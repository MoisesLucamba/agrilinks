import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe, Check, ChevronRight } from 'lucide-react';
import orbisLinkLogo from '@/assets/orbislink-logo.png';

const languages = [
  { code: 'pt', name: 'Português', flag: '🇵🇹', greeting: 'Bem-vindo!' },
  { code: 'en', name: 'English', flag: '🇬🇧', greeting: 'Welcome!' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', greeting: 'Bienvenue!' },
];

export const LanguageWelcomeBanner = () => {
  const { i18n } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'pt');
  const [step, setStep] = useState<'language' | 'welcome'>('language');

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('orbislink_welcome_seen');
    if (!hasSeenWelcome) {
      setShowBanner(true);
    }
  }, []);

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
    i18n.changeLanguage(code);
  };

  const handleContinue = () => {
    if (step === 'language') {
      setStep('welcome');
    } else {
      localStorage.setItem('orbislink_language', selectedLanguage);
      localStorage.setItem('orbislink_welcome_seen', 'true');
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  const selectedLang = languages.find(l => l.code === selectedLanguage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header with logo */}
        <div className="bg-[#0a1628] px-6 py-5 flex flex-col items-center">
          <img src={orbisLinkLogo} alt="OrbisLink" className="h-12 mb-2" />
          <p className="text-[#B8860B] text-xs font-medium tracking-wider uppercase">
            Marketplace Agrícola
          </p>
        </div>

        {step === 'language' ? (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-[#5BA3D9]" />
              <h2 className="text-lg font-bold text-[#0a1628]">
                Escolha o idioma
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Select your language / Choisissez votre langue
            </p>

            <div className="space-y-2 mb-6">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-200 ${
                    selectedLanguage === lang.code
                      ? 'border-[#5BA3D9] bg-[#5BA3D9]/5 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-[#5BA3D9]/40 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-left">
                      <span className="font-semibold text-[#0a1628] block text-sm">{lang.name}</span>
                      <span className="text-xs text-gray-400">{lang.greeting}</span>
                    </div>
                  </div>
                  {selectedLanguage === lang.code && (
                    <div className="h-6 w-6 rounded-full bg-[#5BA3D9] flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <Button 
              onClick={handleContinue} 
              className="w-full bg-[#5BA3D9] hover:bg-[#4A93C9] text-white gap-2"
              size="lg"
            >
              {selectedLanguage === 'pt' && 'Continuar'}
              {selectedLanguage === 'en' && 'Continue'}
              {selectedLanguage === 'fr' && 'Continuer'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="text-5xl mb-4">{selectedLang?.flag}</div>
            <h2 className="text-2xl font-bold text-[#0a1628] mb-2">
              {selectedLang?.greeting} 🌱
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {selectedLanguage === 'pt' && 'O OrbisLink conecta agricultores e compradores de forma simples e segura. Vamos começar!'}
              {selectedLanguage === 'en' && 'OrbisLink connects farmers and buyers simply and securely. Let\'s get started!'}
              {selectedLanguage === 'fr' && 'OrbisLink connecte agriculteurs et acheteurs simplement et en toute sécurité. Commençons !'}
            </p>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-[#5BA3D9]/10 rounded-xl p-3">
                <div className="text-xl mb-1">🌾</div>
                <p className="text-xs font-medium text-[#0a1628]">
                  {selectedLanguage === 'pt' ? 'Produtos frescos' : selectedLanguage === 'en' ? 'Fresh products' : 'Produits frais'}
                </p>
              </div>
              <div className="flex-1 bg-[#B8860B]/10 rounded-xl p-3">
                <div className="text-xl mb-1">🤝</div>
                <p className="text-xs font-medium text-[#0a1628]">
                  {selectedLanguage === 'pt' ? 'Negócio direto' : selectedLanguage === 'en' ? 'Direct business' : 'Commerce direct'}
                </p>
              </div>
              <div className="flex-1 bg-green-50 rounded-xl p-3">
                <div className="text-xl mb-1">📊</div>
                <p className="text-xs font-medium text-[#0a1628]">
                  {selectedLanguage === 'pt' ? 'Dados de mercado' : selectedLanguage === 'en' ? 'Market data' : 'Données marché'}
                </p>
              </div>
            </div>

            <Button 
              onClick={handleContinue} 
              className="w-full bg-[#0a1628] hover:bg-[#0a1628]/90 text-white gap-2"
              size="lg"
            >
              {selectedLanguage === 'pt' && 'Começar a explorar'}
              {selectedLanguage === 'en' && 'Start exploring'}
              {selectedLanguage === 'fr' && 'Commencer à explorer'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
