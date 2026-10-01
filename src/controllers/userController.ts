import { auth, db } from "./firebaseConfig";
import {
  User,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: "admin" | "user";
  createdAt?: any;
  updatedAt?: any;
}

const LOCAL_PROFILE_KEY = "translatio_user_profile_";

function getLocalProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_PROFILE_KEY}${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalProfile(uid: string, profile: UserProfile): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(`${LOCAL_PROFILE_KEY}${uid}`, JSON.stringify(profile));
  } catch (err) {
    console.warn("Aviso ao salvar perfil no localStorage:", err);
  }
}

/**
 * Garante que o documento do usuário exista em Firestore `users/{uid}`.
 * Para novas contas, aproveita o nome e foto do provedor (ex: Google) ou dados fornecidos no cadastro.
 * Possui fallback transparente para LocalStorage caso o Firestore esteja sem regras de permissão.
 */
export async function ensureUserProfile(
  user: User,
  customDisplayName?: string
): Promise<UserProfile> {
  const initialDisplayName =
    customDisplayName?.trim() ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Usuário";

  const initialPhotoURL = user.photoURL || null;

  // Se o user do Firebase Auth ainda não possui displayName, atualiza
  if (!user.displayName && initialDisplayName) {
    try {
      await updateProfile(user, { displayName: initialDisplayName });
    } catch (e) {
      console.warn("Aviso ao atualizar displayName no Firebase Auth:", e);
    }
  }

  const profileObj: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: initialDisplayName,
    photoURL: initialPhotoURL,
  };

  // Salva no cache local imediatamente (garante funcionamento offline e sem erros)
  saveLocalProfile(user.uid, profileObj);

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // Se não tinha foto no Firestore mas agora o usuário tem (ex: login com Google posterior)
      if (!data.photoURL && user.photoURL) {
        await updateDoc(userRef, {
          photoURL: user.photoURL,
          updatedAt: serverTimestamp(),
        });
        data.photoURL = user.photoURL;
      }
      saveLocalProfile(user.uid, data);
      return data;
    }

    const newProfile: UserProfile = {
      ...profileObj,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, newProfile);
    saveLocalProfile(user.uid, newProfile);
    return newProfile;
  } catch (error: any) {
    // Trata erro de permissão (permission-denied) sem disparar o LogBox vermelho do Expo
    console.warn(
      "[Translatio Profile] Aviso: Coleção 'users' no Firestore sem permissão configurada. Usando perfil local/Firebase Auth."
    );
    return profileObj;
  }
}

/**
 * Obtém o perfil atualizado do usuário no Firestore (ou fallback do localStorage / Firebase Auth)
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const local = getLocalProfile(uid);

  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      saveLocalProfile(uid, data);
      return data;
    }
  } catch (error) {
    // Silencia erro de regras do Firestore para não disparar o LogBox vermelho
  }

  if (local) return local;

  const current = auth.currentUser;
  if (current && current.uid === uid) {
    const fallback: UserProfile = {
      uid: current.uid,
      email: current.email,
      displayName: current.displayName || current.email?.split("@")[0] || "Usuário",
      photoURL: current.photoURL || null,
    };
    saveLocalProfile(uid, fallback);
    return fallback;
  }

  return null;
}

/**
 * Atualiza o nome de exibição e/ou foto de perfil no Firestore e no Firebase Auth
 */
export async function updateUserProfileData(
  displayName: string,
  photoURL?: string | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      return { success: false, error: "O nome não pode ficar vazio." };
    }

    // 1. Atualiza no Firebase Auth (sempre permitido para o próprio usuário)
    const authUpdatePayload: { displayName: string; photoURL?: string | null } = {
      displayName: trimmedName,
    };

    if (photoURL !== undefined) {
      if (photoURL === null) {
        authUpdatePayload.photoURL = "";
      } else if (photoURL.length < 2000) {
        authUpdatePayload.photoURL = photoURL;
      }
    }

    await updateProfile(user, authUpdatePayload);

    // 2. Atualiza no cache LocalStorage
    const updatedProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: trimmedName,
      photoURL: photoURL !== undefined ? photoURL : (user.photoURL || null),
    };
    saveLocalProfile(user.uid, updatedProfile);

    // 3. Tenta persistir no Firestore se a coleção 'users' estiver liberada
    try {
      const userRef = doc(db, "users", user.uid);
      const firestorePayload: any = {
        displayName: trimmedName,
        updatedAt: serverTimestamp(),
      };

      if (photoURL !== undefined) {
        firestorePayload.photoURL = photoURL;
      }

      await setDoc(userRef, firestorePayload, { merge: true });
    } catch (fsErr) {
      console.warn(
        "[Translatio Profile] Perfil salvo no Auth e localmente. Firestore 'users' pendente de regras."
      );
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.warn("Aviso ao atualizar perfil do usuário:", error);
    return {
      success: false,
      error: error.message || "Erro ao salvar alterações no perfil.",
    };
  }
}

