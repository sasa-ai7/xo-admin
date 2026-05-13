/* eslint-disable react-refresh/only-export-components -- hook + provider pattern */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { en } from './en';
import { ar } from './ar';

type Translations = typeof en;
type Lang = 'en' | 'ar';

interface LanguageContextType {
  lang: Lang;
  t: (key: keyof Translations) => string;
  toggleLang: () => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const translations: Record<Lang, Translations> = { en, ar };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem('xo_lang') as Lang) || 'en'
  );

  const isRTL = lang === 'ar';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    localStorage.setItem('xo_lang', lang);
  }, [lang, isRTL]);

  const t = useCallback(
    (key: keyof Translations) => translations[lang][key] || key,
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
