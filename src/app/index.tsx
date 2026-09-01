import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { auth } from "../controllers/firebaseConfig";
import { logoutUser } from "../controllers/authController";
import {
  runAgenticTranslationPipeline,
  updateTranslationWithTermDecision,
  TermDecision,
  AgenticPipelineProgress,
} from "../controllers/agenticPipelineController";
import {
  getGlossaryTerms,
  addGlossaryTerm,
  deleteGlossaryTerm,
  GlossaryTerm,
} from "../controllers/glossaryController";
import {
  saveTranslationHistory,
  getTranslationHistory,
  deleteTranslationHistory,
  TranslationHistoryItem,
} from "../controllers/historyController";

import LMenu from "../components/LMenu";
import RMenu from "../components/RMenu";
import LatexViewer from "../components/LatexViewer";
import { mainStyles as styles } from "../styles/mainStyles";

// Lista de idiomas disponíveis
const AVAILABLE_LANGUAGES = [
  { code: "auto", name: "Detectar automaticamente" },
  { code: "en", name: "Inglês (EN)" },
  { code: "pt-BR", name: "Português (PT-BR)" },
  { code: "es", name: "Espanhol (ES)" },
  { code: "fr", name: "Francês (FR)" },
  { code: "de", name: "Alemão (DE)" },
  { code: "it", name: "Italiano (IT)" },
  { code: "zh", name: "Chinês (ZH)" },
  { code: "ja", name: "Japonês (JA)" },
  { code: "ru", name: "Russo (RU)" },
];

// Exemplos de teste integrados para demonstração imediata
const SAMPLE_DOCS = [
  {
    title: "Artigo Acadêmico com LaTeX",
    content: `\\section{Introduction to Quantum Computing}
The state of a quantum register with $n$ qubits is described by a vector in a $2^n$-dimensional Hilbert space:
\\[ |\\psi\\rangle = \\sum_{x=0}^{2^n-1} \\alpha_x |x\\rangle, \\quad \\sum_x |\\alpha_x|^2 = 1 \\]

Recent advancements in superconducting circuits have demonstrated quantum supremacy in specific computational tasks.
\\subsection{Mathematical Formulation}
Let $H$ denote the Hadamard transform matrix defined as:
\\[ H = \\frac{1}{\\sqrt{2}} \\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix} \\]
Applying $H^{\\otimes n}$ creates a uniform superposition of all computational basis states.`,
  },
  {
    title: "Epistemologia da Inteligência Artificial (Figma)",
    content: `The question of whether artificial systems can possess genuine understanding — as opposed to mere pattern recognition — has occupied philosophers and cognitive scientists for decades.

Contemporary large language models present a striking challenge to classical cognitivism. They produce coherent, contextually appropriate outputs across domains as disparate as legal reasoning, poetic composition, and mathematical proof — yet the internal mechanisms underlying this competence remain opaque even to their architects.

The concept of emergent capability complicates matters further. At certain scales, capabilities appear that were not explicitly trained for and could not have been predicted from smaller model behavior.`,
  },
  {
    title: "Manual Técnico de Machine Learning",
    content: `\\section{Data Pipeline and Neural Network Training}
Before initiating the training set epoch, ensure the embedding vectors are normalized:
\\[ \\hat{v} = \\frac{v - \\mu}{\\sigma + \\epsilon} \\]

Perform fine-tuning using stochastic gradient descent with Adam optimizer. Measure the benchmark performance against standard validation sets.`,
  },
];

interface UploadedFile {
  name: string;
  size: string;
  mimeType: string;
  base64: string;
}