/**
 * Converte e comprime uma imagem selecionada pelo usuário em um Data URL leve (JPEG 256x256)
 * Totalmente executado no navegador com Canvas HTML5, sem dependência externa de Storage.
 */
export async function compressImageToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao processar o formato da imagem."));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(reader.result as string);
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve(dataUrl);
        } catch (e) {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Exclusão definitiva de conta com remoção em cascata (Direito ao Esquecimento - LGPD):
 * 1. Exclui todos os documentos de traduções em `history` do usuário
 * 2. Exclui todas as pastas em `chatGroups` do usuário
 * 3. Exclui todos os termos do glossário em `glossary` do usuário
 * 4. Exclui o documento em `users/{uid}`
 * 5. Limpa caches locais no `localStorage`
 * 6. Exclui a conta no Firebase Authentication
 */
export async function deleteUserAccountAndAllData(): Promise<{
  success: boolean;
  error: string | null;
  requiresRecentLogin?: boolean;
}> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: "Nenhum usuário conectado para exclusão." };
    }

    const uid = user.uid;

    // 1. Apagar todo o histórico de traduções do usuário
    try {
      const historyQuery = query(collection(db, "history"), where("userId", "==", uid));
      const historySnap = await getDocs(historyQuery);
      const batchHistory = writeBatch(db);
      historySnap.forEach((docSnap) => {
        batchHistory.delete(docSnap.ref);
      });
      if (historySnap.size > 0) {
        await batchHistory.commit();
      }
    } catch (e) {
      console.warn("Erro ao apagar histórico durante exclusão de conta:", e);
    }

    // 2. Apagar todas as pastas / grupos do usuário
    try {
      const groupsQuery = query(collection(db, "chatGroups"), where("userId", "==", uid));
      const groupsSnap = await getDocs(groupsQuery);
      const batchGroups = writeBatch(db);
      groupsSnap.forEach((docSnap) => {
        batchGroups.delete(docSnap.ref);
      });
      if (groupsSnap.size > 0) {
        await batchGroups.commit();
      }
    } catch (e) {
      console.warn("Erro ao apagar grupos durante exclusão de conta:", e);
    }

    // 3. Apagar todos os termos do glossário do usuário
    try {
      const glossaryQuery = query(collection(db, "glossary"), where("userId", "==", uid));
      const glossarySnap = await getDocs(glossaryQuery);
      const batchGlossary = writeBatch(db);
      glossarySnap.forEach((docSnap) => {
        batchGlossary.delete(docSnap.ref);
      });
      if (glossarySnap.size > 0) {
        await batchGlossary.commit();
      }
    } catch (e) {
      console.warn("Erro ao apagar glossário durante exclusão de conta:", e);
    }

    // 4. Apagar perfil do usuário no Firestore
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (e) {
      console.warn("Erro ao apagar perfil no Firestore durante exclusão de conta:", e);
    }

    // 5. Limpar armazenamento local (LocalStorage)
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(`translatio_chat_groups_${uid}`);
        localStorage.removeItem(`translatio_chat_history_${uid}`);
        localStorage.removeItem(`translatio_user_profile_${uid}`);
      } catch (err) {
        console.warn("Erro ao limpar localStorage:", err);
      }
    }

    // 6. Excluir conta de autenticação no Firebase Auth
    try {
      await deleteUser(user);
    } catch (authErr: any) {
      if (authErr.code === "auth/requires-recent-login") {
        return {
          success: false,
          error:
            "Por motivos de segurança, a exclusão da conta exige que você tenha feito login recentemente. Faça logout e login novamente para prosseguir.",
          requiresRecentLogin: true,
        };
      }
      throw authErr;
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Erro ao excluir conta e dados do usuário:", error);
    return {
      success: false,
      error: error.message || "Falha ao processar a exclusão da conta.",
    };
  }
}
