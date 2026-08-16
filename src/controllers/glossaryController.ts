import { db, auth } from "./firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export interface GlossaryTerm {
  id?: string;
  userId?: string;
  original: string;
  translation: string;
}

/**
 * Busca todos os termos do glossário pertencentes ao usuário logado (LGPD/Isolamento)
 */
export async function getGlossaryTerms(): Promise<{ terms: GlossaryTerm[]; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { terms: [], error: "Usuário não autenticado." };
    }

    const q = query(collection(db, "glossary"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    const terms: GlossaryTerm[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      terms.push({
        id: d.id,
        original: data.original,
        translation: data.translation,
        userId: data.userId,
      });
    });

    return { terms, error: null };
  } catch (err: any) {
    return { terms: [], error: err.message || "Erro ao buscar glossário." };
  }
}

/**
 * Adiciona um novo termo no glossário do usuário logado
 */
export async function addGlossaryTerm(
  original: string,
  translation: string
): Promise<{ id: string | null; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { id: null, error: "Usuário não autenticado." };
    }

    const docRef = await addDoc(collection(db, "glossary"), {
      userId: user.uid,
      original: original.trim(),
      translation: translation.trim(),
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, error: null };
  } catch (err: any) {
    return { id: null, error: err.message || "Erro ao salvar termo." };
  }
}

/**
 * Remove um termo do glossário
 */
export async function deleteGlossaryTerm(id: string): Promise<{ error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { error: "Usuário não autenticado." };
    }

    await deleteDoc(doc(db, "glossary", id));
    return { error: null };
  } catch (err: any) {
    return { error: err.message || "Erro ao deletar termo." };
  }
}
