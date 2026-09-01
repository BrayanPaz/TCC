// Controller para comunicação com o Google Gemini API com Auto-Retry e Fallback de Modelos

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
];

interface TranslateOptions {
  text: string;
  sourceLang?: string;
  targetLang?: string;
  glossary?: Array<{ original: string; translation: string }>;
  customInstruction?: string;
}

interface TranslateDocumentOptions {
  fileBase64: string;
  mimeType: string;
  fileName: string;
  sourceLang?: string;
  targetLang?: string;
  glossary?: Array<{ original: string; translation: string }>;
  customInstruction?: string;
}

/**
 * Utilitário com auto-retry e fallback em cascata
 */
async function callGeminiResilient(
  parts: any[],
  temperature: number = 0.2
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Chave da API do Gemini não configurada no .env");
  }

  let lastError = "";

  for (const model of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature,
                topP: 0.95,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          if (text) return text;
        }

        const errData = await response.json().catch(() => ({}));
        const msg = errData.error?.message || `HTTP ${response.status}`;
        lastError = msg;

        if (
          response.status === 503 ||
          response.status === 429 ||
          msg.includes("high demand") ||
          msg.includes("Quota")
        ) {
          await new Promise((res) => setTimeout(res, 1200 * attempt));
          continue;
        } else {
          break;
        }
      } catch (e: any) {
        lastError = e.message || "Erro de rede com o Gemini";
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }

  throw new Error(`Serviço temporariamente ocupado: ${lastError}`);
}

/**
 * Traduz um texto ou bloco LaTeX preservando a sintaxe e aplicando o glossário
 */
export async function translateTextWithAI({
  text,
  sourceLang = "en",
  targetLang = "pt-BR",
  glossary = [],
  customInstruction = ""
}: TranslateOptions): Promise<{ result: string; error: string | null }> {
  try {
    let glossaryPrompt = "";
    if (glossary.length > 0) {
      glossaryPrompt = `\n\nGLOSSÁRIO OBRIGATÓRIO:\n` +
        glossary.map(g => `- "${g.original}" => "${g.translation}"`).join("\n");
    }

    const systemPrompt = `Você é um tradutor acadêmico e técnico especializado em LaTeX e documentos formais.
Regras fundamentais:
1. Traduza o texto do idioma ${sourceLang} para ${targetLang}.
2. PRESERVE estritamente todas as tags, comandos, ambientes e fórmulas em LaTeX (ex: \\section{}, \\textbf{}, $f(x)=y$, \\begin{equation}, etc.).
3. Aplique o glossário rigorosamente.${glossaryPrompt}
${customInstruction ? `Instrução adicional: ${customInstruction}` : ""}

Texto a ser traduzido:
"""
${text}
"""

Retorne APENAS o texto traduzido, sem introduções.`;

    const translated = await callGeminiResilient([{ text: systemPrompt }]);
    return { result: stripMarkdownFences(translated), error: null };
  } catch (err: any) {
    return { result: "", error: err.message || "Falha na conexão com a IA" };
  }
}

/**
 * Lê diretamente um arquivo (PDF, Imagem, Documento) via IA Multimodal
 */
export async function translateDocumentWithAI({
  fileBase64,
  mimeType,
  fileName,
  sourceLang = "en",
  targetLang = "pt-BR",
  glossary = [],
  customInstruction = "",
}: TranslateDocumentOptions): Promise<{ result: string; error: string | null }> {
  try {
    let glossaryPrompt = "";
    if (glossary.length > 0) {
      glossaryPrompt = `\n\nGLOSSÁRIO OBRIGATÓRIO:\n` +
        glossary.map((g) => `- "${g.original}" => "${g.translation}"`).join("\n");
    }

    const prompt = `Você é um agente especialista em engenharia de documentos científicos, tipografia avançada e tradução acadêmica em LaTeX.
INSTRUÇÕES:
1. Analise o documento em anexo ("${fileName}").
2. Reconstrua todo o documento em CÓDIGO LATEX puro, estruturado e compilável (\\section, \\subsection, \\begin{equation}, tabelas).
3. Traduza todo o conteúdo textual de ${sourceLang} para ${targetLang}.
4. PRESERVE estritamente toda a notação matemática e fórmulas.
5. GLOSSÁRIO:${glossaryPrompt}
${customInstruction ? `Instruções adicionais: ${customInstruction}` : ""}

Retorne o documento LaTeX completo e pronto.`;

    const parts = [
      {
        inline_data: {
          mime_type: mimeType,
          data: fileBase64,
        },
      },
      { text: prompt },
    ];

    const translated = await callGeminiResilient(parts);
    return { result: stripMarkdownFences(translated), error: null };
  } catch (err: any) {
    return { result: "", error: err.message || "Falha na comunicação multimodal com a IA" };
  }
}

/**
 * Envia uma mensagem para o Copiloto Agêntico no chat lateral
 */
export async function sendCopilotMessage(
  history: Array<{ role: "user" | "model"; text: string }>,
  currentDocContext: { original: string; translated: string },
  userMessage: string
): Promise<{ reply: string; error: string | null }> {
  try {
    const contextHeader = `Você é um Copiloto Agêntico de Tradução Interativa integrado a um editor de documentos técnicos e LaTeX.
Contexto do Documento:
[ORIGINAL]: ${currentDocContext.original.substring(0, 1500)}
[TRADUZIDO ATUALMENTE]: ${currentDocContext.translated.substring(0, 1500)}

Auxilie o usuário com esclarecimentos, sugestões de tradução de termos específicos e ajustes de tom formal. Seja direto e prestativo.`;

    const contentsParts = [
      { text: `${contextHeader}\n\nHistórico:\n${history.map(h => `${h.role}: ${h.text}`).join('\n')}\n\nUsuário: ${userMessage}` }
    ];

    const reply = await callGeminiResilient(contentsParts, 0.4);
    return { reply, error: null };
  } catch (err: any) {
    return { reply: "", error: err.message || "Erro ao consultar copiloto" };
  }
}

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```latex")) {
    cleaned = cleaned.replace(/^```latex\n?/, "").replace(/\n?```$/, "");
  } else if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned.trim();
}
