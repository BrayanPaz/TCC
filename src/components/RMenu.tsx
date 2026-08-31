import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { menuStyles as styles } from "../styles/menuStyles";
import { sendCopilotMessage } from "../controllers/aiController";
import { TermDecision } from "../controllers/agenticPipelineController";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  type?: "text" | "terms-card";
}

interface RMenuProps {
  isOpen: boolean;
  currentOriginal: string;
  currentTranslated: string;
  identifiedTerms?: TermDecision[];
  onOpenGlossary: () => void;
  onApplyAdjustment?: (newTranslated: string) => void;
  onApplyTermDecision?: (term: TermDecision, chosenOption: string) => void;
}

export default function RMenu({
  isOpen,
  currentOriginal,
  currentTranslated,
  identifiedTerms = [],
  onOpenGlossary,
  onApplyAdjustment,
  onApplyTermDecision,
}: RMenuProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "model",
      text: "Olá! Sou seu Copiloto de Tradução Científica e LaTeX. Posso esclarecer dúvidas, ajustar o tom formal ou modificar termos em tempo real.",
      type: "text",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "terms">("chat");
  const [customTermInputs, setCustomTermInputs] = useState<{ [termId: string]: string }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  // Notifica o chat quando novos termos são identificados pelo Agente 2
  useEffect(() => {
    if (identifiedTerms.length > 0) {
      const alreadyHasTermsMsg = messages.some((m) => m.type === "terms-card");
      if (!alreadyHasTermsMsg) {
        setMessages((prev) => [
          ...prev,
          {
            id: `terms-${Date.now()}`,
            role: "model",
            text: `Identifiquei ${identifiedTerms.length} termos técnicos-chave no documento. Você pode escolher como traduzir cada um na aba "Termos" ou pelos cards abaixo.`,
            type: "terms-card",
          },
        ]);
      }
    }
  }, [identifiedTerms]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      type: "text",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const historyForAi = messages
      .filter((m) => m.type === "text")
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    const { reply, error } = await sendCopilotMessage(
      historyForAi,
      { original: currentOriginal, translated: currentTranslated },
      userText
    );

    setLoading(false);

    if (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: `Aviso: Não foi possível processar a consulta. ${error}`,
          type: "text",
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: reply,
          type: "text",
        },
      ]);
    }
  };

  const handleSelectOption = (term: TermDecision, option: string) => {
    onApplyTermDecision?.(term, option);
    setMessages((prev) => [
      ...prev,
      {
        id: `dec-${Date.now()}`,
        role: "model",
        text: `Opção aplicada para "${term.originalTerm}" → "${option}". O documento LaTeX foi atualizado.`,
        type: "text",
      },
    ]);
  };

  const handleApplyCustomOption = (term: TermDecision) => {
    const customVal = customTermInputs[term.id]?.trim();
    if (!customVal) return;
    handleSelectOption(term, customVal);
  };

  return (
    <View
      className={`h-full bg-[#13131c] border-l border-white/[0.07] flex-col justify-between overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isOpen
          ? "w-80 opacity-100 translate-x-0"
          : "w-0 opacity-0 translate-x-6 border-l-0 pointer-events-none"
      }`}
      style={{
        minWidth: isOpen ? 320 : 0,
        maxWidth: isOpen ? 320 : 0,
      }}
    >
      <View className="w-80 h-full flex-col justify-between flex-shrink-0">
        {/* Top Header: Alternador Chat / Termos e Botão Glossário */}
        <View className="px-3.5 py-3 border-b border-white/[0.07] flex-row items-center justify-between gap-2">
          <View className="flex-row bg-white/[0.05] rounded-lg p-0.5 border border-white/[0.06] flex-1">
            <TouchableOpacity
              className={`flex-1 py-1.5 rounded-md items-center justify-center transition-all ${
                activeTab === "chat" ? "bg-[#6b8cff] shadow-sm" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("chat")}
            >
              <Text
                className={`text-[10px] font-medium ${
                  activeTab === "chat" ? "text-white" : "text-[#6b6b80]"
                }`}
              >
                Chat Copiloto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-1.5 rounded-md items-center justify-center transition-all flex-row gap-1 ${
                activeTab === "terms" ? "bg-[#6b8cff] shadow-sm" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("terms")}
            >
              <Text
                className={`text-[10px] font-medium ${
                  activeTab === "terms" ? "text-white" : "text-[#6b6b80]"
                }`}
              >
                Termos ({identifiedTerms.length})
              </Text>
              {identifiedTerms.length > 0 && (
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </TouchableOpacity>
          </View>

          {/* Botão Glossário */}
          <TouchableOpacity
            className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.07] hover:bg-white/[0.08] active:scale-95"
            onPress={onOpenGlossary}
            title="Abrir Glossário"
          >
            <Feather name="book-open" size={13} color="#6b8cff" />
          </TouchableOpacity>
        </View>

        {/* ── ABA 1: CHAT CONVERSACIONAL ── */}
        {activeTab === "chat" && (
          <ScrollView
            ref={scrollViewRef}
            className={styles.chatList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m) => {
              if (m.type === "terms-card" && identifiedTerms.length > 0) {
                return (
                  <View
                    key={m.id}
                    className="bg-[#0c0c12] border border-[#6b8cff]/30 rounded-xl p-3 mb-3 animate-smooth-fade"
                  >
                    <View className="flex-row items-center gap-1.5 mb-1.5">
                      <Feather name="layers" size={12} color="#6b8cff" />
                      <Text className="text-[#6b8cff] text-xs font-semibold">
                        Consulta Terminológica Ativa
                      </Text>
                    </View>
                    <Text className="text-[#a0a0b8] text-[11px] leading-relaxed mb-2.5">
                      {m.text}
                    </Text>
                    <TouchableOpacity
                      className="bg-[#6b8cff]/20 border border-[#6b8cff]/40 py-1.5 px-3 rounded-lg items-center active:scale-95 transition-all"
                      onPress={() => setActiveTab("terms")}
                    >
                      <Text className="text-[#6b8cff] text-[11px] font-semibold">
                        Ver e Escolher Termos ({identifiedTerms.length}) →
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View
                  key={m.id}
                  className={`${
                    m.role === "user" ? styles.userBubble : styles.aiBubble
                  } animate-smooth-fade`}
                >
                  <Text
                    className={
                      m.role === "user" ? styles.userBubbleText : styles.aiBubbleText
                    }
                  >
                    {m.text}
                  </Text>
                </View>
              );
            })}

            {loading && (
              <View className="flex-row items-center py-2.5 px-3.5 bg-white/[0.05] rounded-xl self-start mb-2 animate-smooth-fade">
                <ActivityIndicator size="small" color="#6b8cff" />
                <Text className="text-[#6b6b80] text-xs ml-2">Pensando...</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── ABA 2: DECISÕES DE TERMINOLOGIA (CONSULTA AGÊNTICA AO USUÁRIO) ── */}
        {activeTab === "terms" && (
          <ScrollView className="flex-1 px-3 py-3" showsVerticalScrollIndicator={false}>
            {identifiedTerms.length === 0 ? (
              <View className="items-center justify-center py-12 px-4">
                <Feather name="check-circle" size={24} color="#6b6b80" />
                <Text className="text-[#e8e8f0] text-xs font-semibold mt-3">
                  Nenhum termo ambíguo pendente
                </Text>
                <Text className="text-[#6b6b80] text-[11px] text-center mt-1">
                  Os termos técnicos foram processados conforme o glossário padrão.
                </Text>
              </View>
            ) : (
              identifiedTerms.map((term) => (
                <View
                  key={term.id}
                  className="bg-[#0c0c12] border border-white/[0.08] rounded-xl p-3.5 mb-3 animate-smooth-fade shadow-sm"
                >
                  {/* Cabeçalho do Termo */}
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-white text-xs font-bold font-mono">
                      "{term.originalTerm}"
                    </Text>
                    {term.selectedOption && (
                      <View className="flex-row items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Feather name="check" size={10} color="#4ade80" />
                        <Text className="text-emerald-400 text-[9px] font-medium">Decidido</Text>
                      </View>
                    )}
                  </View>

                  {/* Contexto no Documento */}
                  {term.contextSentence ? (
                    <Text className="text-[#6b6b80] text-[10px] italic mb-3" numberOfLines={2}>
                      "{term.contextSentence}"
                    </Text>
                  ) : null}

                  {/* Opções de Escolha Rápida (Chips) */}
                  <Text className="text-[9px] uppercase tracking-wider text-[#6b8cff] font-semibold mb-1.5">
                    Escolha a tradução desejada:
                  </Text>
                  <View className="flex-col gap-1.5 mb-2.5">
                    {term.suggestedOptions.map((opt, optIdx) => {
                      const isSelected = term.selectedOption === opt;
                      return (
                        <TouchableOpacity
                          key={optIdx}
                          className={`p-2 rounded-lg border transition-all flex-row items-center justify-between ${
                            isSelected
                              ? "bg-[#6b8cff]/20 border-[#6b8cff] shadow-sm"
                              : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]"
                          }`}
                          onPress={() => handleSelectOption(term, opt)}
                        >
                          <Text
                            className={`text-[11px] flex-1 ${
                              isSelected ? "text-white font-semibold" : "text-[#c8c8d8]"
                            }`}
                          >
                            {opt}
                          </Text>
                          {isSelected && <Feather name="check" size={11} color="#6b8cff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Campo de Tradução Customizada */}
                  <View className="flex-row gap-1.5 pt-2 border-t border-white/[0.05]">
                    <TextInput
                      className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-white focus:border-[#6b8cff]/40"
                      placeholder="Ou digite sua tradução..."
                      placeholderTextColor="#6b6b80"
                      value={customTermInputs[term.id] || ""}
                      onChangeText={(val) =>
                        setCustomTermInputs((prev) => ({ ...prev, [term.id]: val }))
                      }
                      onSubmitEditing={() => handleApplyCustomOption(term)}
                    />
                    <TouchableOpacity
                      className="bg-[#6b8cff] px-2.5 py-1 rounded-lg items-center justify-center active:scale-95"
                      onPress={() => handleApplyCustomOption(term)}
                    >
                      <Feather name="check" size={11} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Input de Chat (Somente visível na aba Chat) */}
        {activeTab === "chat" && (
          <View className={styles.chatInputContainer}>
            <View className={styles.chatInputBox}>
              <TextInput
                className={styles.chatInput}
                placeholder="Peça ajustes no LaTeX..."
                placeholderTextColor="#6b6b80"
                value={input}
                onChangeText={setInput}
                multiline
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                className={`${styles.sendBtn} active:scale-95`}
                onPress={handleSend}
                disabled={loading || !input.trim()}
              >
                <Feather name="send" size={12} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
