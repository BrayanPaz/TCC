import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import katex from "katex";

interface LatexViewerProps {
  latexCode: string;
  langTitle: string;
  isAccent?: boolean;
}

/**
 * Renderizador de fórmulas e documentos LaTeX com KaTeX real, transições fluidas e layout responsivo
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

  // Impressão / Salvar como PDF
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
            body {
              font-family: 'Times New Roman', Times, serif;
              padding: 40px 60px;
              color: #111;
              line-height: 1.6;
              font-size: 12pt;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 18pt; text-align: center; margin-bottom: 20px; }
            h2 { font-size: 14pt; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            h3 { font-size: 12pt; margin-top: 20px; font-weight: bold; }
            p { text-align: justify; margin-bottom: 14px; text-indent: 1.5em; }
            .math-block { text-align: center; margin: 20px 0; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${convertLatexToHtmlWithKatex(latexCode)}
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 700);
    }
  };

  // Renderiza uma equação matemática com KaTeX real
  const renderMathFormula = (rawFormula: string, isBlock: boolean = false, key: string = "math") => {
    try {
      const cleanFormula = rawFormula
        .replace(/\\begin\{equation\}|\\end\{equation\}|\\\[|\\\]|\$\$/g, "")
        .trim();

      const html = katex.renderToString(cleanFormula, {
        displayMode: isBlock,
        throwOnError: false,
      });

      if (Platform.OS === "web") {
        return (
          <div
            key={key}
            className="animate-smooth-fade"
            style={{
              display: isBlock ? "flex" : "inline-block",
              justifyContent: isBlock ? "center" : "initial",
              margin: isBlock ? "16px 0" : "0 4px",
              padding: isBlock ? "14px 18px" : "0",
              background: isBlock ? "#0c0c12" : "transparent",
              borderRadius: isBlock ? "12px" : "0",
              border: isBlock ? "1px solid rgba(107, 140, 255, 0.2)" : "none",
              color: "#e8e8f0",
              overflowX: "auto",
              transition: "all 0.25s ease",
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    } catch (e) {
      console.warn("KaTeX render error:", e);
    }

    return (
      <View key={key} className="bg-[#0c0c12] p-3 rounded-xl border border-[#6b8cff]/20 my-2 animate-smooth-fade">
        <Text className="text-[#6b8cff] font-mono text-xs">{rawFormula}</Text>
      </View>
    );
  };

  // Renderiza o documento estruturado com KaTeX
  const renderFormattedContent = () => {
    const lines = latexCode.split("\n");
    const elements: React.ReactNode[] = [];
    let paragraphBuffer: string[] = [];

    const flushParagraph = (keyPrefix: string) => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(" ");
        elements.push(
          <Text key={`${keyPrefix}-${elements.length}`} className="text-[#c8c8d8] text-xs leading-relaxed mb-3 text-justify animate-smooth-fade">
            {cleanLatexInline(text)}
          </Text>
        );
        paragraphBuffer = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph(`p-${index}`);
        return;
      }

      // Título principal
      if (trimmed.startsWith("\\title{") || trimmed.startsWith("\\chapter{")) {
        flushParagraph(`title-${index}`);
        const titleMatch = trimmed.match(/\\(?:title|chapter)\{([^}]+)\}/);
        elements.push(
          <Text key={`title-${index}`} className="text-[#e8e8f0] text-base font-bold mb-4 text-center animate-smooth-fade">
            {titleMatch ? titleMatch[1] : trimmed}
          </Text>
        );
      }
      // Seção
      else if (trimmed.startsWith("\\section{") || trimmed.startsWith("\\section*{")) {
        flushParagraph(`sec-${index}`);
        const secMatch = trimmed.match(/\\section\*?\{([^}]+)\}/);
        elements.push(
          <View key={`sec-${index}`} className="mt-4 mb-2 pb-1 border-b border-white/[0.07] animate-smooth-fade">
            <Text className="text-[#e8e8f0] text-xs font-bold uppercase tracking-wider">
              {secMatch ? secMatch[1] : trimmed}
            </Text>
          </View>
        );
      }
      // Subseção
      else if (trimmed.startsWith("\\subsection{")) {
        flushParagraph(`subsec-${index}`);
        const subMatch = trimmed.match(/\\subsection\{([^}]+)\}/);
        elements.push(
          <Text key={`subsec-${index}`} className="text-[#6b8cff] text-xs font-semibold mt-3 mb-1.5 animate-smooth-fade">
            {subMatch ? subMatch[1] : trimmed}
          </Text>
        );
      }
      // Bloco de Equação Matemática
      else if (
        trimmed.startsWith("\\[") ||
        trimmed.startsWith("\\begin{equation}") ||
        trimmed.startsWith("$$")
      ) {
        flushParagraph(`eq-${index}`);
        elements.push(renderMathFormula(trimmed, true, `math-block-${index}`));
      }
      // Linhas normais
      else {
        if (
          !trimmed.startsWith("\\documentclass") &&
          !trimmed.startsWith("\\usepackage") &&
          !trimmed.startsWith("\\begin{document}") &&
          !trimmed.startsWith("\\end{document}")
        ) {
          paragraphBuffer.push(trimmed);
        }
      }
    });

    flushParagraph("final");
    return elements;
  };

  return (
    <View className="flex-1 flex-col h-full overflow-hidden">
      {/* Barra Superior com wrap responsivo sem transbordar */}
      <View className="flex-row flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.07]">
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
              className={`px-2 py-1 rounded-md active:scale-95 transition-all duration-200 ${
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
              className={`px-2 py-1 rounded-md active:scale-95 transition-all duration-200 ${
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

      {/* Conteúdo Renderizado ou Código Fonte */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {viewMode === "rendered" ? (
          <View className="px-1 py-1 animate-smooth-fade">{renderFormattedContent()}</View>
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

function cleanLatexInline(text: string): string {
  return text
    .replace(/\\textbf\{([^}]+)\}/g, "$1")
    .replace(/\\textit\{([^}]+)\}/g, "$1")
    .replace(/\\emph\{([^}]+)\}/g, "$1")
    .replace(/\\cite\{([^}]+)\}/g, "[$1]")
    .replace(/\\ref\{([^}]+)\}/g, "$1")
    .replace(/\\label\{([^}]+)\}/g, "")
    .replace(/\\%/g, "%")
    .replace(/\\&/g, "&");
}

function convertLatexToHtmlWithKatex(latex: string): string {
  let html = latex
    .replace(/\\title\{([^}]+)\}/g, "<h1>$1</h1>")
    .replace(/\\chapter\{([^}]+)\}/g, "<h1>$1</h1>")
    .replace(/\\section\*?\{([^}]+)\}/g, "<h2>$1</h2>")
    .replace(/\\subsection\*?\{([^}]+)\}/g, "<h3>$1</h3>")
    .replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>")
    .replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>");

  html = html.replace(
    /\\(?:begin\{equation\}|\[)([\s\S]*?)\\(?:end\{equation\}|\])/g,
    (_, formula) => {
      try {
        return `<div class="math-block">${katex.renderToString(formula.trim(), { displayMode: true })}</div>`;
      } catch (e) {
        return `<div class="math-block">$$${formula}$$</div>`;
      }
    }
  );

  const lines = html.split("\n\n");
  return lines
    .map((l) => {
      const trimmed = l.trim();
      if (
        trimmed.startsWith("<h1") ||
        trimmed.startsWith("<h2") ||
        trimmed.startsWith("<h3") ||
        trimmed.startsWith("<div")
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");
}
