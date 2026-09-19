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
  runPipelinePhase1,
  runPipelinePhase2,
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
  updateTranslationHistory,
  getTranslationHistory,
  deleteTranslationHistory,
  renameTranslationHistory,
  assignChatToGroup,
  getChatGroups,
  createChatGroup,
  renameChatGroup,
  deleteChatGroup,
  TranslationHistoryItem,
  ChatGroup,
} from "../controllers/historyController";

import LMenu from "../components/LMenu";
import RMenu from "../components/RMenu";
import LatexViewer from "../components/LatexViewer";
import { mainStyles as styles } from "../styles/mainStyles";
import { useLanguage } from "../context/LanguageContext";
import { AVAILABLE_TRANSLATION_LANGUAGES } from "../config/languages";

// Catálogo completo de idiomas suportados para tradução
const AVAILABLE_LANGUAGES = AVAILABLE_TRANSLATION_LANGUAGES;

interface UploadedFile {
  name: string;
  size: string;
  mimeType: string;
  base64: string;
}

export default function Index() {
  const router = useRouter();

  // Tema Claro / Escuro Global (Persistido no LocalStorage)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      return (window.localStorage.getItem("translatio_theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  const isLight = theme === "light";
  const { t } = useLanguage();

  const handleToggleTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("translatio_theme", newTheme);
    }
  };

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
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dropzoneRef = React.useRef<any>(null);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("pt-BR");
  const [promptInstructions, setPromptInstructions] = useState("");
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<AgenticPipelineProgress | null>(null);
  const [identifiedTerms, setIdentifiedTerms] = useState<TermDecision[]>([]);
  const [phase1Data, setPhase1Data] = useState<{
    rawCleanContent: string;
    formulasCount: number;
    identifiedTerms: TermDecision[];
    docTitle: string;
  } | null>(null);
  const [isPausedForTerms, setIsPausedForTerms] = useState(false);

  const [originalFullText, setOriginalFullText] = useState("");
  const [translatedFullText, setTranslatedFullText] = useState("");

  // Firestore Data
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
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

  // Carrega instrução padrão global se configurada no perfil
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("translatio_default_system_instruction");
      if (saved && !promptInstructions) {
        setPromptInstructions(saved);
      }
    }
  }, []);

  const loadUserData = async () => {
    const { terms } = await getGlossaryTerms();
    setGlossary(terms);

    const { items } = await getTranslationHistory();
    setHistory(items);

    const { groups: userGroups } = await getChatGroups();
    setGroups(userGroups);
  };

  // Processamento unificado de arquivo selecionado ou arrastado (PDF, Imagens, TEX, DOCX)
  const processSelectedFile = (file: File) => {
    if (!file) return;

    // Detecção segura do tipo MIME com fallback para extensão
    let mimeType = file.type;
    const nameLower = file.name.toLowerCase();
    if (!mimeType) {
      if (nameLower.endsWith(".pdf")) mimeType = "application/pdf";
      else if (nameLower.endsWith(".tex")) mimeType = "text/plain";
      else if (nameLower.endsWith(".txt") || nameLower.endsWith(".md")) mimeType = "text/plain";
      else if (nameLower.endsWith(".png")) mimeType = "image/png";
      else if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (nameLower.endsWith(".docx"))
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else mimeType = "application/pdf";
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(",")[1];
      const sizeStr =
        file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      setSelectedFile({
        name: file.name,
        size: sizeStr,
        mimeType: mimeType,
        base64: base64Data,
      });
      setInputText("");
    };
    reader.readAsDataURL(file);
  };

  // Seletor de Arquivos (PDF, Imagens, TEX, DOCX) via clique
  const handlePickDocument = () => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,image/*,.tex,.txt,.docx";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processSelectedFile(file);
      };
      input.click();
    } else {
      Alert.alert("Aviso", "Seletor nativo disponível.");
    }
  };

  // Remoção segura de arquivo anexado com confirmação em chats pausados
  const handleRemoveFile = async () => {
    if (isTranslating) return; // Bloqueado durante a execução do pipeline

    if (isPausedForTerms) {
      const confirmMsg = t("discardDocConfirm");
      const confirmed =
        typeof window !== "undefined" && window.confirm ? window.confirm(confirmMsg) : true;
      if (!confirmed) return;

      if (activeHistoryId) {
        await deleteTranslationHistory(activeHistoryId);
        setActiveHistoryId(null);
        loadUserData();
      }
      setIsPausedForTerms(false);
      setPipelineProgress(null);
      setPhase1Data(null);
      setIdentifiedTerms([]);
    }

    setSelectedFile(null);
  };

  // Suporte completo a Drag & Drop nativo de arquivos (PDF, TEX, etc.)
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    let windowDragCounter = 0;
    let dropzoneDragCounter = 0;

    const isFilesEvent = (e: DragEvent) => {
      if (!e.dataTransfer || !e.dataTransfer.types) return false;
      return Array.from(e.dataTransfer.types).includes("Files");
    };

    // 1. Intercepta eventos na janela para impedir que o navegador abra o arquivo
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (isFilesEvent(e)) {
        windowDragCounter++;
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      windowDragCounter--;
      if (windowDragCounter <= 0) {
        windowDragCounter = 0;
        setIsWindowDragging(false);
        setIsDragOverDropzone(false);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      windowDragCounter = 0;
      dropzoneDragCounter = 0;
      setIsWindowDragging(false);
      setIsDragOverDropzone(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        if (viewMode !== "new-chat") {
          setViewMode("new-chat");
          setActiveHistoryId(null);
        }
        processSelectedFile(files[0]);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);

    // 2. Ouvintes específicos para a Dropzone quando montada
    const getDropzoneEl = (): HTMLElement | null => {
      if (dropzoneRef.current) {
        if (typeof dropzoneRef.current.addEventListener === "function") {
          return dropzoneRef.current;
        }
      }
      if (typeof document !== "undefined") {
        return document.getElementById("translatio-dropzone");
      }
      return null;
    };

    const dropEl = getDropzoneEl();

    const handleDropzoneDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFilesEvent(e)) {
        dropzoneDragCounter++;
        setIsDragOverDropzone(true);
      }
    };

    const handleDropzoneDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      setIsDragOverDropzone(true);
    };

    const handleDropzoneDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneDragCounter--;
      if (dropzoneDragCounter <= 0) {
        dropzoneDragCounter = 0;
        setIsDragOverDropzone(false);
      }
    };

    const handleDropzoneDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneDragCounter = 0;
      windowDragCounter = 0;
      setIsDragOverDropzone(false);
      setIsWindowDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processSelectedFile(files[0]);
      }
    };

    if (dropEl) {
      dropEl.addEventListener("dragenter", handleDropzoneDragEnter);
      dropEl.addEventListener("dragover", handleDropzoneDragOver);
      dropEl.addEventListener("dragleave", handleDropzoneDragLeave);
      dropEl.addEventListener("drop", handleDropzoneDrop);
    }

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);

      if (dropEl) {
        dropEl.removeEventListener("dragenter", handleDropzoneDragEnter);
        dropEl.removeEventListener("dragover", handleDropzoneDragOver);
        dropEl.removeEventListener("dragleave", handleDropzoneDragLeave);
        dropEl.removeEventListener("drop", handleDropzoneDrop);
      }
    };
  }, [viewMode, selectedFile]);

  // Notificação de segurança e título dinâmico da aba durante a tradução
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    if (isTranslating) {
      const stepText = pipelineProgress ? `${pipelineProgress.step}/4` : "...";
      document.title = `⏳ (${stepText}) Traduzindo... | Translatio`;
    } else if (isPausedForTerms) {
      document.title = `⏸️ (Pausado: Termos) | Translatio`;
    } else {
      document.title = "Translatio - Tradução Científica LaTeX";
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTranslating) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isTranslating, isPausedForTerms, pipelineProgress]);

  // Dispara a Fase 1 do Pipeline Agêntico (Decomposição + Termos)
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
    setIsPausedForTerms(false);

    const docOriginal = hasFile && selectedFile
      ? `[Documento: ${selectedFile.name} (${selectedFile.size})]`
      : inputText.trim();

    const title = hasFile && selectedFile
      ? `Doc: ${selectedFile.name.substring(0, 26)}`
      : docOriginal.split("\n")[0].replace(/[\\[\]{}\\$]/g, "").substring(0, 30) || "Documento Traduzido";

    setOriginalFullText(docOriginal);

    // Executa Fase 1: Decomposição e Análise de Terminologia
    const phase1 = await runPipelinePhase1({
      text: hasFile ? undefined : docOriginal,
      fileBase64: hasFile ? selectedFile?.base64 : undefined,
      mimeType: hasFile ? selectedFile?.mimeType : undefined,
      fileName: hasFile ? selectedFile?.name : undefined,
      sourceLang,
      targetLang,
      onProgress: (progress) => {
        setPipelineProgress(progress);
      },
    });

    if (phase1.error) {
      setIsTranslating(false);
      setPipelineProgress(null);
      if (typeof window !== "undefined" && window.alert) {
        window.alert(`Erro no Pipeline Agêntico (Fase 1): ${phase1.error}`);
      } else {
        Alert.alert("Erro", phase1.error);
      }
      return;
    }

    // Guarda dados da Fase 1
    const p1Data = {
      rawCleanContent: phase1.rawCleanContent,
      formulasCount: phase1.formulasCount,
      identifiedTerms: phase1.identifiedTerms,
      docTitle: title,
    };
    setPhase1Data(p1Data);
    setIdentifiedTerms(phase1.identifiedTerms);

    // Se houver termos técnicos identificados, PAUSA para consulta humana (Human-in-the-Loop)
    if (phase1.identifiedTerms.length > 0) {
      setIsPausedForTerms(true);
      setRightOpen(true); // Abre o menu lateral na aba de termos automaticamente
      setPipelineProgress({
        step: 2,
        stepName: "Pausa: Consulta Terminológica (Human-in-the-Loop)",
        agentRole: "Linguista Computacional Técnico",
        detail: `Identificamos ${phase1.identifiedTerms.length} termos técnicos. Escolha as traduções desejadas no painel à direita e continue a tradução.`,
        discoveredTerms: phase1.identifiedTerms.map((t) => t.originalTerm),
        detectedFormulasCount: phase1.formulasCount,
        liveLogs: [
          `Fase 1 concluída: ${phase1.formulasCount} blocos de fórmulas mapeados.`,
          `⏸️ ${phase1.identifiedTerms.length} termos técnicos pendentes de validação humana...`,
        ],
        isPausedForTerms: true,
      });

      // SALVA O CHAT IMEDIATAMENTE NO HISTÓRICO COM STATUS 'paused_terms'
      // PARA GARANTIR PERMANÊNCIA MESMO SE O USUÁRIO SAIR DA TELA!
      try {
        const { id: newDocId } = await saveTranslationHistory(
          title,
          phase1.rawCleanContent,
          "",
          sourceLang,
          targetLang,
          null,
          null,
          "paused_terms",
          phase1.identifiedTerms,
          p1Data,
          promptInstructions
        );
        if (newDocId) {
          setActiveHistoryId(newDocId);
          await loadUserData();
        }
      } catch (e) {
        console.warn("Aviso ao salvar chat pausado no histórico:", e);
      }
    } else {
      // Se não houver termos ambíguos, prossegue direto para a Fase 2
      await handleExecutePhase2(phase1.rawCleanContent, phase1.formulasCount, [], title, null);
    }
  };

  // Continua o Pipeline Agêntico (Fase 2: Tradução e Validação) aplicando as decisões humanas
  const handleResumePhase2 = async (skipCustomDecisions = false) => {
    if (!phase1Data) return;
    setIsPausedForTerms(false);
    setIsTranslating(true);

    const userDecisionsToApply = skipCustomDecisions ? [] : identifiedTerms.filter((t) => t.selectedOption);
    await handleExecutePhase2(
      phase1Data.rawCleanContent,
      phase1Data.formulasCount,
      userDecisionsToApply,
      phase1Data.docTitle,
      activeHistoryId
    );
  };

  const handleExecutePhase2 = async (
    rawCleanContent: string,
    formulasCount: number,
    decisions: TermDecision[],
    title: string,
    existingHistoryId?: string | null
  ) => {
    const phase2 = await runPipelinePhase2({
      rawCleanContent,
      sourceLang,
      targetLang,
      glossary,
      userDecisions: decisions,
      customInstruction: promptInstructions,
      formulasCount,
      identifiedTerms,
      onProgress: (progress) => {
        setPipelineProgress(progress);
      },
    });

    setIsTranslating(false);
    setPipelineProgress(null);
    setIsPausedForTerms(false);

    if (phase2.error) {
      if (typeof window !== "undefined" && window.alert) {
        window.alert(`Erro no Pipeline Agêntico (Fase 2): ${phase2.error}`);
      } else {
        Alert.alert("Erro", phase2.error);
      }
      return;
    }

    setOriginalFullText(rawCleanContent);
    setTranslatedFullText(phase2.translatedLatex);
    setViewMode("reading");
    setRightOpen(true);

    try {
      const finalTerms = decisions.length > 0 ? decisions : identifiedTerms;
      if (existingHistoryId) {
        await updateTranslationHistory(existingHistoryId, {
          title,
          originalText: rawCleanContent,
          translatedText: phase2.translatedLatex,
          sourceLang,
          targetLang,
          status: "completed",
          identifiedTerms: finalTerms,
          customInstruction: promptInstructions,
        });
      } else {
        const { id: newId } = await saveTranslationHistory(
          title,
          rawCleanContent,
          phase2.translatedLatex,
          sourceLang,
          targetLang,
          null,
          null,
          "completed",
          finalTerms,
          null,
          promptInstructions
        );
        if (newId) setActiveHistoryId(newId);
      }
      await loadUserData();
    } catch (e) {
      console.error("[Translatio History] Erro ao salvar histórico:", e);
    }
  };

  // Aplica decisão de termo escolhida pelo usuário no chat do Copiloto
  const handleApplyTermDecision = async (term: TermDecision, chosenOption: string) => {
    // 1. Atualiza estado de termos identificados na memória
    const updatedTerms = identifiedTerms.map((t) =>
      t.id === term.id ? { ...t, selectedOption: chosenOption } : t
    );
    setIdentifiedTerms(updatedTerms);

    // 2. Persiste imediatamente a decisão no histórico do chat para permanência total!
    if (activeHistoryId) {
      try {
        await updateTranslationHistory(activeHistoryId, {
          identifiedTerms: updatedTerms,
        });
      } catch (e) {
        console.warn("Aviso ao salvar decisão de termo no histórico:", e);
      }
    }

    // 3. Atualiza o código LaTeX em tempo real (se já traduzido)
    if (translatedFullText) {
      try {
        const updatedLatex = await updateTranslationWithTermDecision(
          translatedFullText,
          { ...term, selectedOption: chosenOption },
          targetLang
        );
        setTranslatedFullText(updatedLatex);
        if (activeHistoryId) {
          await updateTranslationHistory(activeHistoryId, {
            translatedText: updatedLatex,
          });
        }
      } catch (e) {
        console.warn("Erro ao atualizar termo no documento:", e);
      }
    }

    // 4. Salva no Glossário permanente
    try {
      await addGlossaryTerm(term.originalTerm, chosenOption);
      const { terms } = await getGlossaryTerms();
      setGlossary(terms);
    } catch (e) {
      console.warn("Erro ao atualizar glossário:", e);
    }
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
      setOriginalFullText(item.originalText || "");
      setTranslatedFullText(item.translatedText || "");
      setSourceLang(item.sourceLang || "auto");
      setTargetLang(item.targetLang || "pt-BR");
      setPromptInstructions(item.customInstruction || "");

      // Restaura todos os termos identificados com as perguntas da IA e opções escolhidas
      const savedTerms = item.identifiedTerms || [];
      setIdentifiedTerms(savedTerms);

      if (item.status === "paused_terms") {
        setIsPausedForTerms(true);
        setIsTranslating(false);
        const p1 = item.phase1Data || {
          rawCleanContent: item.originalText,
          formulasCount: 0,
          identifiedTerms: savedTerms,
          docTitle: item.title,
        };
        setPhase1Data(p1);

        setPipelineProgress({
          step: 2,
          stepName: "Pausa: Consulta Terminológica (Human-in-the-Loop)",
          agentRole: "Linguista Computacional Técnico",
          detail: `Identificamos ${savedTerms.length} termos técnicos. Escolha as traduções desejadas no painel à direita e continue a tradução.`,
          discoveredTerms: savedTerms.map((t: any) => t.originalTerm),
          detectedFormulasCount: p1.formulasCount || 0,
          liveLogs: [
            `Fase 1 concluída: ${p1.formulasCount || 0} blocos de fórmulas mapeados.`,
            `⏸️ ${savedTerms.length} termos técnicos pendentes de validação humana...`,
          ],
          isPausedForTerms: true,
        });

        setViewMode("new-chat");
        setRightOpen(true);
      } else {
        setIsPausedForTerms(false);
        setPhase1Data(null);
        setPipelineProgress(null);
        setViewMode("reading");
      }

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

  const handleRenameHistory = async (id: string, newTitle: string) => {
    const { success, error } = await renameTranslationHistory(id, newTitle);
    if (success) {
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
      );
    } else if (error) {
      alert(error);
    }
  };

  const handleCreateGroup = async (name: string) => {
    const { group, error } = await createChatGroup(name);
    if (group) {
      setGroups((prev) => [...prev, group]);
    } else if (error) {
      alert(error);
    }
  };

  const handleRenameGroup = async (groupId: string, newName: string) => {
    const { success, error } = await renameChatGroup(groupId, newName, history);
    if (success) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g)));
      setHistory((prev) =>
        prev.map((item) => (item.groupId === groupId ? { ...item, groupName: newName } : item))
      );
    } else if (error) {
      alert(error);
    }
  };

  const handleDeleteGroup = async (groupId: string, deleteChatsCascade: boolean) => {
    const { success, error } = await deleteChatGroup(groupId, deleteChatsCascade, history);
    if (success) {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (deleteChatsCascade) {
        setHistory((prev) => prev.filter((item) => item.groupId !== groupId));
        if (activeHistoryId && history.find((h) => h.id === activeHistoryId)?.groupId === groupId) {
          setActiveHistoryId(null);
          setViewMode("new-chat");
        }
      } else {
        setHistory((prev) =>
          prev.map((item) =>
            item.groupId === groupId ? { ...item, groupId: null, groupName: null } : item
          )
        );
      }
    } else if (error) {
      alert(error);
    }
  };

  const handleAssignChatToGroup = async (
    chatId: string,
    groupId: string | null,
    groupName?: string | null
  ) => {
    const { success, error } = await assignChatToGroup(chatId, groupId, groupName);
    if (success) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === chatId ? { ...item, groupId: groupId || null, groupName: groupName || null } : item
        )
      );
    } else if (error) {
      alert(error);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  const getSourceLangName = () => {
    const found = AVAILABLE_LANGUAGES.find((l) => l.code === sourceLang);
    if (!found || found.code === "auto") return `✨ ${t("detectLanguage")}`;
    return `${found.flag} ${found.name}`;
  };

  const getTargetLangName = () => {
    const found = AVAILABLE_LANGUAGES.find((l) => l.code === targetLang);
    return found ? `${found.flag} ${found.name}` : "🇧🇷 Português (PT-BR)";
  };

  return (
    <SafeAreaView
      className={`flex-1 flex-row h-full overflow-hidden ${
        isLight ? "bg-[#f3f4f6]" : "bg-[#0c0c12]"
      }`}
    >
      {/* ── 1. MENU ESQUERDO (LMenu) COM SELETOR DE TEMA ── */}
      <LMenu
        isOpen={leftOpen}
        history={history}
        groups={groups}
        activeId={activeHistoryId}
        theme={theme}
        isTranslating={isTranslating}
        isPausedForTerms={isPausedForTerms}
        pipelineStep={pipelineProgress?.step}
        onToggleTheme={handleToggleTheme}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        onRenameHistory={handleRenameHistory}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onAssignChatToGroup={handleAssignChatToGroup}
        onImportCompleted={loadUserData}
        onNewTranslation={() => {
          if (isTranslating || isPausedForTerms) {
            setViewMode("new-chat");
            return;
          }
          setActiveHistoryId(null);
          setViewMode("new-chat");
          setInputText("");
          setSelectedFile(null);
          const savedPrompt = typeof window !== "undefined" && window.localStorage
            ? localStorage.getItem("translatio_default_system_instruction") || ""
            : "";
          setPromptInstructions(savedPrompt);
          setIdentifiedTerms([]);
        }}
        onLogout={handleLogout}
      />

      {/* TOGGLE ESQUERDO */}
      <View className="justify-center z-20">
        <TouchableOpacity
          className={
            isLight
              ? "w-5 h-12 bg-white border border-neutral-300 border-l-0 rounded-r-xl items-center justify-center cursor-pointer hover:bg-neutral-100 active:scale-95 transition-all shadow-sm"
              : styles.sideToggleBtnLeft
          }
          onPress={() => setLeftOpen(!leftOpen)}
        >
          <Feather
            name={leftOpen ? "chevron-left" : "chevron-right"}
            size={12}
            color={isLight ? "#4b5563" : "#6b6b80"}
          />
        </TouchableOpacity>
      </View>

      {/* ── 2. CONTEÚDO CENTRAL ── */}
      <View
        className={`flex-1 flex-col h-full transition-all duration-300 ${
          isLight ? "bg-[#f3f4f6]" : "bg-[#0c0c12]"
        }`}
      >
        {viewMode === "new-chat" ? (
          /* TELA INICIAL (NOVO CHAT DE TRADUÇÃO AGÊNTICA) */
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View className={styles.newChatContainer}>
              <Text
                className={`text-lg font-semibold tracking-tight text-center mb-1 ${
                  isLight ? "text-neutral-900" : "text-[#e8e8f0]"
                }`}
              >
                {t("heroTitle")}
              </Text>
              <Text
                className={`text-xs text-center mb-6 ${
                  isLight ? "text-neutral-500" : "text-[#6b6b80]"
                }`}
              >
                {t("heroSubtitle")}
              </Text>

              {/* SELETOR DE IDIOMAS EXPANSÍVEL */}
              <View
                className={`w-full flex-row items-center justify-between rounded-xl px-4 py-2.5 mb-3 transition-all shadow-sm ${
                  isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/[0.07]"
                }`}
              >
                <TouchableOpacity
                  className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all ${
                    isLight ? "bg-neutral-100 hover:bg-neutral-200" : "bg-white/[0.05] hover:bg-white/[0.08]"
                  }`}
                  onPress={() => setShowLangModal("source")}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isLight ? "text-neutral-800" : "text-[#c8c8d8]"
                    }`}
                  >
                    {getSourceLangName()}
                  </Text>
                  <Feather name="chevron-down" size={12} color={isLight ? "#6b7280" : "#6b6b80"} />
                </TouchableOpacity>

                <Feather name="arrow-right" size={12} color={isLight ? "#9ca3af" : "#6b6b80"} />

                <TouchableOpacity
                  className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all ${
                    isLight ? "bg-neutral-100 hover:bg-neutral-200" : "bg-white/[0.05] hover:bg-white/[0.08]"
                  }`}
                  onPress={() => setShowLangModal("target")}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isLight ? "text-neutral-800" : "text-[#c8c8d8]"
                    }`}
                  >
                    {getTargetLangName()}
                  </Text>
                  <Feather name="chevron-down" size={12} color={isLight ? "#6b7280" : "#6b6b80"} />
                </TouchableOpacity>
              </View>

              {/* ÁREA DE DROPZONE / UPLOAD DE DOCUMENTOS */}
              {selectedFile ? (
                <View
                  className={`w-full rounded-2xl p-5 mb-4 flex-row items-center justify-between border ${
                    isLight
                      ? "bg-white border-blue-200 shadow-sm"
                      : "bg-[#13131c] border-[#6b8cff]/30"
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-10 h-10 rounded-xl bg-[#6b8cff]/20 items-center justify-center mr-3">
                      <Feather name="file-text" size={18} color="#6b8cff" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-xs font-semibold ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}
                        numberOfLines={1}
                      >
                        {selectedFile.name}
                      </Text>
                      <Text
                        className={`text-[10px] mt-0.5 ${
                          isLight ? "text-neutral-500" : "text-[#6b6b80]"
                        }`}
                      >
                        {selectedFile.size} •{" "}
                        {isTranslating
                          ? t("fileTranslatingStatus")
                          : isPausedForTerms
                          ? t("statusPausedTerms")
                          : t("fileReadyStatus")}
                      </Text>
                    </View>
                  </View>

                  {/* Ações do Arquivo */}
                  {isTranslating ? (
                    <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#6b8cff]/10 border border-[#6b8cff]/25">
                      <ActivityIndicator size="small" color="#6b8cff" />
                      <Text className="text-[10px] text-[#6b8cff] font-medium">
                        {t("fileProcessingBadge")}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      className={`p-2 rounded-lg active:scale-95 transition-all ${
                        isLight
                          ? "bg-neutral-100 hover:bg-red-50 hover:border-red-200 border border-transparent"
                          : "bg-white/[0.05] hover:bg-red-500/10 hover:border-red-500/30 border border-transparent"
                      }`}
                      onPress={handleRemoveFile}
                      accessibilityLabel={t("removeFile")}
                    >
                      <Feather name="trash-2" size={13} color="#e05a6a" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View
                  nativeID="translatio-dropzone"
                  ref={dropzoneRef}
                  className="w-full mb-4"
                >
                  <TouchableOpacity
                    className={`w-full rounded-2xl border-2 border-dashed p-8 items-center justify-center transition-all duration-200 cursor-pointer ${
                      isDragOverDropzone
                        ? isLight
                          ? "bg-blue-100/70 border-blue-500 scale-[1.01] shadow-lg shadow-blue-500/20"
                          : "bg-[#6b8cff]/15 border-[#6b8cff] scale-[1.01] shadow-lg shadow-[#6b8cff]/25"
                        : isWindowDragging
                        ? isLight
                          ? "bg-blue-50/60 border-blue-400 animate-pulse"
                          : "bg-white/[0.04] border-[#6b8cff]/60 animate-pulse"
                        : isLight
                        ? "bg-white border-neutral-300 hover:border-blue-400 hover:bg-blue-50/40"
                        : styles.dropzone
                    }`}
                    onPress={handlePickDocument}
                    activeOpacity={0.8}
                  >
                    <View className="pointer-events-none items-center justify-center">
                      <View
                        className={`w-11 h-11 rounded-xl items-center justify-center mb-3 transition-transform duration-200 ${
                          isDragOverDropzone ? "scale-110" : ""
                        } ${
                          isLight
                            ? isDragOverDropzone
                              ? "bg-blue-200/80"
                              : "bg-blue-50"
                            : isDragOverDropzone
                            ? "bg-[#6b8cff]/30"
                            : styles.dropzoneIconBox
                        }`}
                      >
                        <Feather
                          name={isDragOverDropzone ? "arrow-down" : "upload"}
                          size={isDragOverDropzone ? 20 : 18}
                          color="#6b8cff"
                        />
                      </View>
                      <Text
                        className={`font-semibold text-xs text-center ${
                          isDragOverDropzone
                            ? "text-[#6b8cff]"
                            : isLight
                            ? "text-neutral-700"
                            : styles.dropzoneText
                        }`}
                      >
                        {isDragOverDropzone ? t("dropzoneActive") : t("dropzoneTitle")}
                      </Text>
                      <Text
                        className={`text-[10px] mt-0.5 text-center ${
                          isLight ? "text-neutral-500" : styles.dropzoneSubtext
                        }`}
                      >
                        {isDragOverDropzone
                          ? t("dropzoneFormats")
                          : `${t("dropzoneBrowse")} • ${t("dropzoneFormats")}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}


              {/* CONSOLE VISUAL DE PIPELINE AGÊNTICO EM TEMPO REAL */}
              {isTranslating && pipelineProgress && (
                <View
                  className={`w-full rounded-2xl p-5 mb-5 animate-smooth-fade shadow-xl border ${
                    isLight
                      ? "bg-white border-blue-200 shadow-blue-500/5"
                      : "bg-[#13131c] border-[#6b8cff]/30 shadow-black/60"
                  }`}
                >
                  {/* Top: Título do Pipeline e Status */}
                  <View className="flex-row items-center justify-between pb-3 mb-3.5 border-b border-white/[0.07]">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <Text
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isLight ? "text-blue-900" : "text-[#6b8cff]"
                        }`}
                      >
                        Pipeline Agêntico Multimodal Ativo
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 bg-[#6b8cff]/15 px-2.5 py-1 rounded-full border border-[#6b8cff]/30">
                      <ActivityIndicator size="small" color="#6b8cff" />
                      <Text className="text-[#6b8cff] text-[10px] font-mono font-bold">
                        Etapa {pipelineProgress.step} de 4 ({pipelineProgress.step * 25}%)
                      </Text>
                    </View>
                  </View>

                  {/* Aviso de Permanência na Aba */}
                  <View
                    className={`flex-row items-center gap-2.5 px-3 py-2 rounded-xl mb-3.5 border ${
                      isLight
                        ? "bg-blue-50/80 border-blue-200"
                        : "bg-blue-500/10 border-[#6b8cff]/20"
                    }`}
                  >
                    <Feather name="info" size={13} color="#6b8cff" />
                    <Text
                      className={`text-[11px] flex-1 leading-4 ${
                        isLight ? "text-blue-900" : "text-[#c8d4ff]"
                      }`}
                    >
                      <Text className="font-semibold">{t("keepTabOpenNotice")}</Text>
                    </Text>
                  </View>

                  {/* 4-Node Visual Stepper (Agente 1 a 4) */}
                  <View className="flex-row items-center justify-between mb-4 px-1">
                    {[
                      { num: 1, label: "Estrutura", icon: "layers" },
                      { num: 2, label: "Termos", icon: "book" },
                      { num: 3, label: "Tradução", icon: "globe" },
                      { num: 4, label: "Auditoria", icon: "shield" },
                    ].map((st, idx) => {
                      const isPast = pipelineProgress.step > st.num;
                      const isCurrent = pipelineProgress.step === st.num;
                      return (
                        <React.Fragment key={st.num}>
                          <View className="items-center flex-1">
                            <View
                              className={`w-8 h-8 rounded-full items-center justify-center transition-all ${
                                isPast
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                  : isCurrent
                                  ? "bg-[#6b8cff] shadow-lg shadow-[#6b8cff]/40 scale-110 ring-2 ring-[#6b8cff]/50"
                                  : isLight
                                  ? "bg-neutral-100 border border-neutral-300"
                                  : "bg-white/[0.05] border border-white/[0.08]"
                              }`}
                            >
                              {isPast ? (
                                <Feather name="check" size={13} color="#ffffff" />
                              ) : isCurrent ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Feather
                                  name={st.icon as any}
                                  size={11}
                                  color={isLight ? "#9ca3af" : "#6b6b80"}
                                />
                              )}
                            </View>
                            <Text
                              className={`text-[9px] font-medium mt-1.5 ${
                                isCurrent
                                  ? isLight
                                    ? "text-blue-900 font-bold"
                                    : "text-white font-bold"
                                  : isPast
                                  ? "text-emerald-500"
                                  : isLight
                                  ? "text-neutral-400"
                                  : "text-[#6b6b80]"
                              }`}
                            >
                              {st.label}
                            </Text>
                          </View>
                          {idx < 3 && (
                            <View
                              className={`h-0.5 flex-1 mb-4 transition-all ${
                                pipelineProgress.step > idx + 1
                                  ? "bg-emerald-500"
                                  : isLight
                                  ? "bg-neutral-200"
                                  : "bg-white/[0.08]"
                              }`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>

                  {/* Detalhe do Agente Atual em Ação */}
                  <View
                    className={`rounded-xl p-3.5 mb-3 border ${
                      isLight
                        ? "bg-blue-50/70 border-blue-100"
                        : "bg-white/[0.03] border-white/[0.06]"
                    }`}
                  >
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Feather name="cpu" size={12} color="#6b8cff" />
                      <Text className="text-[#6b8cff] text-[11px] font-bold">
                        {pipelineProgress.agentRole || "Agente Especialista"}
                      </Text>
                    </View>
                    <Text
                      className={`text-xs leading-relaxed font-medium ${
                        isLight ? "text-neutral-800" : "text-[#e8e8f0]"
                      }`}
                    >
                      {pipelineProgress.detail}
                    </Text>

                    {/* Live Activity Logs */}
                    {pipelineProgress.liveLogs && pipelineProgress.liveLogs.length > 0 && (
                      <View className="mt-2.5 pt-2 border-t border-white/[0.06] flex-col gap-1">
                        {pipelineProgress.liveLogs.map((log, lIdx) => (
                          <View key={lIdx} className="flex-row items-center gap-1.5">
                            <Text className="text-[#6b8cff] text-[10px] font-mono">›</Text>
                            <Text
                              className={`text-[10px] ${
                                isLight ? "text-neutral-600" : "text-[#a0a0b8]"
                              }`}
                            >
                              {log}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Termos Técnicos Identificados ao Vivo (Chips) */}
                  {pipelineProgress.discoveredTerms && pipelineProgress.discoveredTerms.length > 0 && (
                    <View className="mt-1 animate-smooth-fade">
                      <Text
                        className={`text-[9px] uppercase tracking-wider font-bold mb-1.5 ${
                          isLight ? "text-neutral-500" : "text-[#6b6b80]"
                        }`}
                      >
                        Termos Técnicos Identificados para o Copiloto:
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {pipelineProgress.discoveredTerms.slice(0, 8).map((term, tIdx) => (
                          <View
                            key={tIdx}
                            className="bg-[#6b8cff]/15 border border-[#6b8cff]/30 px-2.5 py-0.5 rounded-full"
                          >
                            <Text className="text-[#6b8cff] text-[10px] font-mono font-medium">
                              "{term}"
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Banner de Pausa Human-in-the-Loop com Botões de Ação */}
                  {isPausedForTerms && (
                    <View
                      className={`rounded-xl p-4 mt-3 border animate-smooth-pop ${
                        isLight
                          ? "bg-blue-50/90 border-blue-200"
                          : "bg-[#6b8cff]/15 border-[#6b8cff]/40 shadow-lg shadow-[#6b8cff]/10"
                      }`}
                    >
                      <View className="flex-row items-center gap-2 mb-2">
                        <View className="w-5 h-5 rounded-full bg-[#6b8cff] items-center justify-center">
                          <Feather name="help-circle" size={12} color="#ffffff" />
                        </View>
                        <Text className="text-xs font-bold text-[#6b8cff]">
                          Consulta Terminológica Interativa (Human-in-the-Loop)
                        </Text>
                      </View>
                      <Text
                        className={`text-xs leading-relaxed mb-3.5 ${
                          isLight ? "text-neutral-700" : "text-[#c8c8d8]"
                        }`}
                      >
                        O Agente Linguista pausou a tradução para consultar você sobre os termos técnicos encontrados. O painel à direita foi aberto para você escolher as traduções preferidas. Quando terminar ou se preferir o padrão, clique para continuar:
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          className="flex-1 py-2.5 px-3.5 rounded-xl bg-[#6b8cff] hover:bg-[#5b7ce8] active:scale-95 transition-all flex-row items-center justify-center gap-2 shadow-md shadow-[#6b8cff]/25"
                          onPress={() => handleResumePhase2(false)}
                        >
                          <Text className="text-white text-xs font-bold">
                            Continuar Tradução com minhas Decisões
                          </Text>
                          <Feather name="arrow-right" size={13} color="#ffffff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          className={`py-2.5 px-3.5 rounded-xl border active:scale-95 transition-all ${
                            isLight
                              ? "bg-white border-neutral-300 hover:bg-neutral-100"
                              : "bg-white/[0.06] border-white/10 hover:bg-white/[0.1]"
                          }`}
                          onPress={() => handleResumePhase2(true)}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              isLight ? "text-neutral-700" : "text-[#c8c8d8]"
                            }`}
                          >
                            Usar Padrão
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* CAIXA DE TEXTO / PROMPT / INSTRUÇÕES */}
              <View
                className={`w-full rounded-2xl overflow-hidden mb-4 shadow-sm transition-all border ${
                  isLight
                    ? "bg-white border-neutral-200 hover:border-neutral-300"
                    : styles.promptBox
                }`}
              >
                <TextInput
                  className={`w-full px-4 pt-3.5 pb-2 text-xs min-h-[90px] max-h-[160px] ${
                    isLight ? "text-neutral-900" : "text-[#e8e8f0]"
                  }`}
                  placeholder={
                    selectedFile
                      ? t("customInstructions")
                      : t("pasteOrType")
                  }
                  placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
                  value={selectedFile ? promptInstructions : inputText}
                  onChangeText={(val) => {
                    if (selectedFile) setPromptInstructions(val);
                    else setInputText(val);
                  }}
                  multiline
                  textAlignVertical="top"
                />
                <View
                  className={`flex-row items-center justify-between px-4 py-2.5 border-t ${
                    isLight ? "border-neutral-100 bg-neutral-50/50" : "border-white/[0.05]"
                  }`}
                >
                  <Text
                    className={`text-[10px] uppercase tracking-widest font-medium ${
                      isLight ? "text-neutral-400" : "text-[#6b6b80]"
                    }`}
                  >
                    {t("pipelineTitle")}
                  </Text>
                  <TouchableOpacity
                    className={
                      isTranslating || isPausedForTerms
                        ? styles.translateBtnDisabled
                        : styles.translateBtn
                    }
                    onPress={handleStartTranslation}
                    disabled={isTranslating || isPausedForTerms}
                  >
                    {isTranslating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Feather name="send" size={12} color="#ffffff" />
                        <Text className="text-white text-xs font-semibold">
                          {isPausedForTerms
                            ? "Pausado: Escolha os termos acima"
                            : isTranslating
                            ? t("translating")
                            : t("startTranslation")}
                        </Text>
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
              <View
                className={`flex-row items-center rounded-full p-1 shadow-lg transition-all duration-300 border ${
                  isLight
                    ? "bg-white border-neutral-200 shadow-neutral-300/40"
                    : "bg-[#13131c] border-white/[0.08] shadow-black/50"
                }`}
              >
                <TouchableOpacity
                  className={docTab === "translated" ? styles.pillTabActive : styles.pillTab}
                  onPress={() => setDocTab("translated")}
                >
                  <Text
                    className={
                      docTab === "translated"
                        ? styles.pillTabTextActive
                        : isLight
                        ? "text-neutral-600 text-xs font-medium"
                        : styles.pillTabText
                    }
                  >
                    {t("tabTranslated")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={docTab === "split" ? styles.pillTabActive : styles.pillTabIconBtn}
                  onPress={() => setDocTab("split")}
                  accessibilityLabel={t("tabSplit")}
                >
                  <Feather
                    name="columns"
                    size={13}
                    color={docTab === "split" ? "#ffffff" : isLight ? "#6b7280" : "#6b6b80"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  className={docTab === "original" ? styles.pillTabActive : styles.pillTab}
                  onPress={() => setDocTab("original")}
                >
                  <Text
                    className={
                      docTab === "original"
                        ? styles.pillTabTextActive
                        : isLight
                        ? "text-neutral-600 text-xs font-medium"
                        : styles.pillTabText
                    }
                  >
                    {t("tabOriginal")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PAINÉIS DE DOCUMENTO COM RENDERIZADOR LATEX */}
            <View
              className={`flex-1 flex-row gap-3 px-4 pb-4 overflow-hidden min-h-0 transition-all duration-300 ${
                isSwitchingDoc ? "opacity-25 scale-[0.99]" : "opacity-100 scale-100"
              }`}
            >
              {/* PAINEL TRADUZIDO */}
              <View
                className={`rounded-xl border overflow-hidden flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#13131c] border-white/[0.07]"
                } ${
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
                  theme={theme}
                />
              </View>

              {/* PAINEL ORIGINAL */}
              <View
                className={`rounded-xl border overflow-hidden flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#13131c] border-white/[0.07]"
                } ${
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
                  theme={theme}
                />
              </View>
            </View>
          </View>
        )}

        {/* BARRA FLUTUANTE DE TRADUÇÃO EM SEGUNDO PLANO (QUANDO NAVEGANDO FORA DO NOVO CHAT) */}
        {viewMode !== "new-chat" && (isTranslating || isPausedForTerms) && (
          <View
            className={`absolute bottom-6 self-center z-50 flex-row items-center gap-3 py-2.5 px-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
              isPausedForTerms
                ? isLight
                  ? "bg-amber-50/95 border-amber-300 shadow-amber-500/20"
                  : "bg-[#2a1d0f]/95 border-amber-500/40 shadow-black/80"
                : isLight
                ? "bg-white/95 border-blue-300 shadow-blue-500/20"
                : "bg-[#11162b]/95 border-[#6b8cff]/40 shadow-black/80"
            }`}
          >
            <View className="flex-row items-center gap-2">
              {isTranslating ? (
                <ActivityIndicator size="small" color="#6b8cff" />
              ) : (
                <Feather name="pause-circle" size={15} color="#f59e0b" />
              )}
              <View>
                <Text
                  className={`text-xs font-bold ${
                    isPausedForTerms
                      ? "text-amber-500"
                      : isLight
                      ? "text-blue-900"
                      : "text-[#6b8cff]"
                  }`}
                >
                  {isPausedForTerms
                    ? t("pausedTermsBtn")
                    : `${t("backgroundTranslatingNotice")} (${pipelineProgress?.step || 1}/4)`}
                </Text>
                <Text
                  className={`text-[10px] ${
                    isLight ? "text-neutral-500" : "text-[#8888a0]"
                  }`}
                >
                  {t("keepTabOpenNotice")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="py-1.5 px-3 rounded-xl bg-[#6b8cff] hover:bg-[#5b7ce8] active:scale-95 transition-all shadow-sm flex-row items-center gap-1.5"
              onPress={() => setViewMode("new-chat")}
            >
              <Text className="text-white text-xs font-semibold">{t("viewLiveProgress")}</Text>
              <Feather name="arrow-right" size={12} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TOGGLE DIREITO */}
      {viewMode === "reading" && (
        <View className="justify-center z-20">
          <TouchableOpacity
            className={
              isLight
                ? "w-5 h-12 bg-white border border-neutral-300 border-r-0 rounded-l-xl items-center justify-center cursor-pointer hover:bg-neutral-100 active:scale-95 transition-all shadow-sm"
                : styles.sideToggleBtnRight
            }
            onPress={() => setRightOpen(!rightOpen)}
          >
            <Feather
              name={rightOpen ? "chevron-right" : "chevron-left"}
              size={12}
              color={isLight ? "#4b5563" : "#6b6b80"}
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
        theme={theme}
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
          <View
            className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-smooth-pop border ${
              isLight ? "bg-white border-neutral-200" : "bg-[#13131c] border-white/10"
            }`}
          >
            <View
              className={`flex-row items-center justify-between px-6 py-4 border-b ${
                isLight ? "border-neutral-200" : "border-white/[0.07]"
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Feather name="book-open" size={14} color="#6b8cff" />
                <Text
                  className={`font-semibold text-sm ${
                    isLight ? "text-neutral-900" : "text-[#e8e8f0]"
                  }`}
                >
                  Glossário do Projeto
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGlossaryModal(false)}>
                <Feather name="x" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
              </TouchableOpacity>
            </View>

            <ScrollView className={styles.modalBody}>
              <View
                className={`flex-row justify-between pb-2 mb-2 border-b ${
                  isLight ? "border-neutral-200" : "border-white/[0.07]"
                }`}
              >
                <Text
                  className={`text-[10px] uppercase tracking-widest font-medium ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  Termo Original
                </Text>
                <Text
                  className={`text-[10px] uppercase tracking-widest font-medium ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  Tradução Forçada
                </Text>
              </View>

              {glossary.length === 0 ? (
                <Text
                  className={`text-xs py-6 text-center italic ${
                    isLight ? "text-neutral-400" : "text-[#6b6b80]"
                  }`}
                >
                  Nenhum termo personalizado no glossário.
                </Text>
              ) : (
                glossary.map((g) => (
                  <View
                    key={g.id}
                    className={`flex-row items-center justify-between py-2.5 border-b transition-colors ${
                      isLight
                        ? "border-neutral-100 hover:bg-neutral-50"
                        : "border-white/[0.04] hover:bg-white/[0.02]"
                    }`}
                  >
                    <Text
                      className={`text-xs font-mono flex-1 ${
                        isLight ? "text-neutral-800" : "text-[#c8c8d8]"
                      }`}
                    >
                      {g.original}
                    </Text>
                    <Text
                      className={`text-xs flex-1 ml-2 ${
                        isLight ? "text-neutral-600" : "text-white/70"
                      }`}
                    >
                      {g.translation}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteTerm(g.id)}>
                      <Text className="px-2 py-1 rounded text-red-500 text-xs hover:bg-red-500/10 active:scale-95 transition-all">
                        Excluir
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Adicionar Novo Termo */}
              <View
                className={`flex-row gap-2 mt-4 pt-3 border-t ${
                  isLight ? "border-neutral-200" : "border-white/[0.07]"
                }`}
              >
                <TextInput
                  className={`flex-1 rounded-lg px-3 py-2 text-xs border ${
                    isLight
                      ? "bg-neutral-50 border-neutral-200 text-neutral-900"
                      : "bg-white/[0.05] border-white/[0.08] text-white"
                  }`}
                  placeholder="Original (ex: Neural Network)"
                  placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
                  value={newOriginalTerm}
                  onChangeText={setNewOriginalTerm}
                />
                <TextInput
                  className={`flex-1 rounded-lg px-3 py-2 text-xs border ${
                    isLight
                      ? "bg-neutral-50 border-neutral-200 text-neutral-900"
                      : "bg-white/[0.05] border-white/[0.08] text-white"
                  }`}
                  placeholder="Tradução (ex: Rede Neural)"
                  placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
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
          <View
            className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5 border ${
              isLight ? "bg-white border-neutral-200" : "bg-[#13131c] border-white/10"
            }`}
          >
            <View
              className={`flex-row items-center justify-between pb-3 mb-3 border-b ${
                isLight ? "border-neutral-200" : "border-white/[0.07]"
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  isLight ? "text-neutral-900" : "text-[#e8e8f0]"
                }`}
              >
                {showLangModal === "source" ? t("selectSourceLangTitle") : t("selectTargetLangTitle")}
              </Text>
              <TouchableOpacity onPress={() => setShowLangModal(null)}>
                <Feather name="x" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-80">
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
                    className={`flex-row items-center justify-between p-2.5 rounded-xl mb-1 active:scale-[0.98] transition-all ${
                      isActive
                        ? "bg-[#6b8cff]/15 border border-[#6b8cff]/40"
                        : isLight
                        ? "hover:bg-neutral-100 border border-transparent"
                        : "hover:bg-white/[0.06] border border-transparent"
                    }`}
                    onPress={() => {
                      if (showLangModal === "source") setSourceLang(lang.code);
                      else setTargetLang(lang.code);
                      setShowLangModal(null);
                    }}
                  >
                    <View className="flex-row items-center gap-2.5">
                      <Text className="text-base">{lang.flag}</Text>
                      <Text
                        className={
                          isActive
                            ? styles.langOptionActiveText
                            : isLight
                            ? "text-neutral-800 text-xs font-medium"
                            : styles.langOptionText
                        }
                      >
                        {lang.name}
                      </Text>
                    </View>
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
