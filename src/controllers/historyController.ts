import { db, auth } from "./firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export interface TranslationHistoryItem {
  id?: string;
  userId?: string;
  title: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt?: any;
}

/**
 * Salva uma nova tradução no histórico do usuário
 */
export async function saveTranslationHistory(
  title: string,
  originalText: string,
  translatedText: string,
  sourceLang: string = "en",
  targetLang: string = "pt-BR"
): Promise<{ id: string | null; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { id: null, error: "Usuário não autenticado." };

    const docRef = await addDoc(collection(db, "history"), {
      userId: user.uid,
      title: title || "Documento sem título",
      originalText,
      translatedText,
      sourceLang,
      targetLang,
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, error: null };
  } catch (err: any) {
    return { id: null, error: err.message || "Erro ao salvar histórico." };
  }
}

/**
 * Carrega o histórico de traduções do usuário
 */
export async function getTranslationHistory(): Promise<{ items: TranslationHistoryItem[]; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { items: [], error: "Usuário não autenticado." };

    const q = query(
      collection(db, "history"),
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(q);
    const items: TranslationHistoryItem[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        title: data.title,
        originalText: data.originalText,
        translatedText: data.translatedText,
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
        createdAt: data.createdAt,
      });
    });

    return { items, error: null };
  } catch (err: any) {
    return { items: [], error: err.message || "Erro ao buscar histórico." };
  }
}

/**
 * Exclui um chat do histórico
 */
export async function deleteTranslationHistory(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await deleteDoc(doc(db, "history", id));
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao deletar histórico." };
  }
}
