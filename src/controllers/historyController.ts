import { db, auth } from "./firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
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
  groupId?: string | null;
  groupName?: string | null;
  status?: "completed" | "paused_terms";
  identifiedTerms?: any[];
  phase1Data?: any;
  customInstruction?: string;
}

export interface ChatGroup {
  id: string;
  userId?: string;
  name: string;
  createdAt?: any;
}

const LOCAL_GROUPS_KEY = "translatio_chat_groups_";

function getLocalGroups(userId: string): ChatGroup[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_GROUPS_KEY}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGroups(userId: string, groups: ChatGroup[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(`${LOCAL_GROUPS_KEY}${userId}`, JSON.stringify(groups));
  } catch (err) {
    console.error("Erro ao salvar grupos no localStorage:", err);
  }
}

const LOCAL_HISTORY_KEY = "translatio_chat_history_";

/**
 * Sanitiza recursivamente qualquer objeto removendo campos undefined (incompatíveis com Firestore)
 */
function deepCleanObject(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => deepCleanObject(item)).filter((item) => item !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = deepCleanObject(val);
    }
  }
  return clean;
}

function getLocalHistory(userId: string): TranslationHistoryItem[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_HISTORY_KEY}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(userId: string, items: TranslationHistoryItem[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(`${LOCAL_HISTORY_KEY}${userId}`, JSON.stringify(items));
  } catch (err) {
    console.warn("Aviso ao salvar histórico no localStorage:", err);
  }
}

/**
 * Salva uma nova tradução no histórico do usuário com persistência imediata dupla (Local + Firestore)
 */
export async function saveTranslationHistory(
  title: string,
  originalText: string,
  translatedText: string,
  sourceLang: string = "en",
  targetLang: string = "pt-BR",
  groupId?: string | null,
  groupName?: string | null,
  status: "completed" | "paused_terms" = "completed",
  identifiedTerms: any[] = [],
  phase1Data: any = null,
  customInstruction: string = ""
): Promise<{ id: string | null; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("Tentativa de salvar histórico sem usuário logado.");
      return { id: null, error: "Usuário não autenticado." };
    }

    const tempId = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const nowIso = new Date().toISOString();

    const localItem: TranslationHistoryItem = {
      id: tempId,
      userId: user.uid,
      title: title || "Documento sem título",
      originalText: originalText || "",
      translatedText: translatedText || "",
      sourceLang: sourceLang || "en",
      targetLang: targetLang || "pt-BR",
      status,
      identifiedTerms: identifiedTerms || [],
      phase1Data: phase1Data || null,
      customInstruction: customInstruction || "",
      createdAt: nowIso,
      groupId: groupId || null,
      groupName: groupName || null,
    };

    // 1. Salva imediatamente no localStorage (garantia de permanência que nunca some!)
    const local = getLocalHistory(user.uid);
    const updatedLocal = [localItem, ...local.filter((it) => it.id !== tempId)];
    saveLocalHistory(user.uid, updatedLocal);

    // 2. Prepara e sanitiza payload para o Firestore
    const rawPayload: any = {
      userId: user.uid,
      title: title || "Documento sem título",
      originalText: originalText || "",
      translatedText: translatedText || "",
      sourceLang: sourceLang || "en",
      targetLang: targetLang || "pt-BR",
      status,
      identifiedTerms: identifiedTerms || [],
      phase1Data: phase1Data || null,
      customInstruction: customInstruction || "",
      createdAt: serverTimestamp(),
    };

    if (groupId) {
      rawPayload.groupId = groupId;
      rawPayload.groupName = groupName || null;
    }

    const cleanPayload = deepCleanObject(rawPayload);
    const docRef = await addDoc(collection(db, "history"), cleanPayload);

    // 3. Atualiza o ID do item local com o ID definitivo do Firestore
    if (docRef?.id) {
      const synced = updatedLocal.map((it) => (it.id === tempId ? { ...it, id: docRef.id } : it));
      saveLocalHistory(user.uid, synced);
      return { id: docRef.id, error: null };
    }

    return { id: tempId, error: null };
  } catch (err: any) {
    console.error("[Translatio History] Erro ao salvar histórico:", err);
    return { id: null, error: err.message || "Erro ao salvar histórico." };
  }
}

