import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  translations,
  AVAILABLE_UI_LANGUAGES,
  UILanguage,
  TranslationKey,
  LanguageOption,
} from "../i18n/translations";

interface LanguageContextData {
  language: UILanguage;
  setLanguage: (lang: UILanguage) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  availableLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextData>({} as LanguageContextData);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<UILanguage>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("translatio_ui_language") as UILanguage;
      if (saved && translations[saved]) {
        return saved;
      }
      // Detecção de idioma do navegador se disponível
      const browserLang = navigator.language?.split("-")[0];
      if (browserLang === "en") return "en";
      if (browserLang === "es") return "es";
      if (browserLang === "fr") return "fr";
      if (browserLang === "de") return "de";
    }
    return "pt-BR";
  });

  const setLanguage = (lang: UILanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("translatio_ui_language", lang);
    }
  };

  const t = useMemo(() => {
    return (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = translations[language] || translations["pt-BR"];
      let text = (dict as any)[key] || (translations["pt-BR"] as any)[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(val));
        });
      }

      return text;
    };
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        availableLanguages: AVAILABLE_UI_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage deve ser usado dentro de um LanguageProvider");
  }
  return context;
}
