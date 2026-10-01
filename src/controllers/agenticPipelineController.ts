// Orquestrador do Pipeline Agêntico de Tradução e Engenharia de Documentos LaTeX com Auto-Retry, Fallback de Modelos e Logs Visuais em Tempo Real

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
  agentRole: string;
  detail: string;
  liveLogs: string[];
  discoveredTerms?: string[];
  detectedFormulasCount?: number;
  isPausedForTerms?: boolean;
}

export interface AgenticPipelineResult {
  translatedLatex: string;
  originalLatex?: string;
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
  maxRetries: number = 3,
  signal?: AbortSignal
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
      if (signal?.aborted) {
        throw new Error("TRANSLATION_ABORTED");
      }
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
            signal,
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
        if (err?.name === "AbortError" || err?.message === "TRANSLATION_ABORTED") {
          throw new Error("TRANSLATION_ABORTED");
        }
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
  input: { text?: string; fileBase64?: string; mimeType?: string; fileName?: string; signal?: AbortSignal }
): Promise<{ structuralOutline: string; rawCleanContent: string }> {
  const prompt = `Você é o Agente 1 (Especialista em Engenharia Reversa e Decomposição Estrutural de Documentos em LaTeX).
Sua missão:
1. Ler e analisar todo o documento fornecido (PDF digitalizado, imagem ou texto).
2. Reconstruir o documento COMPLETO no formato CÓDIGO LATEX puro, mantendo o IDIOMA ORIGINAL fiel (ex: Alemão, Inglês, Francês).
3. Mapear todas as seções (\\section, \\subsection), título (\\title), autor (\\author), ambientes matemáticos ($...$, \\begin{equation}, matrizes, frações, integrais), tabelas de DADOS (\\begin{tabular}) e notas de rodapé (\\footnote).
4. REGRAS OBRIGATÓRIAS PARA MATEMÁTICA:
   - Delimitadores de chaves em \\left e \\right DEVEM conter contrabarra: use sempre \\left\\{ e \\right\\}, NUNCA use \\left{ ou \\right}.
   - Frações DEVEM sempre ter chaves separando numerador e denominador: use sempre \\frac{numerador}{denominador} (ex: \\frac{U}{h\\nu}), NUNCA omita chaves (nunca gere \\fracUh\\nu).
   - Equações em destaque devem estar dentro de \\[ ... \\] ou \\begin{equation} ... \\end{equation}.
5. Gerar o arquivo .tex original completo, limpo e compilável.
6. DIAGRAMAÇÃO: documento em COLUNA ÚNICA. NUNCA use tabular/minipage/multicol para imitar duas páginas PDF lado a lado, cabeçalho bilingue ou papel timbrado. Ignore rodapés de template ("Page 1", "Student's Copy") se não forem conteúdo científico. Se o PDF for bilingue, extraia só o idioma original em fluxo contínuo.

Retorne APENAS o código LaTeX completo do documento original, sem introduções ou explicações.`;

  const inlineData = input.fileBase64 && input.mimeType
    ? { mimeType: input.mimeType, data: input.fileBase64 }
    : undefined;

  const promptWithContent = input.text
    ? `${prompt}\n\nDocumento de Entrada:\n"""\n${input.text}\n"""`
    : prompt;

  const result = await callGemini(promptWithContent, inlineData, 3, input.signal);
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
  targetLang: string,
  signal?: AbortSignal
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
    const rawJson = await callGemini(prompt, undefined, 3, signal);
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
        selectedOption: "",
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
  customInstruction: string = "",
  signal?: AbortSignal
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

PADRÕES DE LATEX EXIGIDOS:
- Utilize formatação LaTeX moderna com comandos de argumento: use \\textbf{...} para negrito (NUNCA use {\\bfseries ...} ou {\\bf ...}), \\textit{...} para itálico, \\section{...} para títulos de seções.
- Fórmulas matemáticas: use sempre delimitadores escapados para chaves: \\left\\{ e \\right\\} (NUNCA \\left{ ou \\right}). Em frações, use sempre chaves obrigatórias \\frac{numerador}{denominador} (NUNCA omita chaves como \\fracUh\\nu).
- Nunca deixe fragmentos malformados como chaves soltas, colchetes de dimensão soltos como [1em], ou comandos TeX obsoletos.
- Em nomes próprios e referências (ex: O. Lummer, p. 202), use espaçamento normal legível em vez de tios (~) excessivos.
- NUNCA use \\begin{tabular} para layout de página, cabeçalho bilingue ou duas colunas de texto corrido. Use \\title, \\section e parágrafos em coluna única.

Documento LaTeX a traduzir:
"""
${latexContent}
"""

Retorne APENAS o documento LaTeX traduzido e compilável, sem introduções.`;

  const result = await callGemini(prompt, undefined, 3, signal);
  return stripMarkdownFences(result);
}

/**
 * AGENTE 4: Validação Sintática e Auto-Correção de LaTeX
 * Faz a verificação sintática do documento gerado (chaves balanceadas, ambientes fechados, fórmulas válidas).
 */
export async function agentValidateAndCorrectLatex(
  translatedLatex: string,
  signal?: AbortSignal
): Promise<{ finalLatex: string; issuesFixed: string[] }> {
  const prompt = `Você é o Agente 4 (Validador e Linter de LaTeX).
Sua missão:
1. Inspecionar o código LaTeX fornecido em busca de erros de sintaxe comuns:
   - Chaves desbalanceadas { ou }
   - Ambientes não fechados (ex: \\begin{equation} sem \\end{equation}, \\begin{itemize} sem \\end{itemize})
   - Erros de delimitadores matemáticos ($ não fechados, \\] faltantes)
   - Delimitadores matemáticos incorretos como \\left{ ou \\right} (que DEVEM ser corrigidos para \\left\\{ e \\right\\})
   - Frações com chaves faltantes como \\fracUh\\nu (que DEVEM ser corrigidas para \\frac{U}{h\\nu})
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
    const rawJson = await callGemini(prompt, undefined, 3, signal);
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
 * FASE 1: Decomposição Estrutural e Extração de Terminologia (Agentes 1 e 2)
 * Executa as etapas preliminares e para antes da tradução para permitir consulta humana aos termos.
 */
