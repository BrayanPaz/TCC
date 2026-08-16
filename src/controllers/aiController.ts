// Controller para comunicação com o Google Gemini API (Texto & Documentos Multimodais)

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Modelo oficial ativo e suportado para geração de conteúdo
const MODEL_NAME = "gemini-2.5-flash"; 

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
    if (!GEMINI_API_KEY) {
      return { result: "", error: "Chave da API do Gemini não configurada no .env" };
    }

    let glossaryPrompt = "";
    if (glossary.length > 0) {
      glossaryPrompt = `\n\nGLOSSÁRIO OBRIGATÓRIO (Use estritamente estas traduções para estes termos específicos):\n` +
        glossary.map(g => `- "${g.original}" => "${g.translation}"`).join("\n");
    }

    const systemPrompt = `Você é um tradutor acadêmico e técnico especializado em LaTeX e documentos formais.
Regras fundamentais:
1. Traduza o texto do idioma ${sourceLang} para ${targetLang}.
2. PRESERVE estritamente todas as tags, comandos, ambientes e fórmulas em LaTeX (ex: \\section{}, \\textbf{}, $f(x)=y$, \\begin{equation}, etc.). Não altere nomes de comandos ou variáveis matemáticas.
3. Se houver termos do glossário abaixo, utilize-os exatamente como especificado.
4. Mantenha a pontuação e quebras de linha coerentes com o original.${glossaryPrompt}
${customInstruction ? `Instrução adicional do usuário: ${customInstruction}` : ""}

Texto a ser traduzido:
"""
${text}
"""

Retorne APENAS o texto traduzido, sem introduções ou explicações.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      return { result: "", error: errData.error?.message || "Erro na resposta do Gemini" };
    }

    const data = await response.json();
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return { result: translated, error: null };
  } catch (err: any) {
    return { result: "", error: err.message || "Falha na conexão com a IA" };
  }
}

/**
 * Lê diretamente um arquivo (PDF, Imagem, Documento) via IA Multimodal,
 * reconstrói toda a sua diagramação em código LaTeX compilável e traduz o conteúdo textual.
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
    if (!GEMINI_API_KEY) {
      return { result: "", error: "Chave da API do Gemini não configurada no .env" };
    }

    let glossaryPrompt = "";
    if (glossary.length > 0) {
      glossaryPrompt = `\n\nGLOSSÁRIO OBRIGATÓRIO (Aplique rigorosamente as seguintes traduções para termos técnicos):\n` +
        glossary.map((g) => `- "${g.original}" => "${g.translation}"`).join("\n");
    }

    const prompt = `Você é um agente especialista em engenharia de documentos científicos, tipografia avançada e tradução acadêmica em LaTeX.

INSTRUÇÕES DE EXECUÇÃO:
1. Analise o documento em anexo ("${fileName}"). Identifique todo o layout visual, hierarquia de seções, equações matemáticas (inline e em display block), matrizes, tabelas e citações.
2. Reconstrua todo o documento do zero gerando CÓDIGO LATEX puro, estruturado e compilável (utilizando ambientes como \\section, \\subsection, \\begin{equation}, \\begin{tabular}, etc.).
3. Traduza todo o conteúdo textual do idioma de origem (${sourceLang}) para o idioma de destino (${targetLang}).
4. PRESERVAÇÃO MATEMÁTICA: Mantenha todos os símbolos matemáticos, nomes de variáveis, constantes, expoentes e formulações em LaTeX estritamente idênticos ao original.
5. GLOSSÁRIO: Respeite estritamente as entradas do glossário abaixo:${glossaryPrompt}
${customInstruction ? `Instruções adicionais fornecidas pelo usuário: ${customInstruction}` : ""}

Retorne o documento LaTeX completo e pronto. Não adicione introduções conversacionais fora do código.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: fileBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      return { result: "", error: errData.error?.message || "Erro ao processar documento com o Gemini" };
    }

    const data = await response.json();
    let translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Remove markdown code fences if Gemini wraps with ```latex ... ```
    if (translated.startsWith("```latex")) {
      translated = translated.replace(/^```latex\n?/, "").replace(/\n?```$/, "");
    } else if (translated.startsWith("```")) {
      translated = translated.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    return { result: translated, error: null };
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
    if (!GEMINI_API_KEY) {
      return { reply: "", error: "Chave do Gemini ausente." };
    }

    const contextHeader = `Você é um Copiloto Agêntico de Tradução Interativa integrado a um editor de documentos técnicos e LaTeX.
O usuário está visualizando e editando um documento.
Contexto do Documento:
[ORIGINAL]: ${currentDocContext.original.substring(0, 1500)}
[TRADUZIDO ATUALMENTE]: ${currentDocContext.translated.substring(0, 1500)}

Sua função é auxiliar o usuário a esclarecer dúvidas, sugerir alternativas de tradução para trechos específicos, ajustar tom (formal/informal) e aplicar termos ao glossário. Seja direto, conciso e prestativo.`;

    const contents = [
      { role: "user", parts: [{ text: contextHeader }] },
      { role: "model", parts: [{ text: "Entendido! Sou seu copiloto de tradução. Como posso ajudar com este documento?" }] },
      ...history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      })),
      { role: "user", parts: [{ text: userMessage }] }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      return { reply: "", error: errData.error?.message || "Erro no Gemini" };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return { reply, error: null };
  } catch (err: any) {
    return { reply: "", error: err.message || "Erro ao consultar copiloto" };
  }
}
