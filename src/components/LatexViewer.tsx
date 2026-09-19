import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import katex from "katex";
import { useLanguage } from "../context/LanguageContext";

interface LatexViewerProps {
  latexCode: string;
  langTitle: string;
  isAccent?: boolean;
  theme?: "dark" | "light";
}

/**
 * Renderizador Acadêmico Completo de Documentos LaTeX com KaTeX e Suporte a Temas Claro e Escuro
 */
export default function LatexViewer({
  latexCode,
  langTitle,
  isAccent = false,
  theme = "dark",
}: LatexViewerProps) {
  const isLight = theme === "light";
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"page-light" | "page-dark" | "code">("page-light");
  const [copied, setCopied] = useState(false);

  // Copiar código para a área de transferência
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(latexCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download do arquivo .tex puro
  const handleDownloadTex = () => {
    if (typeof document !== "undefined") {
      const blob = new Blob([latexCode], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${langTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.tex`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Impressão / Exportação direta em PDF Vetorial
  const handlePrintPDF = () => {
    if (typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${langTitle}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            @page { margin: 20mm 18mm; size: A4 portrait; }
            body {
              font-family: 'Latin Modern Roman', 'Times New Roman', Times, serif;
              padding: 0;
              margin: 0 auto;
              color: #111;
              line-height: 1.65;
              font-size: 11pt;
              max-width: 780px;
              background: #fff;
            }
            .page-container { padding: 10px 0; }
            .doc-header {
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              font-size: 9pt;
              color: #555;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            h1 { font-size: 16pt; text-align: center; margin: 20px 0 16px 0; font-weight: bold; line-height: 1.3; }
            h2 { font-size: 12.5pt; margin: 22px 0 10px 0; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            h3 { font-size: 11pt; margin: 16px 0 8px 0; font-weight: bold; color: #222; }
            p { text-align: justify; margin-bottom: 12px; text-indent: 1.8em; }
            .math-display { text-align: center; margin: 18px 0; padding: 10px 0; overflow-x: auto; }
            .katex-display { margin: 0 !important; }
            ul, ol { margin: 10px 0 14px 28px; padding: 0; }
            li { margin-bottom: 6px; }
            table { border-collapse: collapse; margin: 18px auto; width: 95%; font-size: 10pt; }
            th, td { border: 1px solid #bbb; padding: 8px 12px; text-align: left; }
            th { background: #f2f2f2; font-weight: bold; }
            @media print { body { max-width: 100%; } }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="doc-header">
              <span>Translatio • Documento Científico</span>
              <span>${langTitle}</span>
            </div>
            ${convertLatexToAcademicPaperHtml(latexCode, false)}
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 600);
    }
  };

  // Converte o LaTeX para visualização em página A4 formatada
  const renderedPaperHtml = useMemo(() => {
    const isDark = viewMode === "page-dark";
    return convertLatexToAcademicPaperHtml(latexCode, isDark);
  }, [latexCode, viewMode]);

  return (
    <View className="flex-1 flex-col h-full overflow-hidden">
      {/* Barra Superior com Controles Responsivos */}
      <View
        className={`flex-row flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b flex-shrink-0 ${
          isLight ? "border-neutral-200" : "border-white/[0.07]"
        }`}
      >
        {/* Título do Documento */}
        <View className="flex-row items-center flex-1 min-w-[140px]">
          <Feather
            name="file-text"
            size={12}
            color={isAccent ? "#6b8cff" : isLight ? "#6b7280" : "#6b6b80"}
          />
          <Text
            className={`text-[10px] font-medium uppercase tracking-wider ml-1.5 truncate ${
              isAccent
                ? "text-[#6b8cff] font-bold"
                : isLight
                ? "text-neutral-700 font-semibold"
                : "text-[#6b6b80]"
            }`}
            numberOfLines={1}
          >
            {langTitle}
          </Text>
        </View>

        {/* Ações de Modo de Página e Download */}
        <View className="flex-row items-center gap-1.5 flex-shrink-0">
          {/* Seletor de Modo: Página A4 (Clara) | Página Escura | Código .tex */}
          <View
            className={`flex-row rounded-lg p-0.5 border transition-all ${
              isLight ? "bg-neutral-100 border-neutral-200" : "bg-white/[0.05] border-white/[0.06]"
            }`}
          >
            <TouchableOpacity
              className={`px-2.5 py-1 rounded-md flex-row items-center gap-1 active:scale-95 transition-all ${
                viewMode === "page-light"
                  ? isLight
                    ? "bg-white shadow-sm border border-neutral-200"
                    : "bg-white shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setViewMode("page-light")}
              accessibilityLabel={t("viewModePdf")}
            >
              <Feather
                name="file"
                size={10}
                color={viewMode === "page-light" ? "#111111" : isLight ? "#9ca3af" : "#6b6b80"}
              />
              <Text
                className={`text-[9px] font-medium ${
                  viewMode === "page-light"
                    ? "text-neutral-900 font-bold"
                    : isLight
                    ? "text-neutral-500"
                    : "text-[#6b6b80]"
                }`}
              >
                {t("viewModePdf")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-2 py-1 rounded-md flex-row items-center gap-1 active:scale-95 transition-all ${
                viewMode === "page-dark"
                  ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30"
                  : "bg-transparent"
              }`}
              onPress={() => setViewMode("page-dark")}
              accessibilityLabel={t("viewModeDark")}
            >
              <Feather
                name="moon"
                size={10}
                color={viewMode === "page-dark" ? "#ffffff" : isLight ? "#9ca3af" : "#6b6b80"}
              />
              <Text
                className={`text-[9px] font-medium ${
                  viewMode === "page-dark"
                    ? "text-white font-bold"
                    : isLight
                    ? "text-neutral-500"
                    : "text-[#6b6b80]"
                }`}
              >
                {t("viewModeDark")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-2 py-1 rounded-md flex-row items-center gap-1 active:scale-95 transition-all ${
                viewMode === "code"
                  ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30"
                  : "bg-transparent"
              }`}
              onPress={() => setViewMode("code")}
              accessibilityLabel={t("viewModeTex")}
            >
              <Feather
                name="code"
                size={10}
                color={viewMode === "code" ? "#ffffff" : isLight ? "#9ca3af" : "#6b6b80"}
              />
              <Text
                className={`text-[9px] font-medium ${
                  viewMode === "code"
                    ? "text-white font-bold"
                    : isLight
                    ? "text-neutral-500"
                    : "text-[#6b6b80]"
                }`}
              >
                {t("viewModeTex")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botão Copiar */}
          <TouchableOpacity
            className={`p-1.5 rounded-lg border active:scale-90 transition-all ${
              isLight
                ? "bg-white border-neutral-200 hover:bg-neutral-100"
                : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
            }`}
            onPress={handleCopy}
            accessibilityLabel={copied ? t("codeCopied") : t("copyCode")}
          >
            <Feather
              name={copied ? "check" : "copy"}
              size={11}
              color={copied ? "#10b981" : isLight ? "#6b7280" : "#a0a0b8"}
            />
          </TouchableOpacity>

          {/* Botão Baixar .tex */}
          <TouchableOpacity
            className={`flex-row items-center px-2 py-1.5 rounded-lg border active:scale-90 transition-all ${
              isLight
                ? "bg-white border-neutral-200 hover:bg-neutral-100"
                : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
            }`}
            onPress={handleDownloadTex}
            accessibilityLabel={t("downloadTex")}
          >
            <Feather name="download" size={10} color={isLight ? "#6b7280" : "#a0a0b8"} />
            <Text
              className={`text-[9px] font-medium ml-1 ${
                isLight ? "text-neutral-700" : "text-[#a0a0b8]"
              }`}
            >
              .tex
            </Text>
          </TouchableOpacity>

          {/* Botão Exportar PDF */}
          <TouchableOpacity
            className="flex-row items-center px-2.5 py-1.5 rounded-lg bg-[#6b8cff]/15 border border-[#6b8cff]/30 hover:bg-[#6b8cff]/25 active:scale-90 transition-all"
            onPress={handlePrintPDF}
            accessibilityLabel={t("printPdf")}
          >
            <Feather name="printer" size={10} color="#6b8cff" />
            <Text className="text-[#6b8cff] text-[9px] font-bold ml-1">PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Visualizador de Página A4 ou Código Fonte */}
      <ScrollView
        className={`flex-1 ${
          isLight
            ? "bg-[#eef1f5]"
            : viewMode === "page-light"
            ? "bg-[#09090e]"
            : "bg-[#0c0c12]"
        } p-2 rounded-xl border ${isLight ? "border-neutral-200" : "border-transparent"}`}
        showsVerticalScrollIndicator={true}
      >
        {viewMode === "code" ? (
          <View
            className={`p-5 rounded-xl border animate-smooth-fade ${
              isLight ? "bg-neutral-900 border-neutral-800" : "bg-[#0c0c12] border-white/[0.07]"
            }`}
          >
            <Text className="text-[#c8c8d8] font-mono text-xs leading-relaxed select-text">
              {latexCode}
            </Text>
          </View>
        ) : Platform.OS === "web" ? (
          /* PÁGINA A4 ESTILO PDF */
          <div
            className="pdf-page-wrapper animate-smooth-fade"
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "16px 8px 32px 8px",
            }}
          >
            <div
              className="a4-paper-sheet"
              style={{
                width: "100%",
                maxWidth: "760px",
                minHeight: "920px",
                backgroundColor: viewMode === "page-light" ? "#ffffff" : "#14141e",
                color: viewMode === "page-light" ? "#1a1a24" : "#e0e0ec",
                boxShadow:
                  isLight && viewMode === "page-light"
                    ? "0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)"
                    : viewMode === "page-light"
                    ? "0 12px 36px -8px rgba(0, 0, 0, 0.65), 0 0 1px rgba(0, 0, 0, 0.2)"
                    : "0 12px 36px -8px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                border:
                  isLight && viewMode === "page-light"
                    ? "1px solid #e5e7eb"
                    : viewMode === "page-light"
                    ? "1px solid rgba(0,0,0,0.1)"
                    : "1px solid rgba(255,255,255,0.08)",
                padding: "48px 54px",
                boxSizing: "border-box",
                fontFamily:
                  "'Latin Modern Roman', 'Computer Modern', 'Times New Roman', Times, Georgia, serif",
                fontSize: "13px",
                lineHeight: "1.75",
              }}
            >
              {/* Cabeçalho da Página */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom:
                    viewMode === "page-light"
                      ? "1px solid #e0e0e0"
                      : "1px solid rgba(255,255,255,0.08)",
                  paddingBottom: "8px",
                  marginBottom: "28px",
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: viewMode === "page-light" ? "#777777" : "#777790",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                <span>Translatio • Documento Científico</span>
                <span>{langTitle}</span>
              </div>

              {/* Conteúdo Renderizado da Página */}
              <div dangerouslySetInnerHTML={{ __html: renderedPaperHtml }} />

              {/* Rodapé da Página */}
              <div
                style={{
                  marginTop: "48px",
                  paddingTop: "12px",
                  borderTop:
                    viewMode === "page-light"
                      ? "1px solid #eeeeee"
                      : "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "9px",
                  color: viewMode === "page-light" ? "#888888" : "#6b6b80",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                <span>Translatio Academic Engine</span>
                <span>Página 1</span>
              </div>
            </div>
          </div>
        ) : (
          <View className="p-4 bg-white rounded-lg">
            <Text className="text-neutral-900 font-serif text-xs">{latexCode}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Renderizador Robusto de KaTeX com auto-reparo e sanitização de fórmulas
 */
function renderMathSafely(rawFormula: string, isDisplay: boolean): string {
  try {
    let clean = rawFormula.trim();

    // 1. Remove tags de ambientes matemáticos desnecessárias antes de processar
    clean = clean
      .replace(/\\begin\{(equation|align|gather|multline)\*?\}/g, "")
      .replace(/\\end\{(equation|align|gather|multline)\*?\}/g, "")
      .trim();

    // 2. Restaura marcadores de chaves escapadas \{ e \}
    clean = clean
      .replace(/___LBRACE___/g, "\\{")
      .replace(/___RBRACE___/g, "\\}");

    // 3. Corrige delimitadores de chaves não escapadas em \left e \right (erro clássico do KaTeX)
    // No LaTeX/KaTeX, delimitadores de chaves DEVEM ser escapados: \left\{ e \right\}
    clean = clean
      .replace(/\\left\s*\{(?![a-zA-Z])/g, "\\left\\{")
      .replace(/\\right\s*\}(?![a-zA-Z])/g, "\\right\\}");

    // 4. Corrige frações sem chaves geradas por OCR ou LLMs
    // Exemplo: \fracUh\nu -> \frac{U}{h\nu}
    clean = clean.replace(/\\frac([A-Z])([a-z])\\([a-zA-Z]+)/g, "\\frac{$1}{$2\\$3}");
    // Exemplo: \fracU\nu -> \frac{U}{\nu}
    clean = clean.replace(/\\frac([A-Za-z0-9])\\([a-zA-Z]+)/g, "\\frac{$1}{\\$2}");
    // Exemplo: \frac12 -> \frac{1}{2} ou \fracXY -> \frac{X}{Y}
    clean = clean.replace(/\\frac([A-Za-z0-9])([A-Za-z0-9])/g, "\\frac{$1}{$2}");

    // 5. Se houver pontuação colada imediatamente após \right (ex: \right}.), separa
    clean = clean.replace(/(\\right\\[\{\}\(\)\[\]\.\/\|])([.,;])/g, "$1 $2");

    // 6. Se a fórmula contém alinhamento (& ou \\) e não está dentro de um ambiente alinhado, encapsula em aligned
    if ((clean.includes("&") || clean.includes("\\\\")) && !clean.includes("\\begin{aligned}")) {
      clean = `\\begin{aligned} ${clean} \\end{aligned}`;
    }

    // 7. Corrige comandos comuns mal escapados em LaTeX
    clean = clean
      .replace(/\\d\s*\\nu/g, "\\,\\mathrm{d}\\nu")
      .replace(/\\d([a-zA-Z])/g, "\\,\\mathrm{d}$1")
      .replace(/\\text\s*\{([^}]+)\}/g, "\\text{$1}")
      .replace(/\\vartheta/g, "\\vartheta");

    const rendered = katex.renderToString(clean, {
      displayMode: isDisplay,
      throwOnError: false, // Nunca quebra em erro; renderiza o restante da fórmula normalmente
    });

    return rendered;
  } catch {
    return `<code class="math-fallback">${rawFormula}</code>`;
  }
}

/**
 * Parser e Sanitizador Completo de LaTeX para HTML Acadêmico
 */
function convertLatexToAcademicPaperHtml(latex: string, isDark: boolean): string {
  if (!latex || !latex.trim()) {
    return "<p style='color:#888;font-style:italic;text-align:center;padding:40px 0;'>Nenhum conteúdo para exibir.</p>";
  }

  // Se o documento original for uma menção a arquivo anexado legada
  if (latex.startsWith("[Documento:") || latex.startsWith("[Arquivo")) {
    const docName = latex.replace(/[\[\]]/g, "").trim();
    return `
      <div style="text-align:center;padding:54px 20px;">
        <div style="width:52px;height:52px;border-radius:14px;background:${
          isDark ? "rgba(107,140,255,0.15)" : "#eff6ff"
        };margin:0 auto 16px auto;display:flex;align-items:center;justify-content:center;font-size:24px;">📄</div>
        <h2 style="font-size:15px;font-weight:bold;margin-bottom:8px;color:${
          isDark ? "#e0e0ec" : "#111827"
        };">${docName}</h2>
        <p style="font-size:12px;color:${
          isDark ? "#8888a0" : "#6b7280"
        };max-width:460px;margin:0 auto;text-indent:0;line-height:1.6;">O documento original foi processado via IA multimodal e sintetizado em código LaTeX integral no painel traduzido.</p>
      </div>
    `;
  }

  const footnotes: string[] = [];

  // 0. Preservação de Chaves Escapadas (\{ e \})
  let clean = latex
    .replace(/\\\{/g, "___LBRACE___")
    .replace(/\\\}/g, "___RBRACE___");

  // 1. Limpeza de Preâmbulos Técnicos e Pacotes de Configuração
  clean = clean
    .replace(/\\documentclass(\[[^\]]*\])?\{[^}]+\}/g, "")
    .replace(/\\usepackage(\[[^\]]*\])?\{[^}]+\}/g, "")
    .replace(/\\geometry(\[[^\]]*\])?\{[^}]+\}/gi, "")
    .replace(/\\pagestyle\{[^}]+\}/gi, "")
    .replace(/\\thispagestyle\{[^}]+\}/gi, "")
    .replace(/\\setlength\{[^}]+\}\{[^}]+\}/gi, "")
    .replace(/\\addtolength\{[^}]+\}\{[^}]+\}/gi, "")
    .replace(/\\setcounter\{[^}]+\}\{[^}]+\}/gi, "")
    .replace(/\\begin\{document\}/gi, "")
    .replace(/\\end\{document\}/gi, "")
    .replace(/\\maketitle/gi, "")
    .replace(/%.*$/gm, ""); // remove comentários

  // 2. Extração e Tratamento de Footnotes (\footnote{...})
  clean = clean.replace(/\\footnote\{([^}]+)\}/g, (_, note) => {
    footnotes.push(note);
    const index = footnotes.length;
    return `<sup style="color:${isDark ? "#6b8cff" : "#1a56db"};font-weight:bold;cursor:pointer;">[${index}]</sup>`;
  });

  // 3. Ambientes Matemáticos em Bloco (extrai fórmulas antes de processar quebras \\ de texto)
  clean = clean.replace(
    /\\begin\{(equation|align|gather|multline|split)\*?\}([\s\S]*?)\\end\{\1\*?\}/g,
    (_, __, formula) => {
      const mathHtml = renderMathSafely(formula, true);
      return `\n\n<div class="math-display" style="display:flex;justify-content:center;margin:18px 0;padding:8px 0;overflow-x:auto;">${mathHtml}</div>\n\n`;
    }
  );

  clean = clean.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => {
    const mathHtml = renderMathSafely(formula, true);
    return `\n\n<div class="math-display" style="display:flex;justify-content:center;margin:18px 0;padding:8px 0;overflow-x:auto;">${mathHtml}</div>\n\n`;
  });

  clean = clean.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    const mathHtml = renderMathSafely(formula, true);
    return `\n\n<div class="math-display" style="display:flex;justify-content:center;margin:18px 0;padding:8px 0;overflow-x:auto;">${mathHtml}</div>\n\n`;
  });

  // 4. Tabelas LaTeX \begin{tabular}
  clean = clean.replace(/\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/g, (_, tabBody) => {
    const rows = tabBody
      .split("\\\\")
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0 && !r.startsWith("\\hline"));

    const tableRows = rows
      .map((row: string) => {
        const cells = row.split("&").map((c: string) => c.trim().replace(/\\hline/g, ""));
        const cellTags = cells
          .map(
            (c: string) =>
              `<td style="border:1px solid ${
                isDark ? "rgba(255,255,255,0.12)" : "#ccc"
              };padding:7px 12px;">${c}</td>`
          )
          .join("");
        return `<tr>${cellTags}</tr>`;
      })
      .join("");

    return `\n\n<table style="border-collapse:collapse;margin:18px auto;width:96%;">${tableRows}</table>\n\n`;
  });

  // 5. Fórmulas Inline: $...$ e \(...\)
  clean = clean.replace(/\$([^\$\n]+?)\$/g, (_, formula) => {
    return renderMathSafely(formula, false);
  });

  clean = clean.replace(/\\\((.+?)\\\)/g, (_, formula) => {
    return renderMathSafely(formula, false);
  });

  // 6. Sanitização de Espaçamentos TeX e Quebras de Linha (consome [1em], [0.5cm], etc.)
  clean = clean
    .replace(/\\\\(?:\s*\[[^\]]*\])?/g, "<br />") // Converte \\ ou \\[1em] ou \\[12pt] em <br /> sem deixar [1em]
    .replace(/\\(?:v|h)skip\s*([0-9.]+(?:em|ex|pt|cm|mm|in)?)?/gi, "<div style='height:12px;'></div>")
    .replace(/\\kern\s*([0-9.]+(?:em|ex|pt|cm|mm|in)?)?/gi, "&nbsp;")
    .replace(/\\vspace\*?(?:\{[^}]*\}|\[[^\]]*\])/gi, "<div style='height:12px;'></div>")
    .replace(/\\hspace\*?(?:\{[^}]*\}|\[[^\]]*\])/gi, "&nbsp;&nbsp;")
    .replace(/\\smallskip/gi, "<div style='height:6px;'></div>")
    .replace(/\\medskip/gi, "<div style='height:12px;'></div>")
    .replace(/\\bigskip/gi, "<div style='height:20px;'></div>")
    .replace(/\\noindent\s*/gi, "")
    .replace(/\\newline|\\par\b/gi, "<br /><br />")
    .replace(/\\newpage|\\clearpage/gi, `<hr style="margin:24px 0;border:0;border-top:1px dashed ${isDark ? '#333' : '#ccc'};" />`)
    .replace(/\[\s*[0-9.]+\s*(?:em|ex|pt|cm|mm|in)\s*\]/gi, ""); // Remove dimensões órfãs como [1em]

  // 7. Sanitização de Ambientes de Alinhamento e Caixas de Texto
  clean = clean
    .replace(/\\begin\{center\}/gi, `<div style="text-align:center;margin:14px 0;">`)
    .replace(/\\end\{center\}/gi, `</div>`)
    .replace(/\\begin\{flushleft\}/gi, `<div style="text-align:left;margin:8px 0;">`)
    .replace(/\\end\{flushleft\}/gi, `</div>`)
    .replace(/\\begin\{flushright\}/gi, `<div style="text-align:right;margin:8px 0;">`)
    .replace(/\\end\{flushright\}/gi, `</div>`)
    .replace(/\\begin\{abstract\}/gi, `<div style="margin:20px 24px;padding:12px 18px;background:${isDark ? 'rgba(255,255,255,0.03)' : '#fcfcfc'};border-left:3px solid ${isDark ? '#6b8cff' : '#1a56db'};font-size:12px;line-height:1.6;"><strong style="display:block;text-align:center;margin-bottom:6px;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;">Resumo / Abstract</strong>`)
    .replace(/\\end\{abstract\}/gi, `</div>`);

  // 8. Modificadores Tipográficos em Blocos Enquadrados com Chaves
  clean = clean
    .replace(/\{\s*\\(?:Large|LARGE)\s*\\bfseries\s+([\s\S]*?)\}/gi, "<strong style='font-size:18px;line-height:1.4;'>$1</strong>")
    .replace(/\{\s*\\bfseries\s*\\(?:Large|LARGE)\s+([\s\S]*?)\}/gi, "<strong style='font-size:18px;line-height:1.4;'>$1</strong>")
    .replace(/\{\s*\\large\s*\\bfseries\s+([\s\S]*?)\}/gi, "<strong style='font-size:16px;line-height:1.4;'>$1</strong>")
    .replace(/\{\s*\\bfseries\s*\\large\s+([\s\S]*?)\}/gi, "<strong style='font-size:16px;line-height:1.4;'>$1</strong>")
    .replace(/\{\s*\\bfseries\s+([\s\S]*?)\}/gi, "<strong>$1</strong>")
    .replace(/\{\s*\\itshape\s+([\s\S]*?)\}/gi, "<em>$1</em>")
    .replace(/\{\s*\\scshape\s+([\s\S]*?)\}/gi, "<span style='font-variant:small-caps;'>$1</span>")
    .replace(/\{\s*\\ttfamily\s+([\s\S]*?)\}/gi, "<code>$1</code>")
    .replace(/\{\s*\\small\s+([\s\S]*?)\}/gi, `<span style="font-size:11.5px;color:${isDark ? '#a0a0b8' : '#555'};">$1</span>`)
    .replace(/\{\s*\\footnotesize\s+([\s\S]*?)\}/gi, `<span style="font-size:10.5px;color:${isDark ? '#8888a0' : '#666'};">$1</span>`)
    .replace(/\{\s*\\centering\s+([\s\S]*?)\}/gi, "<div style='text-align:center;'>$1</div>");

  // Modificadores Tipográficos Livres (com limites de palavra \b para não truncar \bfseries)
  clean = clean
    .replace(/\\bfseries\b/gi, "<strong>")
    .replace(/\\mdseries\b/gi, "</strong>")
    .replace(/\\itshape\b/gi, "<em>")
    .replace(/\\upshape\b/gi, "</em>")
    .replace(/\\scshape\b/gi, "<span style='font-variant:small-caps;'>")
    .replace(/\\centering\b/gi, "<div style='text-align:center;'>")
    .replace(/\\raggedright\b/gi, "<div style='text-align:left;'>")
    .replace(/\\raggedleft\b/gi, "<div style='text-align:right;'>")
    .replace(/\\Large\b/gi, "<span style='font-size:17px;'>")
    .replace(/\\large\b/gi, "<span style='font-size:15px;'>")
    .replace(/\\small\b/gi, `<span style="font-size:11.5px;color:${isDark ? '#a0a0b8' : '#555'};">`)
    .replace(/\\footnotesize\b/gi, `<span style="font-size:10.5px;color:${isDark ? '#8888a0' : '#666'};">`)
    .replace(/\\tiny\b/gi, "<span style='font-size:9.5px;'>")
    .replace(/\\bf\b\s*/gi, "<strong>")
    .replace(/\\it\b\s*/gi, "<em>");

  // 9. Títulos, Autores e Seções Acadêmicas
  clean = clean.replace(
    /\\title\{([^}]+)\}/g,
    `\n\n<h1 style="font-size:20px;font-weight:bold;text-align:center;margin:24px 0 14px 0;line-height:1.3;color:${
      isDark ? "#ffffff" : "#111111"
    };">$1</h1>\n\n`
  );

  clean = clean.replace(
    /\\author\{([^}]+)\}/g,
    `\n\n<div style="text-align:center;font-size:13px;font-weight:600;margin:6px 0 2px 0;color:${isDark ? '#e0e0ec' : '#333333'};">$1</div>\n\n`
  );

  clean = clean.replace(
    /\\date\{([^}]+)\}/g,
    `\n\n<div style="text-align:center;font-size:11px;color:${isDark ? '#8888a0' : '#666666'};margin-bottom:18px;">$1</div>\n\n`
  );

  clean = clean.replace(
    /\\section\*?\{([^}]+)\}/g,
    `\n\n<h2 style="font-size:14.5px;font-weight:bold;margin:24px 0 10px 0;border-bottom:1px solid ${
      isDark ? "rgba(255,255,255,0.1)" : "#ddd"
    };padding-bottom:5px;color:${isDark ? "#6b8cff" : "#111111"};">$1</h2>\n\n`
  );

  clean = clean.replace(
    /\\subsection\*?\{([^}]+)\}/g,
    `\n\n<h3 style="font-size:13px;font-weight:bold;margin:18px 0 8px 0;color:${
      isDark ? "#e8e8f0" : "#222222"
    };">$1</h3>\n\n`
  );

  clean = clean.replace(
    /\\subsubsection\*?\{([^}]+)\}/g,
    `\n\n<h4 style="font-size:12px;font-weight:bold;margin:14px 0 6px 0;color:${
      isDark ? "#c8c8d8" : "#333333"
    };">$1</h4>\n\n`
  );

  // 10. Caracteres, Acentuação e Símbolos Especiais em LaTeX
  clean = clean
    .replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>")
    .replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\emph\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>")
    .replace(/\\textsc\{([^}]+)\}/g, "<span style='font-variant:small-caps;'>$1</span>")
    .replace(/\\texttt\{([^}]+)\}/g, "<code>$1</code>")
    .replace(/\\cite\{([^}]+)\}/g, `<span style="color:${isDark ? "#6b8cff" : "#1a56db"};font-size:11px;">[$1]</span>`)
    .replace(/\\ref\{([^}]+)\}/g, `<span style="color:${isDark ? "#6b8cff" : "#1a56db"};font-weight:500;">$1</span>`)
    .replace(/\\label\{([^}]+)\}/g, "")
    // Acentos LaTeX
    .replace(/\\~\{?a\}?/g, "ã").replace(/\\~\{?A\}?/g, "Ã")
    .replace(/\\~\{?o\}?/g, "õ").replace(/\\~\{?O\}?/g, "Õ")
    .replace(/\\~\{?n\}?/g, "ñ").replace(/\\~\{?N\}?/g, "Ñ")
    .replace(/\\\'\{?a\}?/g, "á").replace(/\\\'\{?e\}?/g, "é").replace(/\\\'\{?i\}?/g, "í").replace(/\\\'\{?o\}?/g, "ó").replace(/\\\'\{?u\}?/g, "ú")
    .replace(/\\\'\{?A\}?/g, "Á").replace(/\\\'\{?E\}?/g, "É").replace(/\\\'\{?I\}?/g, "Í").replace(/\\\'\{?O\}?/g, "Ó").replace(/\\\'\{?U\}?/g, "Ú")
    .replace(/\\\`\{?a\}?/g, "à").replace(/\\\`\{?A\}?/g, "À")
    .replace(/\\\^\{?a\}?/g, "â").replace(/\\\^\{?e\}?/g, "ê").replace(/\\\^\{?o\}?/g, "ô")
    .replace(/\\\^\{?A\}?/g, "Â").replace(/\\\^\{?E\}?/g, "Ê").replace(/\\\^\{?O\}?/g, "Ô")
    .replace(/\\\"a/g, "ä").replace(/\\\"o/g, "ö").replace(/\\\"u/g, "ü")
    .replace(/\\\"A/g, "Ä").replace(/\\\"O/g, "Ö").replace(/\\\"U/g, "Ü")
    .replace(/\\ss\b/g, "ß")
    // Tios isolados do LaTeX (espaço insecável) convertidos em &nbsp;
    .replace(/~/g, "&nbsp;")
    .replace(/\\%/g, "%")
    .replace(/\\&/g, "&")
    .replace(/\\S\s*([0-9]+)/g, "§ $1")
    .replace(/\\S/g, "§")
    .replace(/\\dots/g, "...")
    .replace(/---/g, "—").replace(/--/g, "–")
    .replace(/``/g, "“").replace(/''/g, "”");

  // 11. Limpeza de Chaves e Contrabarras Estruturais Órfãs (Desempacota {texto} usado para escopo)
  for (let iter = 0; iter < 4; iter++) {
    const beforeUnpack = clean;
    clean = clean.replace(/(^|[^\\<a-zA-Z0-9])\{([^{}]+)\}/g, "$1$2");
    if (clean === beforeUnpack) break;
  }
  // Remove quaisquer chaves órfãs residuais que não foram escapadas
  clean = clean.replace(/(^|[^\\])[\{\}]/g, "$1");

  // Restaura chaves que foram intencionalmente escapadas (\{ e \})
  clean = clean.replace(/___LBRACE___/g, "{").replace(/___RBRACE___/g, "}");

  // Limpeza de contrabarras órfãs residuais soltas no texto
  clean = clean.replace(/\\(?=[^a-zA-Z0-9<>&_])/g, "");

  // 12. Listas (itemize / enumerate)
  clean = clean.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
    const listItems = items
      .split("\\item")
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 0)
      .map((i: string) => `<li style="margin-bottom:6px;">${i}</li>`)
      .join("");
    return `\n\n<ul style="margin:12px 0 16px 28px;list-style-type:disc;">${listItems}</ul>\n\n`;
  });

  clean = clean.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
    const listItems = items
      .split("\\item")
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 0)
      .map((i: string) => `<li style="margin-bottom:6px;">${i}</li>`)
      .join("");
    return `\n\n<ol style="margin:12px 0 16px 28px;list-style-type:decimal;">${listItems}</ol>\n\n`;
  });

  // 13. Parágrafos Estruturados
  const blocks = clean.split(/\n\s*\n/);
  const htmlBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (
      trimmed.startsWith("<h1") ||
      trimmed.startsWith("<h2") ||
      trimmed.startsWith("<h3") ||
      trimmed.startsWith("<h4") ||
      trimmed.startsWith("<div") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<ol") ||
      trimmed.startsWith("<table") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<hr")
    ) {
      return trimmed;
    }
    return `<p style="margin-bottom:14px;text-align:justify;text-indent:1.8em;">${trimmed}</p>`;
  });

  let outputHtml = htmlBlocks.join("\n");

  // 13. Renderiza Notas de Rodapé no Fim da Página
  if (footnotes.length > 0) {
    const notesList = footnotes
      .map(
        (fn, idx) =>
          `<div style="margin-bottom:4px;"><sup style="color:${
            isDark ? "#6b8cff" : "#1a56db"
          };font-weight:bold;">[${idx + 1}]</sup> ${fn}</div>`
      )
      .join("");

    outputHtml += `
      <div style="margin-top:40px;padding-top:12px;border-top:1px solid ${
        isDark ? "rgba(255,255,255,0.12)" : "#bbb"
      };font-size:11px;color:${isDark ? "#a0a0b8" : "#555"};">
        ${notesList}
      </div>
    `;
  }

  return outputHtml;
}
