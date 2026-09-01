// Orquestrador do Pipeline Agêntico de Tradução e Engenharia de Documentos LaTeX com Auto-Retry e Fallback de Modelos

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Lista de modelos oficiais ativos em ordem de preferência (priorizando Gemini 3.5 Flash)
const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
];

export interface TermDecision {
  id: string;
  originalTerm: string;
  contextSentence: string;
  suggestedOptions: string[];
  selectedOption?: string;
  customExplanation?: string;
}

export interface AgenticPipelineProgress {
  step: 1 | 2 | 3 | 4;
  stepName: string;
  detail: string;
}

export interface AgenticPipelineResult {
  translatedLatex: string;
  identifiedTerms: TermDecision[];
  structureSummary?: string;
  validationIssues?: string[];
  error: string | null;
}

/**
 * Utilitário resiliente para chamadas à API do Gemini com Auto-Retry e Fallback Automático de Modelos
 */
async function callGemini(
  prompt: string,
  inlineData?: { mimeType: string; data: string },
  maxRetries: number = 3
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Chave da API do Gemini não configurada no .env");
  }

  const parts: any[] = [];
  if (inlineData) {
    parts.push({
      inline_data: {
        mime_type: inlineData.mimeType,
        data: inlineData.data,
      },
    });
  }
  parts.push({ text: prompt });

  let lastErrorMsg = "";

  // Percorre os modelos disponíveis caso haja sobrecarga temporária
  for (const model of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.15,
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
        const errMsg = errData.error?.message || `HTTP ${response.status}`;
        lastErrorMsg = errMsg;

        // Se for erro de alta demanda (503/429), aguarda antes de tentar novamente ou trocar de modelo
        if (
          response.status === 503 ||
          response.status === 429 ||
          errMsg.includes("high demand") ||
          errMsg.includes("Resource has been exhausted") ||
          errMsg.includes("Quota")
        ) {
          console.warn(`[Gemini ${model}] Tentativa ${attempt} falhou por alta demanda (${errMsg}). Aguardando...`);
          await new Promise((res) => setTimeout(res, 1200 * attempt));
          continue; // tenta de novo no mesmo modelo
        } else {
          // Outro erro, pula para o próximo modelo fallback
          break;
        }
      } catch (err: any) {
        lastErrorMsg = err.message || "Erro de rede com o Gemini";
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }

  throw new Error(`Serviço temporariamente ocupado após tentativas: ${lastErrorMsg}`);
}

/**
 * AGENTE 1: Decomposição Estrutural e Preservação de LaTeX
 * Analisa o documento bruto (texto, PDF ou código) e isola o que é estrutura, o que são equações e o que é texto traduzível.
 */
export async function agentDeconstructDocument(
  input: { text?: string; fileBase64?: string; mimeType?: string; fileName?: string }
): Promise<{ structuralOutline: string; rawCleanContent: string }> {
  const prompt = `Você é o Agente 1 (Especialista em Decomposição Estrutural e Tipografia LaTeX).
Sua missão:
1. Analisar detalhadamente o documento fornecido (seja texto bruto, código LaTeX ou documento digitalizado).
2. Identificar e listar todas as seções (\\section, \\subsection), ambientes matemáticos ($...$, \\begin{equation}, \\begin{pmatrix}, matrizes), tabelas e listas.
3. Gerar uma versão limpa e estruturada do documento em formato LaTeX com todas as tags de preâmbulo e pacotes necessários preparados.

Retorne APENAS o código LaTeX estruturado completo, sem introduções ou explicações.`;

  const inlineData = input.fileBase64 && input.mimeType
    ? { mimeType: input.mimeType, data: input.fileBase64 }
    : undefined;

  const promptWithContent = input.text
    ? `${prompt}\n\nDocumento de Entrada:\n"""\n${input.text}\n"""`
    : prompt;

  const result = await callGemini(promptWithContent, inlineData);
  const cleanLatex = stripMarkdownFences(result);

  return {
    structuralOutline: "Estrutura e equações mapeadas com sucesso.",
    rawCleanContent: cleanLatex,
  };
}

/**
 * AGENTE 2: Identificação de Termos-Chave e Análise de Ambiguidade
 * Varre o documento em busca de jargões técnicos, termos intraduzíveis e conceitos com múltiplas interpretações.
 */
