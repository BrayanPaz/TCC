import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { menuStyles as styles } from "../styles/menuStyles";
import { TranslationHistoryItem } from "../controllers/historyController";
import { auth } from "../controllers/firebaseConfig";

interface LMenuProps {
  isOpen: boolean;
  history: TranslationHistoryItem[];
  activeId?: string | null;
  theme?: "dark" | "light";
  onToggleTheme?: (theme: "dark" | "light") => void;
  onSelectHistory: (item: TranslationHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onNewTranslation: () => void;
  onLogout: () => void;
}

export default function LMenu({
  isOpen,
  history,
  activeId,
  theme = "dark",
  onToggleTheme,
  onSelectHistory,
  onDeleteHistory,
  onNewTranslation,
  onLogout,
}: LMenuProps) {
  const userEmail = auth.currentUser?.email || "Usuário";
  const userDisplayName = userEmail.split("@")[0];

  // Estado para exclusão com confirmação
  const [pendingDeleteChat, setPendingDeleteChat] = useState<TranslationHistoryItem | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isLight = theme === "light";

  const handleConfirmDelete = () => {
    if (pendingDeleteChat?.id) {
      onDeleteHistory(pendingDeleteChat.id);
      setPendingDeleteChat(null);
    }
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
        {/* Top Header & Botão Novo Chat */}
        <View className="p-4 pb-2">
          {/* Logo Brand */}
          <View className="flex-row items-center gap-2 mb-4 px-1">
            <View className="w-6 h-6 rounded-lg bg-[#6b8cff] items-center justify-center shadow-sm">
              <Feather name="globe" size={13} color="#ffffff" />
            </View>
            <Text
              className={`text-sm font-bold tracking-tight ${
                isLight ? "text-neutral-900" : "text-white"
              }`}
            >
              Translatio
            </Text>
          </View>

          {/* Botão Novo Chat */}
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#6b8cff] hover:bg-[#5b7ce8] active:scale-95 transition-all duration-150 shadow-md shadow-[#6b8cff]/20"
            onPress={onNewTranslation}
          >
            <Feather name="plus" size={14} color="#ffffff" />
            <Text className="text-white text-xs font-semibold">Iniciar Novo Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Seção Histórico */}
        <View className="flex-1 px-3 py-2 overflow-hidden">
          <Text
            className={`text-[9px] uppercase font-bold tracking-wider px-2 mb-2 ${
              isLight ? "text-neutral-400" : "text-[#6b6b80]"
            }`}
          >
            Histórico de Documentos
          </Text>

          {/* Lista de Histórico */}
          <ScrollView className={styles.historyList} showsVerticalScrollIndicator={false}>
            {history.length === 0 ? (
              <Text
                className={`text-[11px] px-2 py-4 italic ${
                  isLight ? "text-neutral-400" : "text-[#6b6b80]"
                }`}
              >
                Nenhum chat recente.
              </Text>
            ) : (
              history.map((item, idx) => {
                const isActive = activeId && item.id === activeId;
                return (
                  <View
                    key={item.id || idx}
                    className={`flex-row items-center justify-between p-2 rounded-lg mb-1 transition-all duration-200 ${
                      isActive
                        ? isLight
                          ? "bg-blue-50 border border-blue-200 shadow-sm"
                          : "bg-white/[0.08] border border-[#6b8cff]/40 shadow-sm"
                        : isLight
                        ? "hover:bg-neutral-200/60 border border-transparent"
                        : "hover:bg-white/[0.05] border border-transparent"
                    }`}
                  >
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
                      <Text
                        className={`text-[10px] mt-0.5 ${
                          isLight ? "text-neutral-500" : "text-[#6b6b80]"
                        }`}
                      >
                        {item.sourceLang?.toUpperCase()} → {item.targetLang?.toUpperCase()}
                      </Text>
                    </TouchableOpacity>

                    {/* Botão de Lixeira com Círculo Expansível e Ícone Vermelho */}
                    <TouchableOpacity
                      className="trash-btn"
                      onPress={() => setPendingDeleteChat(item)}
                      title="Excluir chat"
                    >
                      <View className="trash-bg" />
                      <Feather
                        name="trash-2"
                        size={13}
                        color={isLight ? "#9ca3af" : "#6b6b80"}
                        className="trash-icon"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Footer: Menu do Usuário & Logout */}
        <View
          className={`p-3 border-t flex-row items-center justify-between ${
            isLight ? "border-neutral-200 bg-white" : "border-white/[0.07] bg-[#13131c]"
          }`}
        >
          {/* Botão Perfil do Usuário */}
          <TouchableOpacity
            className="flex-row items-center flex-1 mr-2 p-1.5 rounded-lg hover:bg-white/[0.05] active:scale-95 transition-all"
            onPress={() => setShowProfileModal(true)}
          >
            <View className="w-6 h-6 rounded-full bg-[#6b8cff]/20 items-center justify-center mr-2 border border-[#6b8cff]/30">
              <Feather name="user" size={11} color="#6b8cff" />
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

          {/* Botão Sair */}
          <TouchableOpacity
            className="p-2 rounded-lg hover:bg-red-500/10 active:scale-90 transition-all"
            onPress={onLogout}
            title="Sair da Conta"
          >
            <Feather name="log-out" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CHAT ── */}
      <Modal
        visible={pendingDeleteChat !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDeleteChat(null)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-smooth-fade">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 overflow-hidden shadow-2xl animate-smooth-pop ${
              isLight ? "bg-white border border-neutral-200" : "bg-[#13131c] border border-white/10"
            }`}
          >
            <View className="flex-row items-center gap-2.5 mb-3">
              <View className="w-8 h-8 rounded-full bg-red-500/15 items-center justify-center">
                <Feather name="trash-2" size={14} color="#e05a6a" />
              </View>
              <Text
                className={`font-semibold text-sm ${
                  isLight ? "text-neutral-900" : "text-[#e8e8f0]"
                }`}
              >
                Excluir Tradução?
              </Text>
            </View>

            <Text
              className={`text-xs leading-relaxed mb-5 ${
                isLight ? "text-neutral-600" : "text-[#a0a0b8]"
              }`}
            >
              Tem certeza que deseja apagar "{pendingDeleteChat?.title}"? Este chat e documento serão removidos permanentemente.
            </Text>

            <View className="flex-row items-center justify-end gap-2">
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg active:scale-95 transition-all ${
                  isLight ? "bg-neutral-100 hover:bg-neutral-200" : "bg-white/[0.05] hover:bg-white/[0.08]"
                }`}
                onPress={() => setPendingDeleteChat(null)}
              >
                <Text
                  className={`text-xs font-medium ${
                    isLight ? "text-neutral-700" : "text-[#c8c8d8]"
                  }`}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 active:scale-95 transition-all"
                onPress={handleConfirmDelete}
              >
                <Text className="text-[#e05a6a] text-xs font-semibold">Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL DE PERFIL DO USUÁRIO & SELEÇÃO DE TEMA ── */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-smooth-fade">
          <View
            className={`w-full max-w-sm rounded-2xl p-6 overflow-hidden shadow-2xl animate-smooth-pop ${
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
                <Text
                  className={`font-semibold text-sm ${
                    isLight ? "text-neutral-900" : "text-[#e8e8f0]"
                  }`}
                >
                  Configurações do Usuário
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Feather name="x" size={14} color={isLight ? "#9ca3af" : "#6b6b80"} />
              </TouchableOpacity>
            </View>

            {/* Avatar & Identificação */}
            <View className="items-center py-2 mb-3">
              <View className="w-14 h-14 rounded-full bg-[#6b8cff]/20 items-center justify-center mb-2 border border-[#6b8cff]/30">
                <Feather name="user" size={24} color="#6b8cff" />
              </View>
              <Text
                className={`font-medium text-sm ${
                  isLight ? "text-neutral-900" : "text-[#e8e8f0]"
                }`}
              >
                {userDisplayName}
              </Text>
              <Text
                className={`text-xs mt-0.5 ${
                  isLight ? "text-neutral-500" : "text-[#6b6b80]"
                }`}
              >
                {userEmail}
              </Text>
            </View>

            {/* SELEÇÃO DE TEMA (CLARO / ESCURO) */}
            <View className="mb-4">
              <Text
                className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${
                  isLight ? "text-neutral-500" : "text-[#6b6b80]"
                }`}
              >
                Tema da Interface
              </Text>
              <View
                className={`flex-row rounded-xl p-1 border ${
                  isLight ? "bg-neutral-100 border-neutral-200" : "bg-white/[0.05] border-white/[0.06]"
                }`}
              >
                <TouchableOpacity
                  className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-1.5 transition-all ${
                    !isLight
                      ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30"
                      : "bg-transparent"
                  }`}
                  onPress={() => onToggleTheme?.("dark")}
                >
                  <Feather
                    name="moon"
                    size={12}
                    color={!isLight ? "#ffffff" : "#6b7280"}
                  />
                  <Text
                    className={`text-xs font-medium ${
                      !isLight ? "text-white font-semibold" : "text-neutral-600"
                    }`}
                  >
                    Tema Escuro
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-1.5 transition-all ${
                    isLight
                      ? "bg-[#6b8cff] shadow-sm shadow-[#6b8cff]/30"
                      : "bg-transparent"
                  }`}
                  onPress={() => onToggleTheme?.("light")}
                >
                  <Feather
                    name="sun"
                    size={12}
                    color={isLight ? "#ffffff" : "#9ca3af"}
                  />
                  <Text
                    className={`text-xs font-medium ${
                      isLight ? "text-white font-semibold" : "text-neutral-400"
                    }`}
                  >
                    Tema Claro
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Informações de Segurança e LGPD */}
            <View
              className={`rounded-xl p-3 mb-5 border ${
                isLight
                  ? "bg-neutral-50 border-neutral-200"
                  : "bg-white/[0.03] border-white/[0.05]"
              }`}
            >
              <View className="flex-row items-center justify-between py-1">
                <Text className={`text-xs ${isLight ? "text-neutral-600" : "text-[#6b6b80]"}`}>
                  Proteção LGPD
                </Text>
                <Text className="text-emerald-500 text-xs font-medium">Ativa (Isolado)</Text>
              </View>
              <View className="flex-row items-center justify-between py-1">
                <Text className={`text-xs ${isLight ? "text-neutral-600" : "text-[#6b6b80]"}`}>
                  Armazenamento
                </Text>
                <Text className={`text-xs font-medium ${isLight ? "text-neutral-800" : "text-[#c8c8d8]"}`}>
                  Firestore Cloud RLS
                </Text>
              </View>
            </View>

            {/* Fechar */}
            <TouchableOpacity
              className={`w-full py-2.5 rounded-lg items-center active:scale-95 transition-all ${
                isLight
                  ? "bg-neutral-100 hover:bg-neutral-200"
                  : "bg-white/[0.05] hover:bg-white/[0.08]"
              }`}
              onPress={() => setShowProfileModal(false)}
            >
              <Text
                className={`text-xs font-medium ${
                  isLight ? "text-neutral-800" : "text-[#c8c8d8]"
                }`}
              >
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