/**
 * Atualiza campos de um documento no histórico (Local + Firestore)
 */
export async function updateTranslationHistory(
  id: string,
  updates: Partial<TranslationHistoryItem>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = auth.currentUser;
    const cleanUpdates = deepCleanObject(updates);

    // Atualiza localmente primeiro
    if (user) {
      const local = getLocalHistory(user.uid);
      const updated = local.map((item) =>
        item.id === id ? { ...item, ...cleanUpdates, updatedAt: new Date().toISOString() } : item
      );
      saveLocalHistory(user.uid, updated);
    }

    // Se o id for local e ainda não salvo no Firestore, não tenta updateDoc com id local
    if (!id.startsWith("hist_")) {
      await updateDoc(doc(db, "history", id), cleanUpdates);
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Translatio History] Erro ao atualizar documento:", err);
    return { success: false, error: err.message || "Erro ao atualizar histórico." };
  }
}

/**
 * Carrega o histórico de traduções do usuário com merge Firestore + Local e ordenação cronológica decrescente
 */
export async function getTranslationHistory(): Promise<{ items: TranslationHistoryItem[]; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { items: [], error: "Usuário não autenticado." };

    const localList = getLocalHistory(user.uid);

    try {
      const q = query(
        collection(db, "history"),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(q);
      const firestoreItems: TranslationHistoryItem[] = [];

      snapshot.forEach((d) => {
        const data = d.data();
        firestoreItems.push({
          id: d.id,
          title: data.title || "Documento sem título",
          originalText: data.originalText || "",
          translatedText: data.translatedText || "",
          sourceLang: data.sourceLang || "en",
          targetLang: data.targetLang || "pt-BR",
          createdAt: data.createdAt,
          groupId: data.groupId || null,
          groupName: data.groupName || null,
          status: data.status || "completed",
          identifiedTerms: Array.isArray(data.identifiedTerms) ? data.identifiedTerms : [],
          phase1Data: data.phase1Data || null,
          customInstruction: data.customInstruction || "",
        });
      });

      // Merge sem duplicação mantendo IDs
      const map = new Map<string, TranslationHistoryItem>();
      localList.forEach((it) => { if (it.id) map.set(it.id, it); });
      firestoreItems.forEach((it) => { if (it.id) map.set(it.id, it); });

      const merged = Array.from(map.values());

      // Ordena por data decrescente (mais recentes primeiro)
      merged.sort((a, b) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val === "object" && val.toMillis) return val.toMillis();
          if (typeof val === "object" && val.seconds) return val.seconds * 1000;
          const parsed = new Date(val).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        return getMs(b.createdAt) - getMs(a.createdAt);
      });

      saveLocalHistory(user.uid, merged);
      return { items: merged, error: null };
    } catch (fsErr) {
      console.warn("Aviso ao buscar histórico no Firestore, usando fallback local:", fsErr);
      return { items: localList, error: null };
    }
  } catch (err: any) {
    return { items: [], error: err.message || "Erro ao buscar histórico." };
  }
}

/**
 * Exclui um chat do histórico (Local + Firestore)
 */
export async function deleteTranslationHistory(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (user) {
      const local = getLocalHistory(user.uid);
      saveLocalHistory(user.uid, local.filter((i) => i.id !== id));
    }

    if (!id.startsWith("hist_")) {
      await deleteDoc(doc(db, "history", id));
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao deletar histórico." };
  }
}

/**
 * Renomeia o título de um chat no histórico (Local + Firestore)
 */
export async function renameTranslationHistory(
  id: string,
  newTitle: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!newTitle.trim()) {
      return { success: false, error: "O título não pode ser vazio." };
    }
    const cleanTitle = newTitle.trim();
    const user = auth.currentUser;
    if (user) {
      const local = getLocalHistory(user.uid);
      saveLocalHistory(user.uid, local.map((i) => (i.id === id ? { ...i, title: cleanTitle } : i)));
    }

    if (!id.startsWith("hist_")) {
      await updateDoc(doc(db, "history", id), {
        title: cleanTitle,
      });
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao renomear histórico." };
  }
}