export async function agentExtractKeyTerminology(
  content: string,
  sourceLang: string,
  targetLang: string
): Promise<TermDecision[]> {
  const prompt = `Você é o Agente 2 (Linguista Computacional e Terminologista Técnico especializado em ${sourceLang} -> ${targetLang}).
Analise o seguinte texto/código LaTeX e identifique termos técnicos-chave, jargões científicos, siglas ou palavras ambíguas cujo significado pode variar dependendo da preferência do autor (ex: "fine-tuning", "embedding", "zero-shot", "state-of-the-art", "gradient descent", "eigenvalue", "quantum superposition", "trade-off", "quanta", "wirkungsquantum", "strahlungsgesetz").

Para cada termo identificado, forneça opções de tradução relevantes para que o usuário possa escolher no Copiloto.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
[
  {
    "id": "term-1",
    "originalTerm": "Termo Original",
    "contextSentence": "Frase curta onde o termo aparece no texto",
    "suggestedOptions": [
      "Opção 1 (Manter no idioma original)",
      "Opção 2 (Tradução técnica direta)",
      "Opção 3 (Tradução alternativa formal)"
    ]
  }
]

Documento para análise:
"""
${content.substring(0, 4000)}
"""

Retorne APENAS o array JSON válido sem texto fora do JSON.`;

  try {
    const rawJson = await callGemini(prompt);
    const cleanedJson = stripMarkdownFences(rawJson);
    const parsed = JSON.parse(cleanedJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        id: item.id || `term-${idx + 1}`,
        originalTerm: item.originalTerm || "Termo",
        contextSentence: item.contextSentence || "",
        suggestedOptions: Array.isArray(item.suggestedOptions) && item.suggestedOptions.length > 0
          ? item.suggestedOptions
          : [`Manter "${item.originalTerm}"`, `Traduzir "${item.originalTerm}"`],
        selectedOption: undefined,
      }));
    }
  } catch (err) {
    console.warn("Agente 2 terminologia fallback:", err);
  }

  return [];
}

/**
 * AGENTE 3: Síntese e Tradução Estruturada em LaTeX
 * Aplica as decisões do usuário e o glossário, traduzindo com fidelidade científica.
 */
export async function agentTranslateAndSynthesize(
  latexContent: string,
  sourceLang: string,
  targetLang: string,
  glossary: Array<{ original: string; translation: string }>,
  userDecisions: TermDecision[] = [],
  customInstruction: string = ""
): Promise<string> {
  const effectiveGlossary = [...glossary];

  // Adiciona termos decididos pelo usuário
  userDecisions.forEach((d) => {
    if (d.selectedOption) {
      effectiveGlossary.push({
        original: d.originalTerm,
        translation: d.selectedOption,
      });
    }
  });

  let glossaryText = "";
  if (effectiveGlossary.length > 0) {
    glossaryText = `\n\nGLOSSÁRIO E DECISÕES DO USUÁRIO OBRIGATÓRIAS:\n` +
      effectiveGlossary.map((g) => `- "${g.original}" => "${g.translation}"`).join("\n");
  }

  const prompt = `Você é o Agente 3 (Tradutor Científico e Sintetizador LaTeX Avançado).
Sua missão:
1. Traduzir o conteúdo textual do documento de ${sourceLang} para ${targetLang}.
2. PRESERVAR RIGOROSAMENTE todas as fórmulas matemáticas ($...$, \\[...\\], \\begin{equation}, matrizes \\begin{pmatrix}, etc.), comandos LaTeX (\\section, \\textbf, \\cite, \\ref) e diagramação.
3. APLICAR ESTREITAMENTE o glossário e as decisões de tradução do usuário abaixo.${glossaryText}
${customInstruction ? `Instruções adicionais do usuário: ${customInstruction}` : ""}

Documento LaTeX a traduzir:
"""
${latexContent}
"""

Retorne APENAS o documento LaTeX traduzido e compilável, sem introduções.`;

  const result = await callGemini(prompt);
  return stripMarkdownFences(result);
}

/**
 * AGENTE 4: Validação Sintática e Auto-Correção de LaTeX
 * Faz a verificação sintática do documento gerado (chaves balanceadas, ambientes fechados, fórmulas válidas).
 */
