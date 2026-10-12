import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: initialLoaderCss }} />
      </head>
      <body>
        <div id="initial-loader" aria-label="Carregando Translatio" role="status">
          <div className="initial-loader-card" aria-hidden="true">
            <div className="initial-loader-brace initial-loader-brace-left" />
            <div className="initial-loader-core">
              <div className="initial-loader-dot initial-loader-dot-a" />
              <div className="initial-loader-slash" />
              <div className="initial-loader-dot initial-loader-dot-b" />
            </div>
            <div className="initial-loader-brace initial-loader-brace-right" />
          </div>
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
    background:
      radial-gradient(circle at 50% 42%, rgba(107, 140, 255, 0.16), transparent 34%),
      #0c0c12;
    color: #fff;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    transition: opacity 220ms ease, visibility 220ms ease;
  }

  #initial-loader.initial-loader-hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .initial-loader-card {
    width: 116px;
    height: 116px;
    border-radius: 28px;
    border: 2px solid rgba(107, 140, 255, 0.95);
    background: #10101a;
    box-shadow: 0 0 34px rgba(107, 140, 255, 0.32);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    animation: initial-loader-pulse 1.35s ease-in-out infinite;
  }

  .initial-loader-brace {
    width: 22px;
    height: 70px;
    position: relative;
  }

  .initial-loader-brace::before,
  .initial-loader-brace::after {
    content: "";
    position: absolute;
    width: 18px;
    height: 31px;
    border-color: #6b8cff;
    border-style: solid;
  }

  .initial-loader-brace-left::before {
    top: 0;
    right: 0;
    border-width: 4px 0 0 4px;
    border-radius: 14px 0 0 0;
  }

  .initial-loader-brace-left::after {
    bottom: 0;
    right: 0;
    border-width: 0 0 4px 4px;
    border-radius: 0 0 0 14px;
  }

  .initial-loader-brace-right::before {
    top: 0;
    left: 0;
    border-width: 4px 4px 0 0;
    border-radius: 0 14px 0 0;
  }

  .initial-loader-brace-right::after {
    bottom: 0;
    left: 0;
    border-width: 0 4px 4px 0;
    border-radius: 0 0 14px 0;
  }

  .initial-loader-core {
    position: relative;
    width: 36px;
    height: 70px;
  }

  .initial-loader-slash {
    position: absolute;
    left: 15px;
    top: -1px;
    width: 6px;
    height: 72px;
    border-radius: 999px;
    background: #e8ecff;
    transform: rotate(23deg);
  }

  .initial-loader-dot {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: #dde5ff;
  }

  .initial-loader-dot-a {
    left: 0;
    bottom: 12px;
    background: #fff;
  }

  .initial-loader-dot-b {
    right: 0;
    top: 12px;
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
    0%, 100% { transform: scale(1); box-shadow: 0 0 34px rgba(107, 140, 255, 0.28); }
    50% { transform: scale(1.025); box-shadow: 0 0 46px rgba(107, 140, 255, 0.42); }
  }
`;
