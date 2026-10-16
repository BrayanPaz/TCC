import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: initialLoaderCss }} />
      </head>
      <body>
        <div id="initial-loader" aria-label="Carregando Translatio" role="status">
          <svg className="initial-loader-logo" width="116" height="116" viewBox="0 0 512 512" fill="none" aria-hidden="true" focusable="false">
            <rect x="32" y="32" width="448" height="448" rx="112" fill="#6B8CFF" />
            <path d="M120 160Q188 148 256 184Q324 148 392 160V344Q324 332 256 368Q188 332 120 344Z M256 184V368" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M160 240H216M198 222L216 240L198 258 M352 280H296M314 262L296 280L314 298" stroke="#FFFFFF" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="initial-loader-title">Translatio</div>
          <div className="initial-loader-subtitle">Carregando interface</div>
        </div>
        <noscript>
          <div className="initial-loader-noscript">Ative o JavaScript para usar o Translatio.</div>
        </noscript>
        {children}
      </body>
    </html>
  );
}

const initialLoaderCss = `
  html, body {
    margin: 0;
    min-height: 100%;
    background: #0c0c12;
  }

  #initial-loader {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: #0c0c12;
    color: #fff;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    transition: opacity 220ms ease, visibility 220ms ease;
  }

  #initial-loader.initial-loader-hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .initial-loader-logo {
    flex-shrink: 0;
    animation: initial-loader-pulse 1.35s ease-in-out infinite;
  }

  .initial-loader-title {
    font-size: 20px;
    font-weight: 750;
    letter-spacing: 0.02em;
  }

  .initial-loader-subtitle {
    color: #8888a0;
    font-size: 12px;
  }

  .initial-loader-noscript {
    position: fixed;
    left: 50%;
    bottom: 24px;
    z-index: 2147483647;
    transform: translateX(-50%);
    color: #fff;
    background: #e05a6a;
    padding: 10px 14px;
    border-radius: 10px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  @keyframes initial-loader-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.75; }
  }

  @media (prefers-reduced-motion: reduce) {
    .initial-loader-logo { animation: none; }
    #initial-loader { transition: none; }
  }
`;
