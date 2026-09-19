import { auth } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User,
} from "firebase/auth";

export interface AuthResult {
  user: User | null;
  error: string | null;
  errorCode?: string | null;
  needsVerification?: boolean;
}

/**
 * Mapeia erros do Firebase Auth para mensagens amigáveis com diagnóstico detalhado
 */
export function mapAuthError(error: any): { message: string; code: string } {
  const code = error?.code || "unknown";
  console.error("[Translatio Auth Error]", {
    code,
    message: error?.message,
    fullError: error,
  });

  switch (code) {
    case "auth/operation-not-allowed":
      return {
        code,
        message:
          "O provedor Google não está ativado no Firebase Console. Acesse Authentication > Sign-in method e ative o Google (com um e-mail de suporte configurado).",
      };
    case "auth/unauthorized-domain":
      return {
        code,
        message:
          "Este domínio não está autorizado no Firebase. Acesse Firebase Console > Authentication > Configurações > Domínios autorizados e adicione o endereço atual (ex: localhost, 127.0.0.1 ou seu IP).",
      };
    case "auth/popup-blocked":
      return {
        code,
        message:
          "A janela pop-up foi bloqueada pelo navegador. Permita pop-ups para este site ou utilize a opção de login por redirecionamento.",
      };
    case "auth/popup-closed-by-user":
      return {
        code,
        message:
          "A janela do Google foi fechada antes de concluir o login. Se ela fechou sozinha imediatamente, verifique se o login com Google está ativado no Firebase Console ou tente pelo botão de redirecionamento.",
      };
    case "auth/cancelled-popup-request":
      return {
        code,
        message: "A tentativa de login com pop-up anterior foi cancelada.",
      };
    case "auth/configuration-not-found":
      return {
        code,
        message:
          "Configuração do provedor Google não encontrada no Firebase. Verifique se o projeto Firebase possui o serviço de autenticação ativo.",
      };
    case "auth/account-exists-with-different-credential":
      return {
        code,
        message:
          "Já existe uma conta cadastrada com este e-mail utilizando outro método de login (ex: e-mail e senha).",
      };
    case "auth/network-request-failed":
      return {
        code,
        message: "Falha de conexão com a rede. Verifique sua conexão com a internet.",
      };
    default:
      return {
        code,
        message: error?.message || "Erro inesperado ao realizar autenticação com o Google.",
      };
  }
}

/**
 * Login com E-mail e Senha
 */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return {
      user,
      error: null,
      errorCode: null,
      needsVerification: !user.emailVerified,
    };
  } catch (error: any) {
    console.error("[Translatio Auth Error] loginUser:", error?.code, error?.message);
    let msg = error.message || "Falha ao realizar login.";
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      msg = "E-mail ou senha incorretos.";
    } else if (error.code === "auth/user-not-found") {
      msg = "Nenhum usuário encontrado com este e-mail.";
    } else if (error.code === "auth/too-many-requests") {
      msg = "Muitas tentativas sem sucesso. Tente novamente mais tarde.";
    }
    return { user: null, error: msg, errorCode: error?.code || null };
  }
}

/**
 * Cadastro com E-mail, Senha e envio automático de Verificação de E-mail
 */
export async function signUpUser(email: string, password: string): Promise<AuthResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Envia e-mail de verificação oficial pelo Firebase
    try {
      await sendEmailVerification(user);
    } catch (verifErr) {
      console.warn("Falha ao enviar e-mail de verificação:", verifErr);
    }

    return { user, error: null, errorCode: null, needsVerification: true };
  } catch (error: any) {
    console.error("[Translatio Auth Error] signUpUser:", error?.code, error?.message);
    let msg = error.message || "Erro ao criar conta.";
    if (error.code === "auth/email-already-in-use") {
      msg = "Este e-mail já está cadastrado.";
    } else if (error.code === "auth/weak-password") {
      msg = "A senha deve ter no mínimo 6 caracteres.";
    } else if (error.code === "auth/invalid-email") {
      msg = "Endereço de e-mail inválido.";
    }
    return { user: null, error: msg, errorCode: error?.code || null };
  }
}

/**
 * Login / Cadastro direto com Conta Google (OAuth) via Popup
 */
export async function loginWithGoogle(): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const userCredential = await signInWithPopup(auth, provider);
    return { user: userCredential.user, error: null, errorCode: null };
  } catch (error: any) {
    const mapped = mapAuthError(error);
    return { user: null, error: mapped.message, errorCode: mapped.code };
  }
}

/**
 * Fallback: Login / Cadastro com Google via Redirecionamento completo
 */
export async function loginWithGoogleRedirect(): Promise<void> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error("[Translatio Auth Error] loginWithGoogleRedirect:", error);
    throw error;
  }
}

/**
 * Verifica se há resultado de autenticação pendente via redirecionamento
 */
export async function checkRedirectResult(): Promise<AuthResult | null> {
  try {
    const userCredential = await getRedirectResult(auth);
    if (userCredential && userCredential.user) {
      return { user: userCredential.user, error: null, errorCode: null };
    }
    return null;
  } catch (error: any) {
    const mapped = mapAuthError(error);
    return { user: null, error: mapped.message, errorCode: mapped.code };
  }
}

/**
 * Recuperação de Conta / Redefinição de Senha por E-mail
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Por favor, insira um e-mail válido." };
    }
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true, error: null };
  } catch (error: any) {
    let msg = error.message || "Erro ao solicitar recuperação de senha.";
    if (error.code === "auth/user-not-found") {
      msg = "Nenhum usuário cadastrado com este e-mail.";
    } else if (error.code === "auth/invalid-email") {
      msg = "E-mail inválido.";
    }
    return { success: false, error: msg };
  }
}

/**
 * Reenvia o e-mail de verificação para o usuário atual
 */
export async function resendVerificationEmail(): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: "Nenhum usuário logado." };
    }
    await sendEmailVerification(user);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao reenviar e-mail de verificação." };
  }
}

/**
 * Desconectar / Logout
 */
export async function logoutUser(): Promise<{ error: string | null }> {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || "Erro ao sair." };
  }
}
