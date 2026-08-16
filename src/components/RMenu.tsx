import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { menuStyles as styles } from "../styles/menuStyles";
import { sendCopilotMessage } from "../controllers/aiController";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
}

interface RMenuProps {
  isOpen: boolean;
  currentOriginal: string;
  currentTranslated: string;
  onOpenGlossary: () => void;
  onApplyAdjustment?: (newTranslated: string) => void;
}

export default function RMenu({
  isOpen,
  currentOriginal,
  currentTranslated,
  onOpenGlossary,
  onApplyAdjustment,
}: RMenuProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "model",
      text: "Olá! Estou pronto para ajudar com a tradução deste documento. Pode pedir ajustes, esclarecimentos ou revisões específicas em qualquer trecho.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const historyForAi = messages.map((m) => ({
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
          text: `Aviso: Não foi possível processar o ajuste. ${error}`,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: reply,
        },
      ]);
    }
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
        {/* Botão Glossário no Topo */}
        <View className="px-4 py-3.5 border-b border-white/[0.07]">
          <TouchableOpacity
            className={styles.glossaryTopBtn}
            onPress={onOpenGlossary}
          >
            <Feather name="book-open" size={14} color="#6b8cff" />
            <Text className={styles.glossaryTopBtnText}>Glossário</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Mensagens do Chat com animação suave */}
        <ScrollView
          ref={scrollViewRef}
          className={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <View
              key={m.id}
              className={`${m.role === "user" ? styles.userBubble : styles.aiBubble} animate-smooth-fade`}
            >
              <Text
                className={m.role === "user" ? styles.userBubbleText : styles.aiBubbleText}
              >
                {m.text}
              </Text>
            </View>
          ))}

          {loading && (
            <View className="flex-row items-center py-2.5 px-3.5 bg-white/[0.05] rounded-xl self-start mb-2 animate-smooth-fade">
              <ActivityIndicator size="small" color="#6b8cff" />
              <Text className="text-[#6b6b80] text-xs ml-2">Pensando...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input de Chat */}
        <View className={styles.chatInputContainer}>
          <View className={styles.chatInputBox}>
            <TextInput
              className={styles.chatInput}
              placeholder="Peça ajustes à IA..."
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
      </View>
    </View>
  );
}
