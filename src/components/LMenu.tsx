import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { menuStyles as styles } from "../styles/menuStyles";
import {
  TranslationHistoryItem,
  ChatGroup,
  exportUserDataAsJSON,
  importUserDataFromJSON,
} from "../controllers/historyController";
import { resetPassword } from "../controllers/authController";
import { auth } from "../controllers/firebaseConfig";
import { useLanguage } from "../context/LanguageContext";
import { UILanguage } from "../i18n/translations";

export interface LMenuProps {
  isOpen: boolean;
  history: TranslationHistoryItem[];
  groups?: ChatGroup[];
  activeId?: string | null;
  theme?: "dark" | "light";
  isTranslating?: boolean;
  isPausedForTerms?: boolean;
  pipelineStep?: number;
  onToggleTheme?: (theme: "dark" | "light") => void;
  onSelectHistory: (item: TranslationHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onRenameHistory?: (id: string, newTitle: string) => void;
  onCreateGroup?: (name: string) => Promise<void> | void;
  onRenameGroup?: (groupId: string, newName: string) => Promise<void> | void;
  onDeleteGroup?: (groupId: string, deleteChatsCascade: boolean) => Promise<void> | void;
  onAssignChatToGroup?: (chatId: string, groupId: string | null, groupName?: string | null) => Promise<void> | void;
  onImportCompleted?: () => void;
  onNewTranslation: () => void;
  onLogout: () => void;
}

export default function LMenu({
  isOpen,
  history,
  groups = [],
  activeId,
  theme = "dark",
  isTranslating = false,
  isPausedForTerms = false,
  pipelineStep,
  onToggleTheme,
  onSelectHistory,
  onDeleteHistory,
  onRenameHistory,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onAssignChatToGroup,
  onImportCompleted,
  onNewTranslation,
  onLogout,
}: LMenuProps) {
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const userEmail = auth.currentUser?.email || "Usuário";
  const userDisplayName = userEmail.split("@")[0];
  const userInitials = (userDisplayName || "U").substring(0, 2).toUpperCase();

  // Estados de busca e edição inline de chat
  const [searchQuery, setSearchQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Modais de exclusão e movimentação de chat
  const [pendingDeleteChat, setPendingDeleteChat] = useState<TranslationHistoryItem | null>(null);
  const [pendingMoveChat, setPendingMoveChat] = useState<TranslationHistoryItem | null>(null);

  // Modais de pastas / grupos
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);
  const [editGroupNameVal, setEditGroupNameVal] = useState("");
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<ChatGroup | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<{ [groupId: string]: boolean }>({});

  // Modais de Perfil & Idioma
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Estados do Menu de Usuário (Estatísticas, Instrução Padrão, Reset de Senha, Exportação, Importação)
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptSaved, setPromptSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [dataExported, setDataExported] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const isLight = theme === "light";

  // Carrega instrução padrão global salva
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("translatio_default_system_instruction") || "";
      setCustomPrompt(saved);
    }
  }, []);

  // Cálculo de Estatísticas da Conta
  const totalWords = history.reduce((acc, item) => {
    const origWords = item.originalText ? item.originalText.trim().split(/\s+/).filter(Boolean).length : 0;
    const transWords = item.translatedText ? item.translatedText.trim().split(/\s+/).filter(Boolean).length : 0;
    return acc + Math.max(origWords, transWords);
  }, 0);

  const usedLanguages = Array.from(
    new Set(
      history
        .map((item) => item.targetLang)
        .filter(Boolean)
        .map((l) => l.toUpperCase())
    )
  ).slice(0, 3);

  // Manipuladores de Grupo
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleCreateGroupSubmit = async () => {
    if (newGroupName.trim() && onCreateGroup) {
      await onCreateGroup(newGroupName.trim());
      setNewGroupName("");
      setShowCreateGroupModal(false);
    }
  };

  const handleRenameGroupSubmit = async () => {
    if (editingGroup && editGroupNameVal.trim() && onRenameGroup) {
      await onRenameGroup(editingGroup.id, editGroupNameVal.trim());
      setEditingGroup(null);
      setEditGroupNameVal("");
    }
  };

  const handleConfirmDeleteGroup = async (deleteChatsCascade: boolean) => {
    if (pendingDeleteGroup && onDeleteGroup) {
      await onDeleteGroup(pendingDeleteGroup.id, deleteChatsCascade);
      setPendingDeleteGroup(null);
    }
  };

  const handleAssignChat = async (groupId: string | null, groupName?: string | null) => {
    if (pendingMoveChat && pendingMoveChat.id && onAssignChatToGroup) {
      await onAssignChatToGroup(pendingMoveChat.id, groupId, groupName);
      setPendingMoveChat(null);
    }
  };

  const handleConfirmDeleteChat = () => {
    if (pendingDeleteChat?.id) {
      onDeleteHistory(pendingDeleteChat.id);
      setPendingDeleteChat(null);
    }
  };

  const handleSaveRename = (chatId?: string) => {
    if (chatId && editingTitle.trim() && onRenameHistory) {
      onRenameHistory(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  // Salvar Instrução Padrão Global
  const handleSaveCustomPrompt = () => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("translatio_default_system_instruction", customPrompt.trim());
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 3000);
    }
  };

  // Disparo de Redefinição de Senha
  const handleSendResetPassword = async () => {
    if (!auth.currentUser?.email) return;
    const { success } = await resetPassword(auth.currentUser.email);
    if (success) {
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    }
  };

  // Exportar dados LGPD
  const handleExportData = () => {
    exportUserDataAsJSON(userEmail, history, groups);
    setDataExported(true);
    setTimeout(() => setDataExported(false), 3000);
  };

  // Importar dados via arquivo JSON (Restore Backup)
  const handleTriggerImportFile = () => {
    if (typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const content = reader.result as string;
            const res = await importUserDataFromJSON(content);
            if (res.error) {
              setImportFeedback(`❌ ${res.error}`);
            } else {
              setImportFeedback(`✓ ${res.importedChats} chats, ${res.importedGroups} pastas`);
              onImportCompleted?.();
            }
          } catch (err: any) {
            setImportFeedback("❌ Erro ao ler arquivo.");
          } finally {
            setImporting(false);
            setTimeout(() => setImportFeedback(null), 5000);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  };

  const currentLangObj = availableLanguages.find((l) => l.code === language) || availableLanguages[0];

  // Filtro de histórico em tempo real
  const filteredHistory = history.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.sourceLang?.toLowerCase().includes(q) ||
      item.targetLang?.toLowerCase().includes(q) ||
      item.groupName?.toLowerCase().includes(q)
    );
  });

  // Chats desagrupados (sem pasta ou com pasta inexistente)
  const groupIds = new Set(groups.map((g) => g.id));
  const ungroupedChats = filteredHistory.filter((item) => !item.groupId || !groupIds.has(item.groupId));

  // Renderizador de Item de Chat individual
  const renderChatItem = (item: TranslationHistoryItem, inGroup: boolean = false) => {
    const isActive = activeId && item.id === activeId;
    const isEditingThis = editingChatId === item.id;

    return (
      <View
        key={item.id}
        className={`flex-row items-center justify-between p-2 rounded-lg mb-1 transition-all duration-200 ${
          inGroup ? "ml-3" : ""
        } ${
          isActive
            ? isLight
              ? "bg-blue-50 border border-blue-200 shadow-sm"
              : "bg-white/[0.08] border border-[#6b8cff]/40 shadow-sm"
            : isLight
            ? "hover:bg-neutral-200/60 border border-transparent"
            : "hover:bg-white/[0.05] border border-transparent"
        }`}
      >
        {isEditingThis ? (
          /* Edição Inline do Título */
          <View className="flex-row items-center flex-1 mr-1">
            <TextInput
              className={`flex-1 text-xs px-2 py-1 rounded-md border ${
                isLight
                  ? "bg-white border-blue-400 text-neutral-900"
                  : "bg-[#0c0c12] border-[#6b8cff] text-white"
              }`}
              value={editingTitle}
              onChangeText={setEditingTitle}
              autoFocus
              onSubmitEditing={() => handleSaveRename(item.id)}
            />
            <TouchableOpacity
              className="p-1.5 ml-1 rounded-md bg-[#6b8cff] active:scale-95"
              onPress={() => handleSaveRename(item.id)}
              accessibilityLabel={t("save")}
            >
              <Feather name="check" size={11} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-1.5 ml-1 rounded-md bg-white/[0.08] active:scale-95"
              onPress={() => setEditingChatId(null)}
              accessibilityLabel={t("cancel")}
            >
              <Feather name="x" size={11} color={isLight ? "#6b7280" : "#a0a0b8"} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Seleção do chat */}
            <TouchableOpacity
              className="flex-1 mr-1 py-0.5"
              onPress={() => onSelectHistory(item)}
            >
              <Text
                className={`text-xs font-normal ${
                  isActive
                    ? isLight
                      ? "text-blue-900 font-bold"
                      : "text-white font-medium"
                    : isLight
                    ? "text-neutral-800"
                    : "text-[#c8c8d8]"
                }`}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <View className="flex-row items-center flex-wrap gap-1.5 mt-0.5">
                <Text
                  className={`text-[9px] ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  {item.sourceLang?.toUpperCase()} → {item.targetLang?.toUpperCase()}
                </Text>
                {item.status === "paused_terms" && (
                  <View className="flex-row items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <Text className="text-[9px] font-semibold text-amber-500">
                      {t("statusPausedTerms")}
                    </Text>
                  </View>
                )}
                {searchQuery.trim().length > 0 && item.groupName && (
                  <Text className="text-[9px] text-[#6b8cff] bg-[#6b8cff]/10 px-1 rounded">
                    📁 {item.groupName}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Ações do Chat */}
            <View className="flex-row items-center gap-0.5">
              {/* Mover para Pasta */}
              <TouchableOpacity
                className={`w-6 h-6 rounded-md items-center justify-center transition-all ${
                  isLight ? "hover:bg-neutral-200" : "hover:bg-white/[0.08]"
                }`}
                onPress={() => setPendingMoveChat(item)}
                accessibilityLabel={t("moveToGroup")}
              >
                <Feather
                  name="folder"
                  size={11}
                  color={item.groupId ? "#6b8cff" : isLight ? "#9ca3af" : "#6b6b80"}
                />
              </TouchableOpacity>

              {/* Botão Editar Nome */}
              <TouchableOpacity
                className={`w-6 h-6 rounded-md items-center justify-center transition-all ${
                  isLight ? "hover:bg-neutral-200" : "hover:bg-white/[0.08]"
                }`}
                onPress={() => {
                  setEditingChatId(item.id || null);
                  setEditingTitle(item.title);
                }}
                accessibilityLabel={t("edit")}
              >
                <Feather
                  name="edit-2"
                  size={11}
                  color={isLight ? "#9ca3af" : "#6b6b80"}
                />
              </TouchableOpacity>

              {/* Botão de Lixeira */}
              <TouchableOpacity
                className="w-6 h-6 rounded-md items-center justify-center hover:bg-red-500/15 active:scale-95 transition-all"
                onPress={() => setPendingDeleteChat(item)}
                accessibilityLabel={t("delete")}
              >
                <Feather
                  name="trash-2"
                  size={11}
                  color={isLight ? "#9ca3af" : "#6b6b80"}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <View
      className={`h-full ${
        isLight ? "bg-[#f8f9fa] border-r border-[#e5e7eb]" : "bg-[#13131c] border-r border-white/[0.07]"
      } flex-col justify-between overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isOpen
          ? "w-64 opacity-100 translate-x-0"
          : "w-0 opacity-0 -translate-x-6 border-r-0 pointer-events-none"
      }`}
      style={{
        minWidth: isOpen ? 256 : 0,
        maxWidth: isOpen ? 256 : 0,
      }}
    >
      <View className="w-64 h-full flex-col justify-between flex-shrink-0">
        {/* Top Header: Logo, Novo Chat & Nova Pasta */}
        <View className="p-3 pb-2">
          {/* Logo Brand */}
          <View className="flex-row items-center gap-2 mb-3 px-1">
            <View className="w-6 h-6 rounded-lg bg-[#6b8cff] items-center justify-center shadow-sm">
              <Feather name="globe" size={13} color="#ffffff" />
            </View>
            <Text
              className={`text-sm font-bold tracking-tight ${
                isLight ? "text-neutral-900" : "text-white"
              }`}
            >
              {t("appName")}
            </Text>
          </View>

          {/* Botões Superiores: Novo Chat + Nova Pasta */}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-200 shadow-md ${
                isPausedForTerms
                  ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/25 border border-amber-400/50"
                  : isTranslating
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25 border border-emerald-400/50 animate-pulse"
                  : "bg-[#6b8cff] hover:bg-[#5b7ce8] active:scale-95 shadow-[#6b8cff]/20"
              }`}
              onPress={onNewTranslation}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : isPausedForTerms ? (
                <Feather name="pause-circle" size={13} color="#ffffff" />
              ) : (
                <Feather name="plus" size={13} color="#ffffff" />
              )}
              <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                {isPausedForTerms
                  ? t("pausedTermsBtn")
                  : isTranslating
                  ? `${t("translatingBtn")} ${pipelineStep ? `(${pipelineStep}/4)` : "..."}`
                  : t("newChat")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`p-2 rounded-xl border flex-row items-center justify-center active:scale-95 transition-all ${
                isLight
                  ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200"
                  : "bg-white/[0.05] hover:bg-white/[0.09] border-white/[0.08]"
              }`}
              onPress={() => setShowCreateGroupModal(true)}
              accessibilityLabel={t("newGroup")}
            >
              <Feather name="folder-plus" size={14} color={isLight ? "#4b5563" : "#a0a0b8"} />
            </TouchableOpacity>
          </View>

          {/* Barra de Pesquisa de Chats */}
          <View
            className={`flex-row items-center px-2.5 py-1.5 rounded-xl mt-2.5 border transition-all ${
              isLight
                ? "bg-neutral-100 border-neutral-200 focus-within:border-blue-300"
                : "bg-white/[0.04] border-white/[0.07] focus-within:border-[#6b8cff]/40"
            }`}
          >
            <Feather name="search" size={12} color={isLight ? "#9ca3af" : "#6b6b80"} />
            <TextInput
              className={`flex-1 ml-2 text-xs py-0.5 ${
                isLight ? "text-neutral-900" : "text-white"
              }`}
              placeholder={t("search")}
              placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={12} color={isLight ? "#9ca3af" : "#6b6b80"} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Seção Histórico com Pastas / Grupos */}
        <View className="flex-1 px-3 py-1 overflow-hidden">
          <View className="flex-row items-center justify-between px-2 mb-2">
            <Text
              className={`text-[9px] uppercase font-bold tracking-wider ${
                isLight ? "text-neutral-400" : "text-[#6b6b80]"
              }`}
            >
              {searchQuery.trim().length > 0 ? "Resultados da Busca" : t("recentHistory")}
            </Text>
            {searchQuery.trim().length > 0 && (
              <Text className="text-[9px] text-[#6b8cff] font-medium">
                {filteredHistory.length} encontrados
              </Text>
            )}
          </View>

          {/* Lista de Histórico e Pastas */}
          <ScrollView className={styles.historyList} showsVerticalScrollIndicator={false}>
            {filteredHistory.length === 0 ? (
              <Text
                className={`text-[11px] px-2 py-4 italic ${
                  isLight ? "text-neutral-400" : "text-[#6b6b80]"
                }`}
              >
                {searchQuery.trim().length > 0
                  ? "Nenhum chat encontrado com este termo."
                  : t("noHistory")}
              </Text>
            ) : searchQuery.trim().length > 0 ? (
              /* Modo Busca: Lista Linear de Todos os Resultados */
              filteredHistory.map((item) => renderChatItem(item, false))
            ) : (
              /* Modo Normal: Pastas / Grupos + Chats Desagrupados */
              <>
                {/* 1. PASTAS / GRUPOS */}
                {groups.map((group) => {
                  const chatsInGroup = filteredHistory.filter((item) => item.groupId === group.id);
                  const isCollapsed = collapsedGroups[group.id] || false;

                  return (
                    <View key={group.id} className="mb-2">
                      {/* Cabeçalho da Pasta */}
                      <View
                        className={`flex-row items-center justify-between px-2 py-1.5 rounded-lg transition-all ${
                          isLight
                            ? "bg-neutral-100/80 hover:bg-neutral-200/70 border border-neutral-200/60"
                            : "bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05]"
                        }`}
                      >
                        <TouchableOpacity
                          className="flex-row items-center flex-1 mr-1 py-0.5"
                          onPress={() => toggleGroupCollapse(group.id)}
                        >
                          <Feather
                            name={isCollapsed ? "chevron-right" : "chevron-down"}
                            size={11}
                            color={isLight ? "#6b7280" : "#a0a0b8"}
                            style={{ marginRight: 4 }}
                          />
                          <Feather name="folder" size={12} color="#6b8cff" style={{ marginRight: 6 }} />
                          <Text
                            className={`text-xs font-semibold truncate flex-1 ${
                              isLight ? "text-neutral-800" : "text-[#e8e8f0]"
                            }`}
                            numberOfLines={1}
                          >
                            {group.name}
                          </Text>
                          <View className="bg-[#6b8cff]/20 px-1.5 py-0.2 rounded-full ml-1">
                            <Text className="text-[9px] text-[#6b8cff] font-bold">
                              {chatsInGroup.length}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Ações da Pasta: Renomear & Excluir */}
                        <View className="flex-row items-center gap-0.5">
                          <TouchableOpacity
                            className="p-1 rounded hover:bg-white/[0.1] active:scale-95"
                            onPress={() => {
                              setEditingGroup(group);
                              setEditGroupNameVal(group.name);
                            }}
                            accessibilityLabel={t("renameGroupTitle")}
                          >
                            <Feather name="edit-2" size={10} color={isLight ? "#9ca3af" : "#6b6b80"} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="p-1 rounded hover:bg-red-500/15 active:scale-95"
                            onPress={() => setPendingDeleteGroup(group)}
                            accessibilityLabel={t("deleteGroupTitle")}
                          >
                            <Feather name="trash-2" size={10} color={isLight ? "#9ca3af" : "#6b6b80"} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Lista de Chats dentro da Pasta */}
                      {!isCollapsed && (
                        <View className="mt-1">
                          {chatsInGroup.length === 0 ? (
                            <Text
                              className={`text-[10px] pl-6 py-1 italic ${
                                isLight ? "text-neutral-400" : "text-[#6b6b80]"
                              }`}
                            >
                              Pasta vazia
                            </Text>
                          ) : (
                            chatsInGroup.map((item) => renderChatItem(item, true))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* 2. CHATS SEM PASTA */}
                {ungroupedChats.length > 0 && (
                  <View className="mt-2">
                    {groups.length > 0 && (
                      <View className="px-2 py-1 mb-1">
                        <Text
                          className={`text-[9px] uppercase font-bold tracking-wider ${
                            isLight ? "text-neutral-400" : "text-[#6b6b80]"
                          }`}
                        >
                          {t("ungroupedChats")} ({ungroupedChats.length})
                        </Text>
                      </View>
                    )}
                    {ungroupedChats.map((item) => renderChatItem(item, false))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* Footer: Menu do Usuário, Idioma do Site (Globo) & Logout */}
        <View
          className={`p-3 border-t flex-row items-center justify-between ${
            isLight ? "border-neutral-200 bg-white" : "border-white/[0.07] bg-[#13131c]"
          }`}
        >
          {/* Botão Perfil do Usuário */}
          <TouchableOpacity
            className="flex-row items-center flex-1 mr-1 p-1.5 rounded-lg hover:bg-white/[0.05] active:scale-95 transition-all"
            onPress={() => setShowProfileModal(true)}
            accessibilityLabel={t("userProfile")}
          >
            <View className="w-6 h-6 rounded-full bg-[#6b8cff]/20 items-center justify-center mr-2 border border-[#6b8cff]/30">
              <Text className="text-[10px] font-bold text-[#6b8cff]">{userInitials}</Text>
            </View>
            <Text
              className={`text-xs font-medium truncate ${
                isLight ? "text-neutral-800" : "text-[#e8e8f0]"
              }`}
              numberOfLines={1}
            >
              {userDisplayName}
            </Text>
          </TouchableOpacity>

          {/* Botão Idioma do Site (Globo) */}
          <TouchableOpacity
            className={`p-2 rounded-lg mr-1 active:scale-90 transition-all ${
              isLight ? "hover:bg-neutral-100" : "hover:bg-white/[0.08]"
            }`}
            onPress={() => setShowLanguageModal(true)}
            accessibilityLabel={`${t("interfaceLanguage")}: ${currentLangObj.nativeName}`}
          >
            <View className="flex-row items-center gap-1">
              <Feather name="globe" size={13} color={isLight ? "#4b5563" : "#9ca3af"} />
              <Text className="text-[11px]">{currentLangObj.flag}</Text>
            </View>
          </TouchableOpacity>

          {/* Botão Sair */}
          <TouchableOpacity
            className="p-2 rounded-lg hover:bg-red-500/10 active:scale-90 transition-all"
            onPress={onLogout}
            accessibilityLabel={t("logout")}
          >
            <Feather name="log-out" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MODAL: CRIAR NOVA PASTA ── */}
      <Modal
        visible={showCreateGroupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 overflow-hidden shadow-2xl ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Feather name="folder-plus" size={16} color="#6b8cff" />
              <Text className={`font-semibold text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>
                {t("createGroupTitle")}
              </Text>
            </View>

            <TextInput
              className={`w-full text-xs p-3 rounded-xl border mb-4 ${
                isLight
                  ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-blue-500"
                  : "bg-white/[0.05] border-white/10 text-white focus:border-[#6b8cff]"
              }`}
              placeholder={t("groupNamePlaceholder")}
              placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
              onSubmitEditing={handleCreateGroupSubmit}
            />

            <View className="flex-row items-center justify-end gap-2">
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg active:scale-95 ${
                  isLight ? "bg-neutral-100" : "bg-white/[0.05]"
                }`}
                onPress={() => setShowCreateGroupModal(false)}
              >
                <Text className={`text-xs ${isLight ? "text-neutral-700" : "text-[#c8c8d8]"}`}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-[#6b8cff] active:scale-95 shadow-md shadow-[#6b8cff]/20"
                onPress={handleCreateGroupSubmit}
              >
                <Text className="text-white text-xs font-semibold">{t("create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: RENOMEAR PASTA ── */}
      <Modal
        visible={editingGroup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingGroup(null)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 overflow-hidden shadow-2xl ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Feather name="edit-2" size={15} color="#6b8cff" />
              <Text className={`font-semibold text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>
                {t("renameGroupTitle")}
              </Text>
            </View>

            <TextInput
              className={`w-full text-xs p-3 rounded-xl border mb-4 ${
                isLight
                  ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-blue-500"
                  : "bg-white/[0.05] border-white/10 text-white focus:border-[#6b8cff]"
              }`}
              value={editGroupNameVal}
              onChangeText={setEditGroupNameVal}
              autoFocus
              onSubmitEditing={handleRenameGroupSubmit}
            />

            <View className="flex-row items-center justify-end gap-2">
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg active:scale-95 ${
                  isLight ? "bg-neutral-100" : "bg-white/[0.05]"
                }`}
                onPress={() => setEditingGroup(null)}
              >
                <Text className={`text-xs ${isLight ? "text-neutral-700" : "text-[#c8c8d8]"}`}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-[#6b8cff] active:scale-95"
                onPress={handleRenameGroupSubmit}
              >
                <Text className="text-white text-xs font-semibold">{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: EXCLUSÃO DE PASTA COM ESCOLHA DE CASCATA OU DESAGRUPAMENTO ── */}
      <Modal
        visible={pendingDeleteGroup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDeleteGroup(null)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 overflow-hidden shadow-2xl ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-8 h-8 rounded-full bg-red-500/15 items-center justify-center">
                <Feather name="folder-minus" size={15} color="#e05a6a" />
              </View>
              <Text className={`font-semibold text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>
                {t("deleteGroupTitle")}
              </Text>
            </View>

            <Text className={`text-xs leading-relaxed mb-4 ${isLight ? "text-neutral-600" : "text-[#a0a0b8]"}`}>
              {t("deleteGroupPrompt", { name: pendingDeleteGroup?.name || "" })}
            </Text>

            {/* Opções de exclusão */}
            <View className="gap-2 mb-3">
              {/* Opção 1: Excluir pasta e chats (Cascata) */}
              <TouchableOpacity
                className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex-row items-center gap-2.5 active:scale-98"
                onPress={() => handleConfirmDeleteGroup(true)}
              >
                <Feather name="trash-2" size={14} color="#e05a6a" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-[#e05a6a]">
                    {t("deleteGroupCascade")}
                  </Text>
                  <Text className="text-[10px] text-red-400/80">
                    Apaga permanentemente a pasta e todos os documentos nela
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Opção 2: Excluir apenas a pasta (Manter Chats) */}
              <TouchableOpacity
                className={`p-3 rounded-xl border flex-row items-center gap-2.5 active:scale-98 ${
                  isLight
                    ? "bg-neutral-100 border-neutral-200 hover:bg-neutral-200"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                }`}
                onPress={() => handleConfirmDeleteGroup(false)}
              >
                <Feather name="folder" size={14} color="#6b8cff" />
                <View className="flex-1">
                  <Text className={`text-xs font-semibold ${isLight ? "text-neutral-900" : "text-white"}`}>
                    {t("deleteGroupOnly")}
                  </Text>
                  <Text className={`text-[10px] ${isLight ? "text-neutral-500" : "text-[#a0a0b8]"}`}>
                    Move os chats para fora da pasta sem apagá-los
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Cancelar */}
            <TouchableOpacity
              className={`w-full py-2 rounded-lg items-center active:scale-95 ${
                isLight ? "bg-neutral-100" : "bg-white/[0.05]"
              }`}
              onPress={() => setPendingDeleteGroup(null)}
            >
              <Text className={`text-xs ${isLight ? "text-neutral-700" : "text-[#c8c8d8]"}`}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: MOVER CHAT PARA PASTA ── */}
      <Modal
        visible={pendingMoveChat !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingMoveChat(null)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 overflow-hidden shadow-2xl ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            <View className="flex-row items-center justify-between pb-2 mb-3 border-b border-white/10">
              <View className="flex-row items-center gap-2">
                <Feather name="folder" size={15} color="#6b8cff" />
                <Text className={`font-semibold text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>
                  {t("moveToGroup")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPendingMoveChat(null)}>
                <Feather name="x" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
              </TouchableOpacity>
            </View>

            <Text className={`text-xs mb-3 italic ${isLight ? "text-neutral-600" : "text-[#a0a0b8]"}`} numberOfLines={1}>
              Documento: "{pendingMoveChat?.title}"
            </Text>

            <ScrollView className="max-h-56 gap-1 mb-3" showsVerticalScrollIndicator={false}>
              {/* Opção Remover do Grupo / Sem Pasta */}
              <TouchableOpacity
                className={`p-2.5 rounded-xl border flex-row items-center justify-between mb-1.5 active:scale-98 ${
                  !pendingMoveChat?.groupId
                    ? "bg-[#6b8cff]/15 border-[#6b8cff]/50"
                    : isLight
                    ? "bg-neutral-50 border-neutral-200"
                    : "bg-white/[0.03] border-white/10"
                }`}
                onPress={() => handleAssignChat(null, null)}
              >
                <View className="flex-row items-center gap-2">
                  <Feather name="minus-circle" size={13} color={isLight ? "#6b7280" : "#a0a0b8"} />
                  <Text className={`text-xs ${isLight ? "text-neutral-800" : "text-[#c8c8d8]"}`}>
                    {t("removeFromGroup")}
                  </Text>
                </View>
                {!pendingMoveChat?.groupId && <Feather name="check" size={13} color="#6b8cff" />}
              </TouchableOpacity>

              {/* Lista de Pastas Existentes */}
              {groups.map((grp) => {
                const isSelected = pendingMoveChat?.groupId === grp.id;
                return (
                  <TouchableOpacity
                    key={grp.id}
                    className={`p-2.5 rounded-xl border flex-row items-center justify-between mb-1.5 active:scale-98 ${
                      isSelected
                        ? "bg-[#6b8cff]/15 border-[#6b8cff]/50"
                        : isLight
                        ? "bg-neutral-50 border-neutral-200"
                        : "bg-white/[0.03] border-white/10"
                    }`}
                    onPress={() => handleAssignChat(grp.id, grp.name)}
                  >
                    <View className="flex-row items-center gap-2">
                      <Feather name="folder" size={13} color="#6b8cff" />
                      <Text
                        className={`text-xs ${
                          isSelected
                            ? "text-[#6b8cff] font-bold"
                            : isLight
                            ? "text-neutral-800"
                            : "text-[#e8e8f0]"
                        }`}
                      >
                        {grp.name}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={13} color="#6b8cff" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Criar nova pasta direto daqui */}
            <TouchableOpacity
              className="flex-row items-center justify-center gap-1.5 py-2 rounded-lg bg-[#6b8cff]/15 border border-[#6b8cff]/30 active:scale-95"
              onPress={() => {
                setPendingMoveChat(null);
                setShowCreateGroupModal(true);
              }}
            >
              <Feather name="folder-plus" size={12} color="#6b8cff" />
              <Text className="text-xs text-[#6b8cff] font-medium">{t("newGroup")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE CHAT ── */}
      <Modal
        visible={pendingDeleteChat !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDeleteChat(null)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 overflow-hidden shadow-2xl ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            <View className="flex-row items-center gap-2.5 mb-3">
              <View className="w-8 h-8 rounded-full bg-red-500/15 items-center justify-center">
                <Feather name="trash-2" size={14} color="#e05a6a" />
              </View>
              <Text className={`font-semibold text-sm ${isLight ? "text-neutral-900" : "text-[#e8e8f0]"}`}>
                {t("deleteChatTitle")}
              </Text>
            </View>

            <Text className={`text-xs leading-relaxed mb-5 ${isLight ? "text-neutral-600" : "text-[#a0a0b8]"}`}>
              {t("deleteChatConfirm", { title: pendingDeleteChat?.title || "" })}
            </Text>

            <View className="flex-row items-center justify-end gap-2">
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg active:scale-95 ${
                  isLight ? "bg-neutral-100 hover:bg-neutral-200" : "bg-white/[0.05] hover:bg-white/[0.08]"
                }`}
                onPress={() => setPendingDeleteChat(null)}
              >
                <Text className={`text-xs font-medium ${isLight ? "text-neutral-700" : "text-[#c8c8d8]"}`}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 active:scale-95"
                onPress={handleConfirmDeleteChat}
              >
                <Text className="text-[#e05a6a] text-xs font-semibold">{t("delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: SELEÇÃO DE IDIOMA DA INTERFACE (GLOBO) ── */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 overflow-hidden shadow-2xl ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            <View
              className={`flex-row items-center justify-between pb-3 mb-3 border-b ${
                isLight ? "border-neutral-200" : "border-white/[0.07]"
              }`}
            >
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg bg-[#6b8cff]/20 items-center justify-center">
                  <Feather name="globe" size={14} color="#6b8cff" />
                </View>
                <Text className={`font-semibold text-sm ${isLight ? "text-neutral-900" : "text-[#e8e8f0]"}`}>
                  {t("interfaceLanguage")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Feather name="x" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
              </TouchableOpacity>
            </View>

            <View className="gap-1.5 my-2">
              {availableLanguages.map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <TouchableOpacity
                    key={langItem.code}
                    className={`flex-row items-center justify-between p-3 rounded-xl border transition-all active:scale-98 ${
                      isSelected
                        ? "bg-[#6b8cff]/15 border-[#6b8cff]/50"
                        : isLight
                        ? "bg-neutral-50 border-neutral-200 hover:bg-neutral-100"
                        : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                    onPress={() => {
                      setLanguage(langItem.code as UILanguage);
                      setShowLanguageModal(false);
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="text-lg">{langItem.flag}</Text>
                      <View>
                        <Text
                          className={`text-xs font-medium ${
                            isSelected
                              ? "text-[#6b8cff] font-bold"
                              : isLight
                              ? "text-neutral-800"
                              : "text-[#e8e8f0]"
                          }`}
                        >
                          {langItem.nativeName}
                        </Text>
                        <Text className={`text-[10px] ${isLight ? "text-neutral-500" : "text-[#6b6b80]"}`}>
                          {langItem.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Feather name="check" size={14} color="#6b8cff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              className={`w-full mt-3 py-2 rounded-lg items-center active:scale-95 ${
                isLight ? "bg-neutral-100" : "bg-white/[0.05]"
              }`}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text className={`text-xs font-medium ${isLight ? "text-neutral-800" : "text-[#c8c8d8]"}`}>
                {t("close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: PERFIL DO USUÁRIO & RECURSOS AVANÇADOS ── */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <View
            className={`w-full max-w-md rounded-2xl p-6 overflow-hidden shadow-2xl max-h-[90vh] ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            {/* Header Modal */}
            <View
              className={`flex-row items-center justify-between pb-3 mb-4 border-b ${
                isLight ? "border-neutral-200" : "border-white/[0.07]"
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Feather name="user" size={15} color="#6b8cff" />
                <Text className={`font-semibold text-sm ${isLight ? "text-neutral-900" : "text-[#e8e8f0]"}`}>
                  {t("userProfile")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Feather name="x" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="pr-1">
              {/* Avatar & Identificação */}
              <View className="items-center py-2 mb-3">
                <View className="w-14 h-14 rounded-full bg-[#6b8cff]/20 items-center justify-center mb-2 border-2 border-[#6b8cff]/40 shadow-sm">
                  <Text className="text-xl font-bold text-[#6b8cff]">{userInitials}</Text>
                </View>
                <Text className={`font-semibold text-base ${isLight ? "text-neutral-900" : "text-[#e8e8f0]"}`}>
                  {userDisplayName}
                </Text>
                <Text className={`text-xs mt-0.5 ${isLight ? "text-neutral-500" : "text-[#6b6b80]"}`}>
                  {userEmail}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-2 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <Feather name="check-circle" size={11} color="#10b981" />
                  <Text className="text-[10px] text-emerald-500 font-medium">Conta Ativa e Protegida</Text>
                </View>
              </View>

              {/* 1. ESTATÍSTICAS DA CONTA */}
              <View className="mb-4">
                <Text
                  className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  {t("userStatsTitle")}
                </Text>
                <View
                  className={`flex-row rounded-xl p-3 border justify-between items-center ${
                    isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.03] border-white/[0.06]"
                  }`}
                >
                  <View className="items-center flex-1">
                    <Text className="text-base font-bold text-[#6b8cff]">{history.length}</Text>
                    <Text className={`text-[10px] ${isLight ? "text-neutral-500" : "text-[#8a8a9e]"}`}>
                      {t("totalChats")}
                    </Text>
                  </View>
                  <View className={`w-px h-8 ${isLight ? "bg-neutral-200" : "bg-white/10"}`} />
                  <View className="items-center flex-1">
                    <Text className="text-base font-bold text-[#6b8cff]">
                      {totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
                    </Text>
                    <Text className={`text-[10px] ${isLight ? "text-neutral-500" : "text-[#8a8a9e]"}`}>
                      Palavras Traduzidas
                    </Text>
                  </View>
                  <View className={`w-px h-8 ${isLight ? "bg-neutral-200" : "bg-white/10"}`} />
                  <View className="items-center flex-1">
                    <Text className="text-base font-bold text-[#6b8cff]">
                      {usedLanguages.length > 0 ? usedLanguages.join(", ") : "PT-BR"}
                    </Text>
                    <Text className={`text-[10px] ${isLight ? "text-neutral-500" : "text-[#8a8a9e]"}`}>
                      {t("favoriteLangs")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. INSTRUÇÃO PADRÃO GLOBAL (PROMPT) */}
              <View className="mb-4">
                <Text
                  className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  {t("customPromptTitle")}
                </Text>
                <View
                  className={`rounded-xl border p-2 ${
                    isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.03] border-white/[0.06]"
                  }`}
                >
                  <TextInput
                    className={`text-xs p-1 mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}
                    placeholder={t("customPromptPlaceholder")}
                    placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
                    value={customPrompt}
                    onChangeText={setCustomPrompt}
                    multiline
                    numberOfLines={2}
                  />
                  <View className="flex-row items-center justify-between">
                    {promptSaved ? (
                      <Text className="text-[10px] text-emerald-500 font-medium">
                        ✓ {t("customPromptSaved")}
                      </Text>
                    ) : (
                      <View />
                    )}
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-lg bg-[#6b8cff] active:scale-95 flex-row items-center gap-1"
                      onPress={handleSaveCustomPrompt}
                    >
                      <Feather name="save" size={11} color="#ffffff" />
                      <Text className="text-white text-[11px] font-semibold">{t("save")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 3. TEMA (CLARO / ESCURO) */}
              <View className="mb-4">
                <Text
                  className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  {t("theme")}
                </Text>
                <View
                  className={`flex-row rounded-xl p-1 border ${
                    isLight ? "bg-neutral-100 border-neutral-200" : "bg-white/[0.05] border-white/[0.06]"
                  }`}
                >
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-1.5 transition-all ${
                      !isLight ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30" : "bg-transparent"
                    }`}
                    onPress={() => onToggleTheme?.("dark")}
                  >
                    <Feather name="moon" size={12} color={!isLight ? "#ffffff" : "#6b7280"} />
                    <Text
                      className={`text-xs font-medium ${
                        !isLight ? "text-white font-semibold" : "text-neutral-600"
                      }`}
                    >
                      {t("themeDark")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-1.5 transition-all ${
                      isLight ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30" : "bg-transparent"
                    }`}
                    onPress={() => onToggleTheme?.("light")}
                  >
                    <Feather name="sun" size={12} color={isLight ? "#ffffff" : "#9ca3af"} />
                    <Text
                      className={`text-xs font-medium ${
                        isLight ? "text-white font-semibold" : "text-neutral-400"
                      }`}
                    >
                      {t("themeLight")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. IDIOMA DA INTERFACE */}
              <View className="mb-4">
                <Text
                  className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  {t("interfaceLanguage")}
                </Text>
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-2.5 rounded-xl border ${
                    isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.04] border-white/[0.07]"
                  }`}
                  onPress={() => {
                    setShowProfileModal(false);
                    setShowLanguageModal(true);
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">{currentLangObj.flag}</Text>
                    <Text className={`text-xs font-medium ${isLight ? "text-neutral-800" : "text-white"}`}>
                      {currentLangObj.nativeName}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[10px] text-[#6b8cff] font-medium">Alterar</Text>
                    <Feather name="chevron-right" size={12} color="#6b8cff" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* 5. AÇÕES DA CONTA: REDEFINIR SENHA & EXPORTAR DADOS */}
              <View className="mb-4 gap-2">
                <Text
                  className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  Gerenciamento da Conta
                </Text>

                {/* Alterar Senha via Email */}
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-2.5 rounded-xl border active:scale-98 ${
                    isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.04] border-white/[0.07]"
                  }`}
                  onPress={handleSendResetPassword}
                >
                  <View className="flex-row items-center gap-2">
                    <Feather name="key" size={13} color="#6b8cff" />
                    <Text className={`text-xs ${isLight ? "text-neutral-800" : "text-[#e8e8f0]"}`}>
                      {t("changePassword")}
                    </Text>
                  </View>
                  {resetSent ? (
                    <Text className="text-[10px] text-emerald-500 font-medium">✓ Email enviado!</Text>
                  ) : (
                    <Feather name="send" size={12} color={isLight ? "#9ca3af" : "#6b6b80"} />
                  )}
                </TouchableOpacity>

                {/* Exportar Dados LGPD */}
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-2.5 rounded-xl border active:scale-98 ${
                    isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.04] border-white/[0.07]"
                  }`}
                  onPress={handleExportData}
                >
                  <View className="flex-row items-center gap-2">
                    <Feather name="download" size={13} color="#10b981" />
                    <Text className={`text-xs ${isLight ? "text-neutral-800" : "text-[#e8e8f0]"}`}>
                      {t("exportData")}
                    </Text>
                  </View>
                  {dataExported ? (
                    <Text className="text-[10px] text-emerald-500 font-medium">✓ Exportado!</Text>
                  ) : (
                    <Feather name="chevron-right" size={12} color={isLight ? "#9ca3af" : "#6b6b80"} />
                  )}
                </TouchableOpacity>

                {/* Importar Dados (Restore Backup) */}
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-2.5 rounded-xl border active:scale-98 ${
                    isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.04] border-white/[0.07]"
                  }`}
                  onPress={handleTriggerImportFile}
                >
                  <View className="flex-row items-center gap-2">
                    <Feather name="upload" size={13} color="#6b8cff" />
                    <Text className={`text-xs ${isLight ? "text-neutral-800" : "text-[#e8e8f0]"}`}>
                      {t("importData")}
                    </Text>
                  </View>
                  {importing ? (
                    <Text className="text-[10px] text-[#6b8cff] font-medium">Importando...</Text>
                  ) : importFeedback ? (
                    <Text className="text-[10px] text-emerald-500 font-medium">{importFeedback}</Text>
                  ) : (
                    <Feather name="chevron-right" size={12} color={isLight ? "#9ca3af" : "#6b6b80"} />
                  )}
                </TouchableOpacity>
              </View>

              {/* LGPD & Cloud RLS */}
              <View
                className={`rounded-xl p-3 mb-4 border ${
                  isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.03] border-white/[0.05]"
                }`}
              >
                <View className="flex-row items-center justify-between py-1">
                  <Text className={`text-xs ${isLight ? "text-neutral-600" : "text-[#6b6b80]"}`}>
                    {t("lgpdProtected")}
                  </Text>
                  <Feather name="shield" size={12} color="#10b981" />
                </View>
                <View className="flex-row items-center justify-between py-1">
                  <Text className={`text-xs ${isLight ? "text-neutral-600" : "text-[#6b6b80]"}`}>
                    {t("cloudSecure")}
                  </Text>
                  <Feather name="lock" size={12} color="#6b8cff" />
                </View>
              </View>
            </ScrollView>

            {/* Fechar */}
            <TouchableOpacity
              className={`w-full py-2.5 rounded-lg items-center active:scale-95 ${
                isLight ? "bg-neutral-100 hover:bg-neutral-200" : "bg-white/[0.05] hover:bg-white/[0.08]"
              }`}
              onPress={() => setShowProfileModal(false)}
            >
              <Text className={`text-xs font-medium ${isLight ? "text-neutral-800" : "text-[#c8c8d8]"}`}>
                {t("close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
