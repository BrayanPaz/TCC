import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  loginUser,
  loginWithGoogle,
  loginWithGoogleRedirect,
  checkRedirectResult,
  resetPassword,
  resendVerificationEmail,
} from "../controllers/authController";
import { SafeAreaView } from "react-native-safe-area-context";
import { authStyles as styles } from "../styles/authStyles";
import { Feather } from "@expo/vector-icons";

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Estado de erro de autenticação para exibição inline destacada
  const [authError, setAuthError] = useState<{ message: string; code?: string | null } | null>(null);

  // Estados do Modal "Esqueceu a Senha"
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Estado de aviso de e-mail não verificado
  const [unverifiedNotice, setUnverifiedNotice] = useState(false);

  // Checa se o usuário retornou de um login por redirecionamento do Google
  useEffect(() => {
    async function checkRedirect() {
      try {
        const result = await checkRedirectResult();
        if (result) {
          if (result.user) {
            router.replace("/");
          } else if (result.error) {
            setAuthError({ message: result.error, code: result.errorCode });
          }
        }
      } catch (err: any) {
        console.error("Erro ao verificar retorno de redirecionamento:", err);
      }
    }
    checkRedirect();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setAuthError({ message: "Por favor, preencha seu e-mail e senha.", code: "campos_vazios" });
      return;
    }

    setLoading(true);
    setAuthError(null);
    setUnverifiedNotice(false);
    const { user, error, errorCode, needsVerification } = await loginUser(email, password);
    setLoading(false);

    if (error) {
      setAuthError({ message: error, code: errorCode });
    } else if (user) {
      if (needsVerification) {
        setUnverifiedNotice(true);
      }
      router.replace("/");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setAuthError(null);
    const { user, error, errorCode } = await loginWithGoogle();
    setGoogleLoading(false);

    if (error) {
      setAuthError({ message: error, code: errorCode });
    } else if (user) {
      router.replace("/");
    }
  };

  const handleGoogleRedirectLogin = async () => {
    try {
      setGoogleLoading(true);
      setAuthError(null);
      await loginWithGoogleRedirect();
    } catch (err: any) {
      setGoogleLoading(false);
      setAuthError({
        message: err.message || "Erro ao iniciar redirecionamento do Google.",
        code: err.code || null,
      });
    }
  };

  const handleSendResetPassword = async () => {
    if (!forgotEmail || !forgotEmail.includes("@")) {
      Alert.alert("E-mail inválido", "Por favor, digite um e-mail válido para recuperação.");
      return;
    }

    setForgotLoading(true);
    const { success, error } = await resetPassword(forgotEmail);
    setForgotLoading(false);

    if (error) {
      Alert.alert("Erro na recuperação", error);
    } else if (success) {
      setForgotSuccess(true);
    }
  };

  return (
    <SafeAreaView className={styles.container}>
      <View className={styles.card}>
        <View className={styles.headerContainer}>
          <View className="flex-row items-center justify-center gap-2 mb-2">
            <View className="w-8 h-8 rounded-lg bg-[#6b8cff] items-center justify-center shadow-md">
              <Feather name="globe" size={16} color="#ffffff" />
            </View>
            <Text className="text-xl font-bold text-white tracking-tight">Translatio</Text>
          </View>
          <Text className={styles.headerTitle}>Bem-vindo de volta</Text>
          <Text className={styles.headerSubtitle}>Entre para continuar suas traduções acadêmicas com IA.</Text>
        </View>

        {/* BANNER DE ERRO / DIAGNÓSTICO EM DESTAQUE */}
        {authError && (
          <View className="w-full mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex-row items-start gap-2.5">
            <Feather name="alert-triangle" size={16} color="#ef4444" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-red-400 font-semibold text-xs mb-1">
                {authError.code ? `Aviso (${authError.code})` : "Aviso de Autenticação"}
              </Text>
              <Text className="text-[#d0d0e0] text-[11px] leading-relaxed">
                {authError.message}
              </Text>
              {(authError.code === "auth/popup-closed-by-user" || authError.code === "auth/popup-blocked") && (
                <TouchableOpacity
                  className="mt-2.5 py-1.5 px-3 rounded-lg bg-red-500/20 self-start active:bg-red-500/30 border border-red-500/30"
                  onPress={handleGoogleRedirectLogin}
                >
                  <Text className="text-xs font-semibold text-red-200">
                    Tentar login sem pop-up (Redirecionamento) ➔
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setAuthError(null)} className="p-1">
              <Feather name="x" size={14} color="#8e8ea6" />
            </TouchableOpacity>
          </View>
        )}

        {/* BOTÃO LOGIN COM GOOGLE */}
        <TouchableOpacity
          className="w-full py-2.5 px-4 rounded-xl bg-white/[0.07] border border-white/10 flex-row items-center justify-center gap-3 hover:bg-white/[0.12] active:scale-98 transition-all mb-4"
          onPress={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#6b8cff" />
          ) : (
            <>
              {/* Ícone estilizado do Google */}
              <View className="w-4 h-4 items-center justify-center">
                <Text className="text-sm font-bold text-[#6b8cff]">G</Text>
              </View>
              <Text className="text-white text-xs font-semibold">Continuar com o Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divisor "OU" */}
        <View className="flex-row items-center my-3">
          <View className="flex-1 h-[1px] bg-white/10" />
          <Text className="px-3 text-[10px] text-[#6b6b80] uppercase tracking-wider font-medium">ou com e-mail</Text>
          <View className="flex-1 h-[1px] bg-white/10" />
        </View>

        <View className={styles.formContainer}>
          <View>
            <Text className={styles.inputLabel}>E-mail</Text>
            <TextInput
              className={styles.inputField}
              placeholder="Digite seu e-mail"
              placeholderTextColor="#5a5a70"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className={styles.inputGroup}>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className={styles.inputLabel}>Senha</Text>
              <TouchableOpacity
                onPress={() => {
                  setForgotEmail(email);
                  setForgotSuccess(false);
                  setShowForgotModal(true);
                }}
              >
                <Text className="text-[11px] text-[#6b8cff] hover:underline font-medium">
                  Esqueceu a senha?
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className={styles.inputField}
              placeholder="Digite sua senha"
              placeholderTextColor="#5a5a70"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          className={loading ? styles.disabledButton : styles.primaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={styles.primaryButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <View className={styles.footerContainer}>
          <Text className={styles.footerText}>Novo por aqui?</Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text className={styles.footerLink}>Crie sua conta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MODAL ESQUECEU A SENHA / RECUPERAÇÃO DE CONTA ── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <View className="w-full max-w-sm rounded-2xl bg-[#13131c] border border-white/10 p-6 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-white/[0.07]">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg bg-[#6b8cff]/20 items-center justify-center">
                  <Feather name="key" size={14} color="#6b8cff" />
                </View>
                <Text className="font-semibold text-sm text-white">Recuperar Conta</Text>
              </View>
              <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                <Feather name="x" size={14} color="#6b6b80" />
              </TouchableOpacity>
            </View>

            {forgotSuccess ? (
              <View className="items-center py-4">
                <View className="w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center mb-3">
                  <Feather name="check" size={20} color="#10b981" />
                </View>
                <Text className="text-white font-semibold text-sm text-center mb-1">
                  E-mail enviado com sucesso!
                </Text>
                <Text className="text-[#a0a0b8] text-xs text-center leading-relaxed mb-4">
                  Enviamos as instruções e o link seguro para redefinir sua senha no e-mail{" "}
                  <Text className="text-white font-medium">{forgotEmail}</Text>. Verifique sua caixa de entrada ou spam.
                </Text>
                <TouchableOpacity
                  className="w-full py-2.5 rounded-xl bg-[#6b8cff] items-center"
                  onPress={() => setShowForgotModal(false)}
                >
                  <Text className="text-white text-xs font-semibold">Entendido</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text className="text-[#a0a0b8] text-xs leading-relaxed mb-4">
                  Digite o e-mail cadastrado na sua conta. Enviaremos um link seguro pelo Firebase para você criar uma nova senha.
                </Text>

                <View className="mb-4">
                  <Text className="text-[11px] font-medium text-[#c8c8d8] mb-1.5">Seu E-mail</Text>
                  <TextInput
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs"
                    placeholder="seuemail@exemplo.com"
                    placeholderTextColor="#5a5a70"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View className="flex-row items-center justify-end gap-2">
                  <TouchableOpacity
                    className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08]"
                    onPress={() => setShowForgotModal(false)}
                  >
                    <Text className="text-xs text-[#c8c8d8]">Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="px-4 py-2 rounded-xl bg-[#6b8cff] hover:bg-[#5b7ce8] flex-row items-center gap-1.5"
                    onPress={handleSendResetPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="send" size={12} color="#fff" />
                        <Text className="text-white text-xs font-semibold">Enviar Link</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