export async function agentValidateAndCorrectLatex(
  translatedLatex: string
): Promise<{ finalLatex: string; issuesFixed: string[] }> {
  const prompt = `Você é o Agente 4 (Validador e Linter de LaTeX).
Sua missão:
1. Inspecionar o código LaTeX fornecido em busca de erros de sintaxe comuns:
   - Chaves desbalanceadas { ou }
   - Ambientes não fechados (ex: \\begin{equation} sem \\end{equation}, \\begin{itemize} sem \\end{itemize})
   - Erros de delimitadores matemáticos ($ não fechados, \\] faltantes)
   - Comandos com caracteres escapados incorretamente
2. Corrigir automaticamente quaisquer problemas sintáticos encontrados garantindo que o código seja 100% compilável.

Responda em formato JSON com o seguinte schema:
{
  "issuesFixed": ["Descrição de correções feitas se houver"],
  "finalLatex": "Código LaTeX corrigido e perfeito"
}

Código LaTeX para validação:
"""
${translatedLatex}
"""

Retorne APENAS o JSON válido.`;

  try {
    const rawJson = await callGemini(prompt);
    const cleanedJson = stripMarkdownFences(rawJson);
    const parsed = JSON.parse(cleanedJson);
    if (parsed.finalLatex) {
      return {
        finalLatex: stripMarkdownFences(parsed.finalLatex),
        issuesFixed: parsed.issuesFixed || [],
      };
    }
  } catch (err) {
    console.warn("Agente 4 linter fallback:", err);
  }

  return {
    finalLatex: translatedLatex,
    issuesFixed: [],
  };
}

/**
 * ORQUESTRADOR PRINCIPAL DO PIPELINE AGÊNTICO
 * Executa as etapas encadeadas e emite callbacks de progresso.
 */
export async function runAgenticTranslationPipeline(options: {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  sourceLang: string;
  targetLang: string;
  glossary: Array<{ original: string; translation: string }>;
  userDecisions?: TermDecision[];
  customInstruction?: string;
  onProgress?: (progress: AgenticPipelineProgress) => void;
}): Promise<AgenticPipelineResult> {
  try {
    // ── ETAPA 1: Decomposição e Extração Estrutural ──
    options.onProgress?.({
      step: 1,
      stepName: "Decomposição Estrutural",
      detail: "Agente 1: Mapeando layout, seções e isolando equações matemáticas...",
    });

    const { rawCleanContent } = await agentDeconstructDocument({
      text: options.text,
      fileBase64: options.fileBase64,
      mimeType: options.mimeType,
      fileName: options.fileName,
    });

    // ── ETAPA 2: Extração e Análise de Termos-Chave ──
    options.onProgress?.({
      step: 2,
      stepName: "Análise de Terminologia",
      detail: "Agente 2: Identificando jargões técnicos e termos para consulta...",
    });

    const identifiedTerms = await agentExtractKeyTerminology(
      rawCleanContent,
      options.sourceLang,
      options.targetLang
    );

    // ── ETAPA 3: Síntese e Tradução Científica ──
    options.onProgress?.({
      step: 3,
      stepName: "Tradução & Síntese LaTeX",
      detail: "Agente 3: Traduzindo conteúdo e sintetizando estrutura LaTeX...",
    });

    const translatedRaw = await agentTranslateAndSynthesize(
      rawCleanContent,
      options.sourceLang,
      options.targetLang,
      options.glossary,
      options.userDecisions || [],
      options.customInstruction
    );

    // ── ETAPA 4: Validação Sintática e Auto-Correção ──
    options.onProgress?.({
      step: 4,
      stepName: "Validação & Linter LaTeX",
      detail: "Agente 4: Verificando balanceamento de chaves e fórmulas...",
    });

    const { finalLatex, issuesFixed } = await agentValidateAndCorrectLatex(translatedRaw);

    return {
      translatedLatex: finalLatex,
      identifiedTerms,
      validationIssues: issuesFixed,
      error: null,
    };
  } catch (err: any) {
    return {
      translatedLatex: "",
      identifiedTerms: [],
      error: err.message || "Falha durante o pipeline agêntico de tradução.",
    };
  }
}

/**
 * Aplica uma decisão de termo individual e regenera trechos do LaTeX
 */
export async function updateTranslationWithTermDecision(
  currentLatex: string,
  termDecision: TermDecision,
  targetLang: string
): Promise<string> {
  const prompt = `Você é um editor de documentos LaTeX e tradutor de alta precisão.
O usuário decidiu que o termo "${termDecision.originalTerm}" deve ser traduzido estritamente como "${termDecision.selectedOption}".

Atualize o documento LaTeX abaixo aplicando essa escolha terminológica de forma natural e correta em todo o texto, sem danificar nenhuma tag ou equação.

Documento LaTeX atual:
"""
${currentLatex}
"""

Retorne APENAS o código LaTeX atualizado com a decisão aplicada.`;

  const result = await callGemini(prompt);
  return stripMarkdownFences(result);
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
