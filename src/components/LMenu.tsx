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
  onSelectHistory: (item: TranslationHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onNewTranslation: () => void;
  onLogout: () => void;
}

export default function LMenu({
  isOpen,
  history,
  activeId,
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

  const handleConfirmDelete = () => {
    if (pendingDeleteChat?.id) {
      onDeleteHistory(pendingDeleteChat.id);
      setPendingDeleteChat(null);
    }
  };

  return (
    <View
      className={`h-full bg-[#13131c] border-r border-white/[0.07] flex-col justify-between overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
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
        {/* App Branding */}
        <View className={styles.logoSection}>
          <View className={styles.logoIconBox}>
            <Feather name="globe" size={13} color="#6b8cff" />
          </View>
          <Text className={styles.logoText}>Translatio</Text>
        </View>

        {/* Action: Iniciar Novo Chat */}
        <View className={styles.historyHeader}>
          <TouchableOpacity
            className={`${styles.newTranslationBtn} active:scale-95`}
            onPress={onNewTranslation}
          >
            <Feather name="plus" size={14} color="#6b8cff" />
            <Text className={styles.newTranslationBtnText}>Iniciar Novo Chat</Text>
          </TouchableOpacity>

          {/* Histórico label */}
          <Text className={styles.historyTitle}>Histórico</Text>
        </View>

        {/* Lista de Histórico com botão de apagar e hover */}
        <ScrollView className={styles.historyList} showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <Text className="text-[#6b6b80] text-[11px] px-2 py-4 italic">
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
                      ? "bg-white/[0.08] border border-[#6b8cff]/40 shadow-sm"
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
                        isActive ? "text-white font-medium" : "text-[#c8c8d8]"
                      }`}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-[#6b6b80] text-[10px] mt-0.5">
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
                      color="#6b6b80"
                      className="trash-icon"
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Footer Profile (Separado do Glossário) & Logout */}
        <View className={styles.footerMenu}>
          <TouchableOpacity
            className={`${styles.profileBtn} hover:bg-white/[0.06] active:scale-95 transition-all`}
            onPress={() => setShowProfileModal(true)}
          >
            <View className={styles.profileAvatar}>
              <Feather name="user" size={13} color="#6b8cff" />
            </View>
            <Text className={styles.profileName} numberOfLines={1}>
              {userDisplayName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`${styles.logoutBtn} hover:bg-red-500/20 active:scale-90 transition-all`}
            onPress={onLogout}
            title="Sair"
          >
            <Feather name="log-out" size={14} color="#6b6b80" />
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
          <View className="w-full max-w-sm bg-[#13131c] border border-white/10 rounded-2xl p-5 overflow-hidden shadow-2xl animate-smooth-pop">
            <View className="flex-row items-center gap-2.5 mb-3">
              <View className="w-8 h-8 rounded-full bg-red-500/15 items-center justify-center">
                <Feather name="trash-2" size={14} color="#e05a6a" />
              </View>
              <Text className="text-[#e8e8f0] font-semibold text-sm">Excluir Tradução?</Text>
            </View>

            <Text className="text-[#a0a0b8] text-xs leading-relaxed mb-5">
              Tem certeza que deseja apagar "{pendingDeleteChat?.title}"? Este chat e documento serão removidos permanentemente.
            </Text>

            <View className="flex-row items-center justify-end gap-2">
              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] active:scale-95 transition-all"
                onPress={() => setPendingDeleteChat(null)}
              >
                <Text className="text-[#c8c8d8] text-xs font-medium">Cancelar</Text>
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

      {/* ── MODAL DE PERFIL DO USUÁRIO ── */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-smooth-fade">
          <View className="w-full max-w-sm bg-[#13131c] border border-white/10 rounded-2xl p-6 overflow-hidden shadow-2xl animate-smooth-pop">
            <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-white/[0.07]">
              <View className="flex-row items-center gap-2">
                <Feather name="user" size={15} color="#6b8cff" />
                <Text className="text-[#e8e8f0] font-semibold text-sm">Perfil do Usuário</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Feather name="x" size={14} color="#6b6b80" />
              </TouchableOpacity>
            </View>

            <View className="items-center py-3 mb-4">
              <View className="w-14 h-14 rounded-full bg-[#6b8cff]/20 items-center justify-center mb-3 border border-[#6b8cff]/30">
                <Feather name="user" size={24} color="#6b8cff" />
              </View>
              <Text className="text-[#e8e8f0] font-medium text-sm">{userDisplayName}</Text>
              <Text className="text-[#6b6b80] text-xs mt-0.5">{userEmail}</Text>
            </View>

            <View className="bg-white/[0.03] rounded-xl p-3 mb-5 border border-white/[0.05]">
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-[#6b6b80] text-xs">Proteção LGPD</Text>
                <Text className="text-emerald-400 text-xs font-medium">Ativa (Isolado)</Text>
              </View>
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-[#6b6b80] text-xs">Armazenamento</Text>
                <Text className="text-[#c8c8d8] text-xs font-medium">Firestore RLS</Text>
              </View>
            </View>

            <TouchableOpacity
              className="w-full py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] active:scale-95 items-center transition-all"
              onPress={() => setShowProfileModal(false)}
            >
              <Text className="text-[#c8c8d8] text-xs font-medium">Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
