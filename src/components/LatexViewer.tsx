import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import katex from "katex";

interface LatexViewerProps {
  latexCode: string;
  langTitle: string;
  isAccent?: boolean;
}

/**
 * Renderizador Completo de Documentos e Fórmulas LaTeX com KaTeX e Tipografia Científica
 */
export default function LatexViewer({
  latexCode,
  langTitle,
  isAccent = false,
}: LatexViewerProps) {
  const [viewMode, setViewMode] = useState<"rendered" | "code">("rendered");
  const [copied, setCopied] = useState(false);

  // Copiar código para a área de transferência
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(latexCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download do arquivo .tex
  const handleDownloadTex = () => {
    if (typeof document !== "undefined") {
      const blob = new Blob([latexCode], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documento_traduzido.tex`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Impressão / Exportação em PDF
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
            @page { margin: 2cm; size: A4; }
            body {
              font-family: 'Latin Modern Roman', 'Times New Roman', Times, serif;
              padding: 20px 40px;
              color: #111;
              line-height: 1.6;
              font-size: 11pt;
              max-width: 820px;
              margin: 0 auto;
              background: #fff;
            }
            h1 { font-size: 17pt; text-align: center; margin: 24px 0 16px 0; font-weight: bold; }
            h2 { font-size: 13pt; margin: 20px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            h3 { font-size: 11.5pt; margin: 16px 0 8px 0; font-weight: bold; color: #222; }
            p { text-align: justify; margin-bottom: 12px; text-indent: 1.5em; }
            p:first-of-type { text-indent: 0; }
            .math-display { text-align: center; margin: 18px 0; overflow-x: auto; padding: 6px 0; }
            ul, ol { margin: 10px 0 14px 24px; padding: 0; }
            li { margin-bottom: 6px; }
            table { border-collapse: collapse; margin: 16px auto; width: 90%; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            .katex { font-size: 1.05em; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${convertFullLatexToHtml(latexCode, false)}
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

  // Converte o LaTeX para HTML formatado com KaTeX para visualização em tela escura
  const renderedHtml = useMemo(() => {
    return convertFullLatexToHtml(latexCode, true);
  }, [latexCode]);

  return (
    <View className="flex-1 flex-col h-full overflow-hidden">
      {/* Barra Superior com wrap responsivo sem transbordar */}
      <View className="flex-row flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.07] flex-shrink-0">
        {/* Título do Documento com truncate */}
        <View className="flex-row items-center flex-1 min-w-[140px]">
          <Feather
            name="file-text"
            size={12}
            color={isAccent ? "#6b8cff" : "#6b6b80"}
          />
          <Text
            className={`text-[10px] font-medium uppercase tracking-wider ml-1.5 truncate ${
              isAccent ? "text-[#6b8cff]" : "text-[#6b6b80]"
            }`}
            numberOfLines={1}
          >
            {langTitle}
          </Text>
        </View>

        {/* Ações Compactas com micro-animações */}
        <View className="flex-row items-center gap-1.5 flex-shrink-0">
          {/* Alternar Visualização */}
          <View className="flex-row bg-white/[0.05] rounded-lg p-0.5 border border-white/[0.06] transition-all duration-200">
            <TouchableOpacity
              className={`px-2.5 py-1 rounded-md active:scale-95 transition-all duration-200 ${
                viewMode === "rendered" ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30" : "bg-transparent hover:bg-white/[0.04]"
              }`}
              onPress={() => setViewMode("rendered")}
            >
              <Text
                className={`text-[9px] font-medium ${
                  viewMode === "rendered" ? "text-white" : "text-[#6b6b80]"
                }`}
              >
                Formatado
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-2.5 py-1 rounded-md active:scale-95 transition-all duration-200 ${
                viewMode === "code" ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30" : "bg-transparent hover:bg-white/[0.04]"
              }`}
              onPress={() => setViewMode("code")}
            >
              <Text
                className={`text-[9px] font-medium ${
                  viewMode === "code" ? "text-white" : "text-[#6b6b80]"
                }`}
              >
                .tex
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botão Copiar */}
          <TouchableOpacity
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] active:scale-90 transition-all duration-150"
            onPress={handleCopy}
            title="Copiar Código"
          >
            <Feather
              name={copied ? "check" : "copy"}
              size={11}
              color={copied ? "#4ade80" : "#a0a0b8"}
            />
          </TouchableOpacity>

          {/* Botão Baixar .tex */}
          <TouchableOpacity
            className="flex-row items-center px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] active:scale-90 transition-all duration-150"
            onPress={handleDownloadTex}
          >
            <Feather name="download" size={10} color="#a0a0b8" />
            <Text className="text-[#a0a0b8] text-[9px] font-medium ml-1">.tex</Text>
          </TouchableOpacity>

          {/* Botão PDF / Imprimir */}
          <TouchableOpacity
            className="flex-row items-center px-2 py-1.5 rounded-lg bg-[#6b8cff]/15 border border-[#6b8cff]/30 hover:bg-[#6b8cff]/25 active:scale-90 transition-all duration-150"
            onPress={handlePrintPDF}
          >
            <Feather name="printer" size={10} color="#6b8cff" />
            <Text className="text-[#6b8cff] text-[9px] font-medium ml-1">PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo Renderizado com KaTeX ou Código Fonte */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {viewMode === "rendered" ? (
          Platform.OS === "web" ? (
            <div
              className="latex-rendered-document animate-smooth-fade"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#d0d0e0",
                lineHeight: "1.75",
                fontSize: "13px",
                padding: "4px 8px 30px 4px",
              }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <View className="p-3">
              <Text className="text-[#d0d0e0] font-mono text-xs">{latexCode}</Text>
            </View>
          )
        ) : (
          <View className="bg-[#0c0c12] p-4 rounded-xl border border-white/[0.07] animate-smooth-fade">
            <Text className="text-[#c8c8d8] font-mono text-xs leading-relaxed select-text">
              {latexCode}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Converte código LaTeX completo para HTML com KaTeX renderizando fórmulas inline ($...$) e display blocks ($$...$$)
 */
function convertFullLatexToHtml(latex: string, isDarkTheme: boolean): string {
  if (!latex) return "<p class='text-[#6b6b80] italic'>Nenhum conteúdo para exibir.</p>";

  // Remove preâmbulo puramente técnico do LaTeX para visualização limpa
  let clean = latex
    .replace(/\\documentclass(\[[^\]]*\])?\{[^}]+\}/g, "")
    .replace(/\\usepackage(\[[^\]]*\])?\{[^}]+\}/g, "")
    .replace(/\\begin\{document\}/g, "")
    .replace(/\\end\{document\}/g, "")
    .replace(/\\maketitle/g, "");

  // 1. Proteger e renderizar Equações em Bloco (Display Math)
  clean = clean.replace(
    /\\begin\{(equation|align|gather|multline)\*?\}([\s\S]*?)\\end\{\1\*?\}/g,
    (_, __, formula) => {
      try {
        const mathHtml = katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
        return isDarkTheme
          ? `<div style="display:flex;justify-content:center;margin:18px 0;padding:12px;background:#0c0c12;border-radius:12px;border:1px solid rgba(107,140,255,0.25);overflow-x:auto;">${mathHtml}</div>`
          : `<div class="math-display">${mathHtml}</div>`;
      } catch {
        return `<div class="math-display">$$${formula}$$</div>`;
      }
    }
  );

  clean = clean.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => {
    try {
      const mathHtml = katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
      return isDarkTheme
        ? `<div style="display:flex;justify-content:center;margin:18px 0;padding:12px;background:#0c0c12;border-radius:12px;border:1px solid rgba(107,140,255,0.25);overflow-x:auto;">${mathHtml}</div>`
        : `<div class="math-display">${mathHtml}</div>`;
    } catch {
      return `<div class="math-display">$$${formula}$$</div>`;
    }
  });

  clean = clean.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      const mathHtml = katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
      return isDarkTheme
        ? `<div style="display:flex;justify-content:center;margin:18px 0;padding:12px;background:#0c0c12;border-radius:12px;border:1px solid rgba(107,140,255,0.25);overflow-x:auto;">${mathHtml}</div>`
        : `<div class="math-display">${mathHtml}</div>`;
    } catch {
      return `<div class="math-display">$$${formula}$$</div>`;
    }
  });

  // 2. Proteger e renderizar Fórmulas Inline ($...$ e \(...\))
  clean = clean.replace(/\$([^\$\n]+?)\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>$${formula}$</code>`;
    }
  });

  clean = clean.replace(/\\\((.+?)\\\)/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>$${formula}$</code>`;
    }
  });

  // 3. Estruturas de Títulos e Seções
  clean = clean.replace(/\\title\{([^}]+)\}/g, isDarkTheme
    ? '<h1 style="color:#ffffff;font-size:18px;font-weight:700;text-align:center;margin:20px 0 16px 0;">$1</h1>'
    : '<h1>$1</h1>');

  clean = clean.replace(/\\section\*?\{([^}]+)\}/g, isDarkTheme
    ? '<h2 style="color:#6b8cff;font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin:22px 0 10px 0;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.08);">$1</h2>'
    : '<h2>$1</h2>');

  clean = clean.replace(/\\subsection\*?\{([^}]+)\}/g, isDarkTheme
    ? '<h3 style="color:#e8e8f0;font-size:13px;font-weight:600;margin:16px 0 8px 0;">$1</h3>'
    : '<h3>$1</h3>');

  clean = clean.replace(/\\subsubsection\*?\{([^}]+)\}/g, isDarkTheme
    ? '<h4 style="color:#c8c8d8;font-size:12px;font-weight:600;margin:12px 0 6px 0;">$1</h4>'
    : '<h4>$1</h4>');

  // 4. Formatações de Texto Inline
  clean = clean
    .replace(/\\textbf\{([^}]+)\}/g, "<strong style='color:#ffffff;'>$1</strong>")
    .replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\emph\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>")
    .replace(/\\cite\{([^}]+)\}/g, "<span style='color:#6b8cff;font-size:11px;'>[$1]</span>")
    .replace(/\\ref\{([^}]+)\}/g, "<span style='color:#6b8cff;'>$1</span>")
    .replace(/\\label\{([^}]+)\}/g, "")
    .replace(/\\%/g, "%")
    .replace(/\\&/g, "&");

  // 5. Listas (itemize / enumerate)
  clean = clean.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
    const listItems = items
      .split("\\item")
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 0)
      .map((i: string) => `<li style="margin-bottom:6px;">${i}</li>`)
      .join("");
    return `<ul style="margin:12px 0 16px 20px;list-style-type:disc;">${listItems}</ul>`;
  });

  clean = clean.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
    const listItems = items
      .split("\\item")
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 0)
      .map((i: string) => `<li style="margin-bottom:6px;">${i}</li>`)
      .join("");
    return `<ol style="margin:12px 0 16px 20px;list-style-type:decimal;">${listItems}</ol>`;
  });

  // 6. Parágrafos estruturados
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
      trimmed.startsWith("<table")
    ) {
      return trimmed;
    }
    return `<p style="margin-bottom:14px;text-align:justify;color:${isDarkTheme ? "#c8c8d8" : "#222"};">${trimmed}</p>`;
  });

  return htmlBlocks.join("\n");
}
