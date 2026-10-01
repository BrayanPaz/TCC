import React, { createContext, useContext, useEffect, useState } from "react";

export type FontScale = "small" | "normal" | "large" | "xlarge";

export interface AccessibilitySettings {
  fontScale: FontScale;
  highContrast: boolean;
  reduceMotion: boolean;
  dyslexiaFont: boolean;
  underlineLinks: boolean;
  announceProgress: boolean;
}

interface AccessibilityContextData extends AccessibilitySettings {
  setFontScale: (scale: FontScale) => void;
  setHighContrast: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setDyslexiaFont: (value: boolean) => void;
  setUnderlineLinks: (value: boolean) => void;
  setAnnounceProgress: (value: boolean) => void;
}

const STORAGE_KEY = "translatio_a11y_settings";

const DEFAULTS: AccessibilitySettings = {
  fontScale: "normal",
  highContrast: false,
  reduceMotion: false,
  dyslexiaFont: false,
  underlineLinks: false,
  announceProgress: true,
};

const FONT_SCALE_MAP: Record<FontScale, number> = {
  small: 0.9,
  normal: 1,
  large: 1.18,
  xlarge: 1.35,
};

const AccessibilityContext = createContext<AccessibilityContextData>({} as AccessibilityContextData);

function loadSettings(): AccessibilitySettings {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function applyToDocument(settings: AccessibilitySettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--a11y-font-scale", String(FONT_SCALE_MAP[settings.fontScale]));
  root.classList.toggle("a11y-high-contrast", settings.highContrast);
  root.classList.toggle("a11y-reduce-motion", settings.reduceMotion);
  root.classList.toggle("a11y-dyslexia", settings.dyslexiaFont);
  root.classList.toggle("a11y-underline-links", settings.underlineLinks);
}

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULTS);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applyToDocument(loaded);
  }, []);

  const persist = (next: AccessibilitySettings) => {
    setSettings(next);
    applyToDocument(next);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        setFontScale: (fontScale) => persist({ ...settings, fontScale }),
        setHighContrast: (highContrast) => persist({ ...settings, highContrast }),
        setReduceMotion: (reduceMotion) => persist({ ...settings, reduceMotion }),
        setDyslexiaFont: (dyslexiaFont) => persist({ ...settings, dyslexiaFont }),
        setUnderlineLinks: (underlineLinks) => persist({ ...settings, underlineLinks }),
        setAnnounceProgress: (announceProgress) => persist({ ...settings, announceProgress }),
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility deve ser usado dentro de AccessibilityProvider");
  }
  return context;
}
