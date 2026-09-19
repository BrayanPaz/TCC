// Catálogo expandido de idiomas suportados para tradução acadêmica com IA

export interface TranslationLanguage {
  code: string;
  name: string;
  nativeName?: string;
  flag: string;
}

export const AVAILABLE_TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { code: "auto", name: "Detectar automaticamente", flag: "✨" },
  { code: "en", name: "Inglês (EN)", nativeName: "English", flag: "🇺🇸" },
  { code: "pt-BR", name: "Português (PT-BR)", nativeName: "Português", flag: "🇧🇷" },
  { code: "es", name: "Espanhol (ES)", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Francês (FR)", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "Alemão (DE)", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano (IT)", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "zh", name: "Chinês (ZH)", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japonês (JA)", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ru", name: "Russo (RU)", nativeName: "Русский", flag: "🇷🇺" },
  { code: "ko", name: "Coreano (KO)", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "Árabe (AR)", nativeName: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "Hindi (HI)", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "tr", name: "Turco (TR)", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Holandês (NL)", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polonês (PL)", nativeName: "Polski", flag: "🇵🇱" },
  { code: "sv", name: "Sueco (SV)", nativeName: "Svenska", flag: "🇸🇪" },
  { code: "el", name: "Grego (EL)", nativeName: "Ελληνικά", flag: "🇬🇷" },
  { code: "la", name: "Latim (LA)", nativeName: "Latina (Acadêmico)", flag: "🏛️" },
];
