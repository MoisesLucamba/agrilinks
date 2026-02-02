import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';

const languages = [
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export const LanguageWelcomeBanner = () => {
  const { i18n } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('orbislink_welcome_seen');
    if (!hasSeenWelcome) {
      setShowBanner(true);
    }
  }, []);

  const handleConfirm = () => {
    i18n.changeLanguage(selectedLanguage);
    localStorage.setItem('orbislink_language', selectedLanguage);
    localStorage.setItem('orbislink_welcome_seen', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Globe className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-center text-foreground mb-2">
          Bem-vindo ao OrbisLink! 🌱
        </h2>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          Welcome! Choose your preferred language / Choisissez votre langue
        </p>

        <div className="space-y-2 mb-6">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                selectedLanguage === lang.code
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:border-primary/50 text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
              </div>
              {selectedLanguage === lang.code && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>

        <Button 
          onClick={handleConfirm} 
          className="w-full"
          size="lg"
        >
          {selectedLanguage === 'pt' && 'Continuar'}
          {selectedLanguage === 'en' && 'Continue'}
          {selectedLanguage === 'fr' && 'Continuer'}
        </Button>
      </div>
    </div>
  );
};
