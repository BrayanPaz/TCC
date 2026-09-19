import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { menuStyles as styles } from "../styles/menuStyles";
import { sendCopilotMessage } from "../controllers/aiController";
import { TermDecision } from "../controllers/agenticPipelineController";
import { useLanguage } from "../context/LanguageContext";

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
  theme?: "dark" | "light";
  onOpenGlossary: () => void;
  onApplyAdjustment?: (newTranslated: string) => void;
  onApplyTermDecision?: (term: TermDecision, chosenOption: string) => void;
}

export default function RMenu({
  isOpen,
  currentOriginal,
  currentTranslated,
  identifiedTerms = [],
  theme = "dark",
  onOpenGlossary,
  onApplyAdjustment,
  onApplyTermDecision,
}: RMenuProps) {
  const isLight = theme === "light";
  const { t } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "model",
      text: t("copilotWelcome"),
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
      className={`h-full ${
        isLight ? "bg-[#f8f9fa] border-l border-[#e5e7eb]" : "bg-[#13131c] border-l border-white/[0.07]"
      } flex-col justify-between overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
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
        <View
          className={`px-3.5 py-3 flex-row items-center justify-between gap-2 border-b ${
            isLight ? "border-neutral-200" : "border-white/[0.07]"
          }`}
        >
          <View
            className={`flex-row rounded-lg p-0.5 border flex-1 ${
              isLight ? "bg-neutral-100 border-neutral-200" : "bg-white/[0.05] border-white/[0.06]"
            }`}
          >
            <TouchableOpacity
              className={`flex-1 py-1.5 rounded-md items-center justify-center transition-all ${
                activeTab === "chat"
                  ? "bg-[#6b8cff] shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTab("chat")}
            >
              <Text
                className={`text-[10px] font-medium ${
                  activeTab === "chat"
                    ? "text-white font-bold"
                    : isLight
                    ? "text-neutral-600"
                    : "text-[#6b6b80]"
                }`}
              >
                {t("tabChat")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-1.5 rounded-md items-center justify-center transition-all flex-row gap-1 ${
                activeTab === "terms"
                  ? "bg-[#6b8cff] shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTab("terms")}
            >
              <Text
                className={`text-[10px] font-medium ${
                  activeTab === "terms"
                    ? "text-white font-bold"
                    : isLight
                    ? "text-neutral-600"
                    : "text-[#6b6b80]"
                }`}
              >
                {t("tabTerms", { count: identifiedTerms.length })}
              </Text>
              {identifiedTerms.length > 0 && (
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </TouchableOpacity>
          </View>

          {/* Botão Glossário */}
          <TouchableOpacity
            className={`p-2 rounded-lg border active:scale-95 transition-all ${
              isLight
                ? "bg-white border-neutral-200 hover:bg-neutral-100"
                : "bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.08]"
            }`}
            onPress={onOpenGlossary}
            accessibilityLabel={t("glossaryTitle")}
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
                    className={`rounded-xl p-3 mb-3 animate-smooth-fade border ${
                      isLight
                        ? "bg-white border-blue-200 shadow-sm"
                        : "bg-[#0c0c12] border-[#6b8cff]/30"
                    }`}
                  >
                    <View className="flex-row items-center gap-1.5 mb-1.5">
                      <Feather name="layers" size={12} color="#6b8cff" />
                      <Text className="text-[#6b8cff] text-xs font-semibold">
                        Consulta Terminológica Ativa
                      </Text>
                    </View>
                    <Text
                      className={`text-[11px] leading-relaxed mb-2.5 ${
                        isLight ? "text-neutral-600" : "text-[#a0a0b8]"
                      }`}
                    >
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

              const isUser = m.role === "user";
              return (
                <View
                  key={m.id}
                  className={`p-3 rounded-2xl mb-2.5 max-w-[88%] animate-smooth-fade ${
                    isUser
                      ? "bg-[#6b8cff] self-end rounded-br-sm shadow-sm"
                      : isLight
                      ? "bg-white border border-neutral-200 self-start rounded-bl-sm shadow-sm"
                      : "bg-white/[0.06] border border-white/[0.06] self-start rounded-bl-sm"
                  }`}
                >
                  <Text
                    className={`text-xs leading-relaxed ${
                      isUser
                        ? "text-white"
                        : isLight
                        ? "text-neutral-800"
                        : "text-[#e8e8f0]"
                    }`}
                  >
                    {m.text}
                  </Text>
                </View>
              );
            })}

            {loading && (
              <View
                className={`flex-row items-center py-2.5 px-3.5 rounded-xl self-start mb-2 animate-smooth-fade ${
                  isLight ? "bg-white border border-neutral-200" : "bg-white/[0.05]"
                }`}
              >
                <ActivityIndicator size="small" color="#6b8cff" />
                <Text
                  className={`text-xs ml-2 ${
                    isLight ? "text-neutral-500" : "text-[#6b6b80]"
                  }`}
                >
                  Pensando...
                </Text>
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
                <Text
                  className={`text-xs font-semibold mt-3 ${
                    isLight ? "text-neutral-800" : "text-[#e8e8f0]"
                  }`}
                >
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
                  className={`rounded-xl p-3.5 mb-3 animate-smooth-fade shadow-sm border ${
                    isLight
                      ? "bg-white border-neutral-200"
                      : "bg-[#0c0c12] border-white/[0.08]"
                  }`}
                >
                  {/* Cabeçalho do Termo */}
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text
                      className={`text-xs font-bold font-mono ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}
                    >
                      "{term.originalTerm}"
                    </Text>
                    {term.selectedOption ? (
                      <View className="flex-row items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Feather name="check" size={10} color="#10b981" />
                        <Text className="text-emerald-500 text-[9px] font-medium">Decidido</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Contexto no Documento */}
                  {term.contextSentence ? (
                    <Text
                      className={`text-[10px] italic mb-3 ${
                        isLight ? "text-neutral-500" : "text-[#6b6b80]"
                      }`}
                      numberOfLines={2}
                    >
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
                              : isLight
                              ? "bg-neutral-50 border-neutral-200 hover:bg-neutral-100"
                              : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]"
                          }`}
                          onPress={() => handleSelectOption(term, opt)}
                        >
                          <Text
                            className={`text-[11px] flex-1 ${
                              isSelected
                                ? isLight
                                  ? "text-blue-900 font-bold"
                                  : "text-white font-semibold"
                                : isLight
                                ? "text-neutral-700"
                                : "text-[#c8c8d8]"
                            }`}
                          >
                            {opt}
                          </Text>
                          {isSelected ? <Feather name="check" size={11} color="#6b8cff" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Campo de Tradução Customizada */}
                  <View
                    className={`flex-row gap-1.5 pt-2 border-t ${
                      isLight ? "border-neutral-100" : "border-white/[0.05]"
                    }`}
                  >
                    <TextInput
                      className={`flex-1 rounded-lg px-2.5 py-1 text-[11px] border ${
                        isLight
                          ? "bg-neutral-50 border-neutral-200 text-neutral-900"
                          : "bg-white/[0.05] border-white/[0.08] text-white focus:border-[#6b8cff]/40"
                      }`}
                      placeholder="Ou digite sua tradução..."
                      placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
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

        {/* Input de Chat */}
        {activeTab === "chat" && (
          <View
            className={`p-3 border-t ${
              isLight ? "border-neutral-200 bg-white" : "border-white/[0.07] bg-[#13131c]"
            }`}
          >
            <View
              className={`flex-row items-center rounded-xl p-1.5 border ${
                isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.05] border-white/[0.08]"
              }`}
            >
              <TextInput
                className={`flex-1 px-2.5 py-1 text-xs max-h-20 ${
                  isLight ? "text-neutral-900" : "text-white"
                }`}
                placeholder="Peça ajustes no LaTeX..."
                placeholderTextColor={isLight ? "#9ca3af" : "#6b6b80"}
                value={input}
                onChangeText={setInput}
                multiline
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                className="w-8 h-8 rounded-lg bg-[#6b8cff] items-center justify-center active:scale-95"
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