/**
 * Associa ou remove um chat de uma pasta/grupo
 */
export async function assignChatToGroup(
  chatId: string,
  groupId: string | null,
  groupName?: string | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (user) {
      const local = getLocalHistory(user.uid);
      saveLocalHistory(
        user.uid,
        local.map((i) => (i.id === chatId ? { ...i, groupId: groupId || null, groupName: groupName || null } : i))
      );
    }

    if (!chatId.startsWith("hist_")) {
      await updateDoc(doc(db, "history", chatId), {
        groupId: groupId || null,
        groupName: groupName || null,
      });
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao mover chat de grupo." };
  }
}

/**
 * Busca todas as pastas/grupos de chats do usuário
 */
export async function getChatGroups(): Promise<{ groups: ChatGroup[]; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { groups: [], error: "Usuário não autenticado." };

    const localList = getLocalGroups(user.uid);

    try {
      const q = query(
        collection(db, "chatGroups"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const firestoreGroups: ChatGroup[] = [];

      snapshot.forEach((d) => {
        const data = d.data();
        firestoreGroups.push({
          id: d.id,
          userId: data.userId,
          name: data.name,
          createdAt: data.createdAt,
        });
      });

      // Merge mantendo id único
      const mergedMap = new Map<string, ChatGroup>();
      localList.forEach((g) => mergedMap.set(g.id, g));
      firestoreGroups.forEach((g) => mergedMap.set(g.id, g));

      const merged = Array.from(mergedMap.values());
      saveLocalGroups(user.uid, merged);
      return { groups: merged, error: null };
    } catch {
      // Se Firestore chatGroups tiver regras restritas, fallback transparente para o localList
      return { groups: localList, error: null };
    }
  } catch (err: any) {
    return { groups: [], error: err.message || "Erro ao buscar grupos." };
  }
}

/**
 * Cria uma nova pasta/grupo de chats
 */
export async function createChatGroup(
  name: string
): Promise<{ group: ChatGroup | null; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { group: null, error: "Usuário não autenticado." };

    const cleanName = name.trim();
    if (!cleanName) return { group: null, error: "O nome do grupo não pode ser vazio." };

    const groupId = "grp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newGroup: ChatGroup = {
      id: groupId,
      userId: user.uid,
      name: cleanName,
      createdAt: new Date().toISOString(),
    };

    // Salva localmente garantido
    const local = getLocalGroups(user.uid);
    local.push(newGroup);
    saveLocalGroups(user.uid, local);

    // Tenta salvar no Firestore se coleção existir
    try {
      await addDoc(collection(db, "chatGroups"), {
        userId: user.uid,
        name: cleanName,
        createdAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("Aviso Firestore ao salvar chatGroup:", fsErr);
    }

    return { group: newGroup, error: null };
  } catch (err: any) {
    return { group: null, error: err.message || "Erro ao criar grupo." };
  }
}

/**
 * Renomeia uma pasta/grupo existente
 */
export async function renameChatGroup(
  groupId: string,
  newName: string,
  historyItems: TranslationHistoryItem[] = []
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Usuário não autenticado." };

    const cleanName = newName.trim();
    if (!cleanName) return { success: false, error: "O nome não pode ser vazio." };

    // Atualiza local
    const local = getLocalGroups(user.uid);
    const updated = local.map((g) => (g.id === groupId ? { ...g, name: cleanName } : g));
    saveLocalGroups(user.uid, updated);

    // Atualiza os chats associados a esse grupo no Firestore
    const chatsInGroup = historyItems.filter((item) => item.groupId === groupId && item.id);
    for (const chat of chatsInGroup) {
      if (chat.id) {
        await updateDoc(doc(db, "history", chat.id), { groupName: cleanName });
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao renomear grupo." };
  }
}

/**
 * Exclui uma pasta/grupo, com opção em cascata (apagar chats) ou apenas desagrupar
 */
export async function deleteChatGroup(
  groupId: string,
  deleteChatsCascade: boolean,
  historyItems: TranslationHistoryItem[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Usuário não autenticado." };

    // Filtra chats do grupo
    const chatsInGroup = historyItems.filter((item) => item.groupId === groupId && item.id);

    if (deleteChatsCascade) {
      // Exclui todos os chats da pasta permanentemente
      for (const chat of chatsInGroup) {
        if (chat.id) {
          await deleteDoc(doc(db, "history", chat.id));
        }
      }
    } else {
      // Mantém os chats, mas remove o vínculo do grupo
      for (const chat of chatsInGroup) {
        if (chat.id) {
          await updateDoc(doc(db, "history", chat.id), {
            groupId: null,
            groupName: null,
          });
        }
      }
    }

    // Remove do local
    const local = getLocalGroups(user.uid);
    const updated = local.filter((g) => g.id !== groupId);
    saveLocalGroups(user.uid, updated);

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao excluir grupo." };
  }
}

/**
 * Exporta todos os dados do usuário em JSON para conformidade LGPD
 */
export function exportUserDataAsJSON(
  userEmail: string,
  history: TranslationHistoryItem[],
  groups: ChatGroup[]
): void {
  try {
    const exportData = {
      userEmail,
      exportedAt: new Date().toISOString(),
      groups,
      history,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translatio_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Erro ao exportar dados:", err);
  }
}

/**
 * Importa histórico e pastas a partir de um backup JSON
 */
export async function importUserDataFromJSON(
  jsonString: string
): Promise<{ importedChats: number; importedGroups: number; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) return { importedChats: 0, importedGroups: 0, error: "Usuário não autenticado." };

    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") {
      return { importedChats: 0, importedGroups: 0, error: "Arquivo JSON inválido." };
    }

    const importedHistoryList: any[] = Array.isArray(parsed.history) ? parsed.history : [];
    const importedGroupsList: any[] = Array.isArray(parsed.groups) ? parsed.groups : [];

    if (importedHistoryList.length === 0 && importedGroupsList.length === 0) {
      return { importedChats: 0, importedGroups: 0, error: "O arquivo JSON não contém histórico ou grupos válidos." };
    }

    // 1. Importar Pastas / Grupos
    const currentLocalGroups = getLocalGroups(user.uid);
    const groupMap = new Map<string, ChatGroup>();
    currentLocalGroups.forEach((g) => groupMap.set(g.id, g));

    let importedGroupsCount = 0;
    for (const grp of importedGroupsList) {
      if (grp.name) {
        const id = grp.id || ("grp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
        if (!groupMap.has(id)) {
          const newGrp: ChatGroup = {
            id,
            userId: user.uid,
            name: String(grp.name).trim(),
            createdAt: grp.createdAt || new Date().toISOString(),
          };
          groupMap.set(id, newGrp);
          importedGroupsCount++;

          try {
            await addDoc(collection(db, "chatGroups"), {
              userId: user.uid,
              name: newGrp.name,
              createdAt: serverTimestamp(),
            });
          } catch {}
        }
      }
    }
    saveLocalGroups(user.uid, Array.from(groupMap.values()));

    // 2. Importar Chats para o Firestore
    let importedChatsCount = 0;
    for (const item of importedHistoryList) {
      if (item.title && (item.originalText || item.translatedText)) {
        await addDoc(collection(db, "history"), {
          userId: user.uid,
          title: item.title,
          originalText: item.originalText || "",
          translatedText: item.translatedText || "",
          sourceLang: item.sourceLang || "en",
          targetLang: item.targetLang || "pt-BR",
          groupId: item.groupId || null,
          groupName: item.groupName || null,
          status: item.status || "completed",
          identifiedTerms: Array.isArray(item.identifiedTerms) ? item.identifiedTerms : [],
          phase1Data: item.phase1Data || null,
          customInstruction: item.customInstruction || "",
          createdAt: serverTimestamp(),
        });
        importedChatsCount++;
      }
    }

    return {
      importedChats: importedChatsCount,
      importedGroups: importedGroupsCount,
      error: null,
    };
  } catch (err: any) {
    return { importedChats: 0, importedGroups: 0, error: err.message || "Erro ao ler arquivo de importação." };
  }
}