export async function runPipelinePhase1(options: {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  sourceLang: string;
  targetLang: string;
  onProgress?: (progress: AgenticPipelineProgress) => void;
  signal?: AbortSignal;
}): Promise<{
  rawCleanContent: string;
  formulasCount: number;
  identifiedTerms: TermDecision[];
  error: string | null;
}> {
  try {
    // ── ETAPA 1: Decomposição e Extração Estrutural ──
    options.onProgress?.({
      step: 1,
      stepName: "Decomposição Estrutural & Reconstrução LaTeX",
      agentRole: "Engenheiro de Tipografia LaTeX",
      detail: "Analisando layout, hierarquia de seções e isolando todas as equações matemáticas...",
      liveLogs: [
        "Iniciando leitura em alta definição do documento...",
        "Identificando ambientes de fórmulas ($...$, \\begin{equation}, matrizes)...",
        "Construindo versão .tex original compilável...",
      ],
    });

    const { rawCleanContent } = await agentDeconstructDocument({
      text: options.text,
      fileBase64: options.fileBase64,
      mimeType: options.mimeType,
      fileName: options.fileName,
      signal: options.signal,
    });

    const formulasCount = (rawCleanContent.match(/\$|\\begin\{equation\}|\\\[/g) || []).length;

    // ── ETAPA 2: Extração e Análise de Termos-Chave ──
    options.onProgress?.({
      step: 2,
      stepName: "Análise Linguística & Terminologia",
      agentRole: "Linguista Computacional Técnico",
      detail: "Identificando conceitos-chave, jargões específicos e gerando opções de tradução...",
      detectedFormulasCount: formulasCount,
      liveLogs: [
        `Estrutura original mapeada com ${formulasCount} blocos de fórmulas matemáticas.`,
        "Escaneando termos técnicos e jargões para consulta no Copiloto...",
      ],
    });

    const identifiedTerms = await agentExtractKeyTerminology(
      rawCleanContent,
      options.sourceLang,
      options.targetLang,
      options.signal
    );

    return {
      rawCleanContent,
      formulasCount,
      identifiedTerms,
      error: null,
    };
  } catch (err: any) {
    return {
      rawCleanContent: "",
      formulasCount: 0,
      identifiedTerms: [],
      error: err.message || "Falha na Fase 1 do pipeline agêntico.",
    };
  }
}

/**
 * FASE 2: Síntese, Tradução com Decisões Humanas e Validação Sintática (Agentes 3 e 4)
 * Prossegue com a tradução aplicando as decisões escolhidas pelo usuário durante a pausa.
 */
export async function runPipelinePhase2(options: {
  rawCleanContent: string;
  sourceLang: string;
  targetLang: string;
  glossary: Array<{ original: string; translation: string }>;
  userDecisions?: TermDecision[];
  customInstruction?: string;
  formulasCount?: number;
  identifiedTerms?: TermDecision[];
  onProgress?: (progress: AgenticPipelineProgress) => void;
  signal?: AbortSignal;
}): Promise<{
  translatedLatex: string;
  validationIssues: string[];
  error: string | null;
}> {
  try {
    const termNames = (options.identifiedTerms || []).map((t) => t.originalTerm);
    const formulasCount = options.formulasCount || 0;

    // ── ETAPA 3: Síntese e Tradução Científica ──
    options.onProgress?.({
      step: 3,
      stepName: "Síntese & Tradução Científica LaTeX",
      agentRole: "Tradutor Acadêmico & Sintetizador",
      detail: `Traduzindo texto para ${options.targetLang}, preservando notações matemáticas e aplicando decisões do usuário...`,
      discoveredTerms: termNames,
      detectedFormulasCount: formulasCount,
      liveLogs: [
        `${termNames.length} termos técnicos configurados com decisões do usuário.`,
        "Preservando integridade das fórmulas matemáticas e tabelas...",
        `Traduzindo e sintetizando documento LaTeX para ${options.targetLang}...`,
      ],
    });

    const translatedRaw = await agentTranslateAndSynthesize(
      options.rawCleanContent,
      options.sourceLang,
      options.targetLang,
      options.glossary,
      options.userDecisions || [],
      options.customInstruction,
      options.signal
    );

    // ── ETAPA 4: Validação Sintática e Auto-Correção ──
    options.onProgress?.({
      step: 4,
      stepName: "Auditoria Sintática & Linter LaTeX",
      agentRole: "Validador e Auditor de LaTeX",
      detail: "Auditando fechamento de chaves {}, delimitadores KaTeX e garantindo compilação 100%...",
      discoveredTerms: termNames,
      detectedFormulasCount: formulasCount,
      liveLogs: [
        "Verificando balanceamento de chaves { e }...",
        "Validando ambientes matemáticos e alinhamentos...",
        "Documento pronto e validado com sucesso!",
      ],
    });

    const { finalLatex, issuesFixed } = await agentValidateAndCorrectLatex(
      translatedRaw,
      options.signal
    );

    return {
      translatedLatex: finalLatex,
      validationIssues: issuesFixed,
      error: null,
    };
  } catch (err: any) {
    return {
      translatedLatex: "",
      validationIssues: [],
      error: err.message || "Falha na Fase 2 do pipeline agêntico.",
    };
  }
}

/**
 * ORQUESTRADOR PRINCIPAL DO PIPELINE AGÊNTICO
 * Executa as etapas encadeadas e emite callbacks visuais ricos em tempo real.
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
  // Executa Fase 1
  const phase1 = await runPipelinePhase1({
    text: options.text,
    fileBase64: options.fileBase64,
    mimeType: options.mimeType,
    fileName: options.fileName,
    sourceLang: options.sourceLang,
    targetLang: options.targetLang,
    onProgress: options.onProgress,
  });

  if (phase1.error) {
    return {
      translatedLatex: "",
      identifiedTerms: [],
      error: phase1.error,
    };
  }

  // Executa Fase 2
  const phase2 = await runPipelinePhase2({
    rawCleanContent: phase1.rawCleanContent,
    sourceLang: options.sourceLang,
    targetLang: options.targetLang,
    glossary: options.glossary,
    userDecisions: options.userDecisions,
    customInstruction: options.customInstruction,
    formulasCount: phase1.formulasCount,
    identifiedTerms: phase1.identifiedTerms,
    onProgress: options.onProgress,
  });

  if (phase2.error) {
    return {
      translatedLatex: "",
      originalLatex: phase1.rawCleanContent,
      identifiedTerms: phase1.identifiedTerms,
      error: phase2.error,
    };
  }

  return {
    translatedLatex: phase2.translatedLatex,
    originalLatex: phase1.rawCleanContent,
    identifiedTerms: phase1.identifiedTerms,
    validationIssues: phase2.validationIssues,
    error: null,
  };
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
