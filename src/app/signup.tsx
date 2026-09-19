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
  signUpUser,
  loginWithGoogle,
  loginWithGoogleRedirect,
  checkRedirectResult,
} from "../controllers/authController";
import { SafeAreaView } from "react-native-safe-area-context";
import { authStyles as styles } from "../styles/authStyles";
import { Feather } from "@expo/vector-icons";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Estado de erro de autenticação para exibição inline destacada
  const [authError, setAuthError] = useState<{ message: string; code?: string | null } | null>(null);

  // Modal de sucesso de cadastro e envio de verificação
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Checa se o usuário retornou de um login/cadastro por redirecionamento do Google
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
        console.error("Erro ao verificar retorno de redirecionamento no signup:", err);
      }
    }
    checkRedirect();
  }, []);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setAuthError({ message: "Por favor, preencha todos os campos do formulário.", code: "campos_vazios" });
      return;
    }
    if (password !== confirmPassword) {
      setAuthError({ message: "As senhas digitadas não coincidem.", code: "senhas_divergentes" });
      return;
    }
    if (!agreedToTerms) {
      setAuthError({
        message: "Você precisa concordar com os Termos de Uso e a Política de Privacidade para prosseguir.",
        code: "lgpd_obrigatorio",
      });
      return;
    }

    setLoading(true);
    setAuthError(null);
    const { user, error, errorCode } = await signUpUser(email, password);
    setLoading(false);

    if (error) {
      setAuthError({ message: error, code: errorCode });
    } else if (user) {
      setShowSuccessModal(true);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!agreedToTerms) {
      setAuthError({
        message: "Você precisa marcar a caixa de consentimento dos Termos e Privacidade antes de continuar com o Google.",
        code: "lgpd_obrigatorio",
      });
      return;
    }

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

  const handleGoogleRedirectSignUp = async () => {
    if (!agreedToTerms) {
      setAuthError({
        message: "Você precisa marcar a caixa de consentimento dos Termos e Privacidade antes de continuar.",
        code: "lgpd_obrigatorio",
      });
      return;
    }

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
          <Text className={styles.headerTitle}>Crie sua Conta</Text>
          <Text className={styles.headerSubtitle}>
            Junte-se à plataforma acadêmica de tradução e LaTeX com IA.
          </Text>
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
                  onPress={handleGoogleRedirectSignUp}
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

        {/* BOTÃO CADASTRO COM GOOGLE */}
        <TouchableOpacity
          className="w-full py-2.5 px-4 rounded-xl bg-white/[0.07] border border-white/10 flex-row items-center justify-center gap-3 hover:bg-white/[0.12] active:scale-98 transition-all mb-4"
          onPress={handleGoogleSignUp}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#6b8cff" />
          ) : (
            <>
              <View className="w-4 h-4 items-center justify-center">
                <Text className="text-sm font-bold text-[#6b8cff]">G</Text>
              </View>
              <Text className="text-white text-xs font-semibold">Cadastrar com o Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divisor "OU" */}
        <View className="flex-row items-center my-2">
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
            <Text className={styles.inputLabel}>Senha</Text>
            <TextInput
              className={styles.inputField}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#5a5a70"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View className={styles.inputGroup}>
            <Text className={styles.inputLabel}>Confirmar Senha</Text>
            <TextInput
              className={styles.inputField}
              placeholder="Repita sua senha"
              placeholderTextColor="#5a5a70"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* Checkbox Termos de Uso e LGPD */}
        <TouchableOpacity
          className={styles.checkboxContainer}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <View
            className={`${styles.checkboxBox} ${
              agreedToTerms ? styles.checkboxChecked : styles.checkboxUnchecked
            }`}
          >
            {agreedToTerms && <Text className={styles.checkboxCheckmark}>✓</Text>}
          </View>
          <View className={styles.termsContainer}>
            <Text className={styles.footerText}>Eu concordo com os </Text>
            <TouchableOpacity onPress={() => router.push("/terms")}>
              <Text className={styles.footerLink}>Termos de Uso</Text>
            </TouchableOpacity>
            <Text className={styles.footerText}> e a </Text>
            <TouchableOpacity onPress={() => router.push("/privacy")}>
              <Text className={styles.footerLink}>Política de Privacidade</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Botão Cadastrar */}
        <TouchableOpacity
          className={!agreedToTerms || loading ? styles.disabledButton : styles.primaryButton}
          onPress={handleSignUp}
          disabled={loading || !agreedToTerms}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={!agreedToTerms ? styles.disabledButtonText : styles.primaryButtonText}>
              Cadastrar Conta
            </Text>
          )}
        </TouchableOpacity>

        <View className={styles.footerContainer}>
          <Text className={styles.footerText}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className={styles.footerLink}>Faça login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MODAL DE CONTA CRIADA COM VERIFICAÇÃO DE E-MAIL ── */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => router.replace("/")}
      >
        <View className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <View className="w-full max-w-sm rounded-2xl bg-[#13131c] border border-white/10 p-6 shadow-2xl items-center">
            <View className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 items-center justify-center mb-3">
              <Feather name="mail" size={24} color="#10b981" />
            </View>

            <Text className="text-white font-bold text-base text-center mb-1">
              Conta criada com sucesso!
            </Text>

            <Text className="text-[#a0a0b8] text-xs text-center leading-relaxed mb-4">
              Enviamos um link de confirmação para o seu e-mail{" "}
              <Text className="text-white font-medium">{email}</Text>. Por favor, confirme seu endereço para manter sua conta protegida.
            </Text>

            <TouchableOpacity
              className="w-full py-2.5 rounded-xl bg-[#6b8cff] items-center"
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/");
              }}
            >
              <Text className="text-white text-xs font-semibold">Ir para o Translatio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
