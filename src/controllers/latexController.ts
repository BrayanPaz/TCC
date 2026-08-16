// Controller para manipulação e segmentação de documentos LaTeX (.tex) e textos puros

export interface DocumentSection {
  id: string;
  originalText: string;
  translatedText: string;
  isMathOrCommand: boolean;
  type: "title" | "section" | "paragraph" | "equation";
}

/**
 * Segmenta um documento LaTeX em blocos lógicos preservando comandos estruturais
 */
export function parseLatexDocument(rawContent: string): DocumentSection[] {
  const lines = rawContent.split(/\n\s*\n/); // Divide por parágrafos/blocos
  const sections: DocumentSection[] = [];

  lines.forEach((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    let type: DocumentSection["type"] = "paragraph";
    let isMath = false;

    if (trimmed.startsWith("\\title") || trimmed.startsWith("\\chapter")) {
      type = "title";
    } else if (trimmed.startsWith("\\section") || trimmed.startsWith("\\subsection")) {
      type = "section";
    } else if (trimmed.startsWith("\\[") || trimmed.startsWith("\\begin{equation}") || trimmed.startsWith("$$")) {
      type = "equation";
      isMath = true;
    }

    sections.push({
      id: `sec-${index}-${Date.now()}`,
      originalText: trimmed,
      translatedText: "",
      isMathOrCommand: isMath,
      type,
    });
  });

  return sections;
}

/**
 * Reconstrói o documento final juntando as seções traduzidas
 */
export function reconstructDocument(sections: DocumentSection[]): string {
  return sections
    .map((sec) => (sec.translatedText ? sec.translatedText : sec.originalText))
    .join("\n\n");
}