export default function Index() {
  const router = useRouter();

  // Estados de layout
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"new-chat" | "reading">("new-chat");
  const [docTab, setDocTab] = useState<"translated" | "split" | "original">("translated");
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState<"source" | "target" | null>(null);

  // Estados de dados e pipeline agêntico
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isSwitchingDoc, setIsSwitchingDoc] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("pt-BR");
  const [promptInstructions, setPromptInstructions] = useState("");
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<AgenticPipelineProgress | null>(null);
  const [identifiedTerms, setIdentifiedTerms] = useState<TermDecision[]>([]);

  const [originalFullText, setOriginalFullText] = useState("");
  const [translatedFullText, setTranslatedFullText] = useState("");

  // Firestore Data
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [newOriginalTerm, setNewOriginalTerm] = useState("");
  const [newTranslatedTerm, setNewTranslatedTerm] = useState("");

  // Monitora Autenticação
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/login");
      } else {
        loadUserData();
      }
    });
    return unsubscribe;
  }, []);

  const loadUserData = async () => {
    const { terms } = await getGlossaryTerms();
    setGlossary(terms);

    const { items } = await getTranslationHistory();
    setHistory(items);
  };

  // Seletor de Arquivos (PDF, Imagens, TEX, DOCX)
  const handlePickDocument = () => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,image/*,.tex,.txt,.docx";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(",")[1];
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

          setSelectedFile({
            name: file.name,
            size: `${sizeMB} MB`,
            mimeType: file.type || "application/pdf",
            base64: base64Data,
          });
          setInputText("");
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert("Aviso", "Seletor nativo disponível.");
    }
  };

  // Dispara o Pipeline Agêntico Multietapas de IA
  const handleStartTranslation = async () => {
    const hasFile = selectedFile !== null;
    const hasText = inputText.trim().length > 0;

    if (!hasFile && !hasText) {
      const msg = "Por favor, selecione um arquivo (PDF/Imagem) ou insira um texto/exemplo para traduzir.";
      if (typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert("Aviso", msg);
      }
      return;
    }

    setIsTranslating(true);

    const docOriginal = hasFile && selectedFile
      ? `[Documento: ${selectedFile.name} (${selectedFile.size})]`
      : inputText.trim();

    setOriginalFullText(docOriginal);

    // Executa o Pipeline Agêntico (Etapa 1 a 4)
    const pipelineResult = await runAgenticTranslationPipeline({
      text: hasFile ? undefined : docOriginal,
      fileBase64: hasFile ? selectedFile?.base64 : undefined,
      mimeType: hasFile ? selectedFile?.mimeType : undefined,
      fileName: hasFile ? selectedFile?.name : undefined,
      sourceLang,
      targetLang,
      glossary,
      customInstruction: promptInstructions,
      onProgress: (progress) => {
        setPipelineProgress(progress);
      },
    });

    setIsTranslating(false);
    setPipelineProgress(null);

    if (pipelineResult.error) {
      if (typeof window !== "undefined" && window.alert) {
        window.alert(`Erro no Pipeline Agêntico: ${pipelineResult.error}`);
      } else {
        Alert.alert("Erro", pipelineResult.error);
      }
    } else {
      setTranslatedFullText(pipelineResult.translatedLatex);
      setIdentifiedTerms(pipelineResult.identifiedTerms);
      setViewMode("reading");
      setRightOpen(true); // Abre o Copiloto com os termos para consulta imediata

      try {
        const title = hasFile && selectedFile
          ? `Doc: ${selectedFile.name.substring(0, 26)}`
          : docOriginal.split("\n")[0].replace(/[\\[\]{}\\$]/g, "").substring(0, 30) || "Documento Traduzido";

        await saveTranslationHistory(title, docOriginal, pipelineResult.translatedLatex, sourceLang, targetLang);
        loadUserData();
      } catch (e) {
        console.warn("Aviso ao salvar histórico:", e);
      }
    }
  };

  // Aplica decisão de termo escolhida pelo usuário no chat do Copiloto
  const handleApplyTermDecision = async (term: TermDecision, chosenOption: string) => {
    // 1. Atualiza estado de termos identificados
    setIdentifiedTerms((prev) =>
      prev.map((t) => (t.id === term.id ? { ...t, selectedOption: chosenOption } : t))
    );

    // 2. Atualiza o código LaTeX em tempo real
    try {
      const updatedLatex = await updateTranslationWithTermDecision(
        translatedFullText,
        { ...term, selectedOption: chosenOption },
        targetLang
      );
      setTranslatedFullText(updatedLatex);

      // 3. Salva no Glossário permanente
      await addGlossaryTerm(term.originalTerm, chosenOption);
      const { terms } = await getGlossaryTerms();
      setGlossary(terms);
    } catch (e) {
      console.warn("Erro ao atualizar termo no documento:", e);
    }
  };

  // Carrega exemplo pronto com 1 clique
  const loadSample = (sample: { title: string; content: string }) => {
    setSelectedFile(null);
    setInputText(sample.content);
    setPromptInstructions("Mantenha o tom formal e preserve todas as estruturas matemáticas.");
  };

  // CRUD Glossário
  const handleAddTerm = async () => {
    if (!newOriginalTerm.trim() || !newTranslatedTerm.trim()) return;
    await addGlossaryTerm(newOriginalTerm, newTranslatedTerm);
    setNewOriginalTerm("");
    setNewTranslatedTerm("");
    const { terms } = await getGlossaryTerms();
    setGlossary(terms);
  };

  const handleDeleteTerm = async (id?: string) => {
    if (!id) return;
    await deleteGlossaryTerm(id);
    const { terms } = await getGlossaryTerms();
    setGlossary(terms);
  };

  const handleSelectHistory = (item: TranslationHistoryItem) => {
    setActiveHistoryId(item.id || null);
    setIsSwitchingDoc(true);
    setTimeout(() => {
      setSelectedFile(null);
      setOriginalFullText(item.originalText);
      setTranslatedFullText(item.translatedText);
      setViewMode("reading");
      setIsSwitchingDoc(false);
    }, 140);
  };

  const handleDeleteHistory = async (id: string) => {
    await deleteTranslationHistory(id);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      setViewMode("new-chat");
      setInputText("");
      setSelectedFile(null);
      setOriginalFullText("");
      setTranslatedFullText("");
    }
    loadUserData();
  };

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  const getSourceLangName = () => {
    return AVAILABLE_LANGUAGES.find((l) => l.code === sourceLang)?.name || "Detectar idioma";
  };

  const getTargetLangName = () => {
    return AVAILABLE_LANGUAGES.find((l) => l.code === targetLang)?.name || "Português (PT-BR)";
  };

  return (
    <SafeAreaView className={styles.container}>
      {/* ── 1. MENU ESQUERDO (LMenu) ── */}
      <LMenu
        isOpen={leftOpen}
        history={history}
        activeId={activeHistoryId}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        onNewTranslation={() => {
          setActiveHistoryId(null);
          setViewMode("new-chat");
          setInputText("");
          setSelectedFile(null);
          setPromptInstructions("");
          setIdentifiedTerms([]);
        }}
        onLogout={handleLogout}
      />

      {/* TOGGLE ESQUERDO */}
      <View className="justify-center z-20">
        <TouchableOpacity
          className={styles.sideToggleBtnLeft}
          onPress={() => setLeftOpen(!leftOpen)}
        >
          <Feather
            name={leftOpen ? "chevron-left" : "chevron-right"}
            size={12}
            color="#6b6b80"
          />
        </TouchableOpacity>
      </View>

      {/* ── 2. CONTEÚDO CENTRAL ── */}
      <View className={styles.mainContent}>
        {viewMode === "new-chat" ? (
          /* TELA INICIAL (NOVO CHAT DE TRADUÇÃO AGÊNTICA) */
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View className={styles.newChatContainer}>
              <Text className={styles.welcomeTitle}>Novo Chat de Tradução Agêntica</Text>
              <Text className={styles.welcomeSubtitle}>
                Extração de layout, análise de terminologia e reconstrução matemática em LaTeX
              </Text>

              {/* SELETOR DE IDIOMAS EXPANSÍVEL */}
              <View className={styles.langBar}>
                <TouchableOpacity
                  className={styles.langPickerBtn}
                  onPress={() => setShowLangModal("source")}
                >
                  <Text className={styles.langPickerText}>{getSourceLangName()}</Text>
                  <Feather name="chevron-down" size={12} color="#6b6b80" />
                </TouchableOpacity>

                <Feather name="arrow-right" size={12} color="#6b6b80" />

                <TouchableOpacity
                  className={styles.langPickerBtn}
                  onPress={() => setShowLangModal("target")}
                >
                  <Text className={styles.langPickerText}>{getTargetLangName()}</Text>
                  <Feather name="chevron-down" size={12} color="#6b6b80" />
                </TouchableOpacity>
              </View>

              {/* ÁREA DE DROPZONE / UPLOAD DE DOCUMENTOS */}
              {selectedFile ? (
                <View className="w-full bg-[#13131c] border border-[#6b8cff]/30 rounded-2xl p-5 mb-4 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-10 h-10 rounded-xl bg-[#6b8cff]/20 items-center justify-center mr-3">
                      <Feather name="file-text" size={18} color="#6b8cff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      <Text className="text-[#6b6b80] text-[10px] mt-0.5">
                        {selectedFile.size} • Pronto para pipeline agêntico em LaTeX
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    className="p-2 rounded-lg bg-white/[0.05] active:bg-white/[0.1]"
                    onPress={() => setSelectedFile(null)}
                  >
                    <Feather name="trash-2" size={13} color="#e05a6a" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className={styles.dropzone}
                  onPress={handlePickDocument}
                >
                  <View className={styles.dropzoneIconBox}>
                    <Feather name="upload" size={18} color="#6b8cff" />
                  </View>
                  <Text className={styles.dropzoneText}>Clique para selecionar um documento (PDF, Imagem, .tex)</Text>
                  <Text className={styles.dropzoneSubtext}>A IA executará o pipeline multietapas de reconstrução em LaTeX</Text>
                </TouchableOpacity>
              )}

              {/* BOTÕES DE EXEMPLO RÁPIDO */}
              <Text className="text-[10px] uppercase tracking-widest text-[#6b6b80] mb-2 font-medium">
                Ou teste com um dos exemplos acadêmicos prontos:
              </Text>
              <View className={styles.sampleButtonsRow}>
                {SAMPLE_DOCS.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    className={styles.sampleBtn}
                    onPress={() => loadSample(s)}
                  >
                    <Text className={styles.sampleBtnText}>{s.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* FEED DE PROGRESSO AGÊNTICO EM TEMPO REAL */}
              {isTranslating && pipelineProgress && (
                <View className="w-full bg-[#13131c] border border-[#6b8cff]/30 rounded-2xl p-4 mb-4 animate-smooth-fade flex-row items-center gap-3 shadow-lg">
                  <ActivityIndicator size="small" color="#6b8cff" />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-white text-xs font-semibold">
                        Etapa {pipelineProgress.step}/4: {pipelineProgress.stepName}
                      </Text>
                      <Text className="text-[#6b8cff] text-[10px] font-mono font-medium">
                        {pipelineProgress.step * 25}%
                      </Text>
                    </View>
                    <Text className="text-[#a0a0b8] text-[11px] leading-relaxed">
                      {pipelineProgress.detail}
                    </Text>
                  </View>
                </View>
              )}

              {/* CAIXA DE TEXTO / PROMPT / INSTRUÇÕES */}
              <View className={styles.promptBox}>
                <TextInput
                  className={styles.promptInput}
                  placeholder={
                    selectedFile
                      ? "Instruções adicionais para a IA (ex: 'Converta tabelas para longtable', 'Tom estritamente acadêmico')..."
                      : "Ou digite/cole seu texto técnico ou LaTeX aqui..."
                  }
                  placeholderTextColor="#6b6b80"
                  value={selectedFile ? promptInstructions : inputText}
                  onChangeText={(val) => {
                    if (selectedFile) setPromptInstructions(val);
                    else setInputText(val);
                  }}
                  multiline
                  textAlignVertical="top"
                />
                <View className={styles.promptFooter}>
                  <Text className={styles.promptLabel}>
                    {selectedFile ? "Pipeline Agêntico Multimodal" : "Pipeline Agêntico Texto / LaTeX"}
                  </Text>
                  <TouchableOpacity
                    className={isTranslating ? styles.translateBtnDisabled : styles.translateBtn}
                    onPress={handleStartTranslation}
                    disabled={isTranslating}
                  >
                    {isTranslating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Feather name="send" size={12} color="#ffffff" />
                        <Text className={styles.translateBtnText}>Traduzir com IA Agêntica</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          /* TELA DE LEITURA & REVISÃO COM EXPANSÃO/COLAPSO HORIZONTAL */
          <View className="flex-1 flex-col">
            {/* FLOATING PILL TAB BAR */}
            <View className={styles.tabHeaderContainer}>
              <View className={styles.floatingTabBar}>
                <TouchableOpacity
                  className={docTab === "translated" ? styles.pillTabActive : styles.pillTab}
                  onPress={() => setDocTab("translated")}
                >
                  <Text
                    className={docTab === "translated" ? styles.pillTabTextActive : styles.pillTabText}
                  >
                    Arquivo Traduzido
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={docTab === "split" ? styles.pillTabActive : styles.pillTabIconBtn}
                  onPress={() => setDocTab("split")}
                >
                  <Feather
                    name="columns"
                    size={13}
                    color={docTab === "split" ? "#ffffff" : "#6b6b80"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  className={docTab === "original" ? styles.pillTabActive : styles.pillTab}
                  onPress={() => setDocTab("original")}
                >
                  <Text
                    className={docTab === "original" ? styles.pillTabTextActive : styles.pillTabText}
                  >
                    Arquivo Original
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PAINÉIS DE DOCUMENTO COM RENDERIZADOR LATEX (EXPANSÃO E COLAPSO HORIZONTAL CONTÍNUO) */}
            <View
              className={`flex-1 flex-row gap-3 px-4 pb-4 overflow-hidden min-h-0 transition-all duration-300 ${
                isSwitchingDoc ? "opacity-25 scale-[0.99]" : "opacity-100 scale-100"
              }`}
            >
              {/* PAINEL TRADUZIDO */}
              <View
                className={`rounded-xl bg-[#13131c] border border-white/[0.07] overflow-hidden flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  docTab === "translated"
                    ? "flex-1 p-5 opacity-100 scale-100 translate-x-0"
                    : docTab === "split"
                    ? "flex-1 p-5 opacity-100 scale-100 translate-x-0"
                    : "w-0 max-w-0 flex-[0_0_0px] p-0 m-0 border-0 opacity-0 pointer-events-none -translate-x-8"
                }`}
                style={{
                  minWidth: docTab === "original" ? 0 : 260,
                }}
              >
                <LatexViewer
                  latexCode={translatedFullText}
                  langTitle={`LaTeX Traduzido — ${getTargetLangName()}`}
                  isAccent={true}
                />
              </View>

              {/* PAINEL ORIGINAL */}
              <View
                className={`rounded-xl bg-[#13131c] border border-white/[0.07] overflow-hidden flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  docTab === "original"
                    ? "flex-1 p-5 opacity-100 scale-100 translate-x-0"
                    : docTab === "split"
                    ? "flex-1 p-5 opacity-100 scale-100 translate-x-0"
                    : "w-0 max-w-0 flex-[0_0_0px] p-0 m-0 border-0 opacity-0 pointer-events-none translate-x-8"
                }`}
                style={{
                  minWidth: docTab === "translated" ? 0 : 260,
                }}
              >
                <LatexViewer
                  latexCode={originalFullText}
                  langTitle={`Original — ${getSourceLangName()}`}
                  isAccent={false}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* TOGGLE DIREITO */}
      {viewMode === "reading" && (
        <View className="justify-center z-20">
          <TouchableOpacity
            className={styles.sideToggleBtnRight}
            onPress={() => setRightOpen(!rightOpen)}
          >
            <Feather
              name={rightOpen ? "chevron-right" : "chevron-left"}
              size={12}
              color="#6b6b80"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ── 3. MENU DIREITO (RMenu - COPILOTO AGÊNTICO & CONSULTA DE TERMOS) ── */}
      <RMenu
        isOpen={viewMode === "reading" && rightOpen}
        currentOriginal={originalFullText}
        currentTranslated={translatedFullText}
        identifiedTerms={identifiedTerms}
        onOpenGlossary={() => setShowGlossaryModal(true)}
        onApplyAdjustment={(newText) => setTranslatedFullText(newText)}
        onApplyTermDecision={handleApplyTermDecision}
      />

      {/* ── 4. MODAL DO GLOSSÁRIO ── */}
      <Modal
        visible={showGlossaryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGlossaryModal(false)}
      >
        <View className={styles.modalOverlay}>
          <View className={styles.modalCard}>
            <View className={styles.modalHeader}>
              <View className="flex-row items-center gap-2">
                <Feather name="book-open" size={14} color="#6b8cff" />
                <Text className={styles.modalTitle}>Glossário do Projeto</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGlossaryModal(false)}>
                <Feather name="x" size={14} color="#6b6b80" />
              </TouchableOpacity>
            </View>

            <ScrollView className={styles.modalBody}>
              <View className={styles.glossaryTableHead}>
                <Text className={styles.glossaryHeadText}>Termo Original</Text>
                <Text className={styles.glossaryHeadText}>Tradução Forçada</Text>
              </View>

              {glossary.length === 0 ? (
                <Text className="text-[#6b6b80] text-xs py-6 text-center italic">
                  Nenhum termo personalizado no glossário.
                </Text>
              ) : (
                glossary.map((g) => (
                  <View key={g.id} className={styles.glossaryRow}>
                    <Text className={styles.glossaryOriginalText}>{g.original}</Text>
                    <Text className={styles.glossaryTranslatedText}>{g.translation}</Text>
                    <TouchableOpacity onPress={() => handleDeleteTerm(g.id)}>
                      <Text className={styles.glossaryDeleteBtn}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Adicionar Novo Termo */}
              <View className={styles.glossaryAddRow}>
                <TextInput
                  className={styles.glossaryInput}
                  placeholder="Original (ex: Neural Network)"
                  placeholderTextColor="#6b6b80"
                  value={newOriginalTerm}
                  onChangeText={setNewOriginalTerm}
                />
                <TextInput
                  className={styles.glossaryInput}
                  placeholder="Tradução (ex: Rede Neural)"
                  placeholderTextColor="#6b6b80"
                  value={newTranslatedTerm}
                  onChangeText={setNewTranslatedTerm}
                />
                <TouchableOpacity className={styles.glossarySaveBtn} onPress={handleAddTerm}>
                  <Text className={styles.glossarySaveBtnText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── 5. MODAL DE SELEÇÃO DE IDIOMA ── */}
      <Modal
        visible={showLangModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(null)}
      >
        <View className={styles.modalOverlay}>
          <View className={styles.langModalCard}>
            <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
              <Text className="text-[#e8e8f0] font-semibold text-sm">
                {showLangModal === "source" ? "Selecionar Idioma de Origem" : "Selecionar Idioma de Destino"}
              </Text>
              <TouchableOpacity onPress={() => setShowLangModal(null)}>
                <Feather name="x" size={14} color="#6b6b80" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-72">
              {AVAILABLE_LANGUAGES.filter(
                (l) => showLangModal === "source" || l.code !== "auto"
              ).map((lang) => {
                const isActive =
                  showLangModal === "source"
                    ? sourceLang === lang.code
                    : targetLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    className={styles.langOption}
                    onPress={() => {
                      if (showLangModal === "source") setSourceLang(lang.code);
                      else setTargetLang(lang.code);
                      setShowLangModal(null);
                    }}
                  >
                    <Text className={isActive ? styles.langOptionActiveText : styles.langOptionText}>
                      {lang.name}
                    </Text>
                    {isActive && <Feather name="check" size={12} color="#6b8cff" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
