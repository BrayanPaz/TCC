import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { UserProfile } from "./userController";

const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function isCurrentUserAdmin(profile?: UserProfile | null): boolean {
  const email = profile?.email || auth.currentUser?.email;
  if (isAdminEmail(email)) return true;
  return (profile as any)?.role === "admin";
}

export interface AdminUserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt?: any;
  role?: string;
}

export interface AdminTranslationRow {
  id: string;
  title: string;
  userId?: string;
  sourceLang?: string;
  targetLang?: string;
  status?: string;
  createdAt?: any;
}

export interface AdminDashboardData {
  users: AdminUserRow[];
  translations: AdminTranslationRow[];
  usersCount: number;
  translationsCount: number;
  error: string | null;
}

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const empty: AdminDashboardData = {
    users: [],
    translations: [],
    usersCount: 0,
    translationsCount: 0,
    error: null,
  };

  try {
    const usersSnap = await getDocs(query(collection(db, "users"), limit(200)));
    const users: AdminUserRow[] = usersSnap.docs.map((d) => {
      const data = d.data() as UserProfile & { role?: string };
      return {
        uid: d.id,
        email: data.email || null,
        displayName: data.displayName || null,
        createdAt: data.createdAt,
        role: data.role || (isAdminEmail(data.email) ? "admin" : "user"),
      };
    });

    let translations: AdminTranslationRow[] = [];
    try {
      const historySnap = await getDocs(
        query(collection(db, "history"), orderBy("createdAt", "desc"), limit(200))
      );
      translations = historySnap.docs.map((d) => {
        const data = d.data() as AdminTranslationRow;
        return {
          id: d.id,
          title: data.title || "—",
          userId: data.userId,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          status: data.status || "completed",
          createdAt: data.createdAt,
        };
      });
    } catch {
      const historySnap = await getDocs(query(collection(db, "history"), limit(200)));
      translations = historySnap.docs.map((d) => {
        const data = d.data() as AdminTranslationRow;
        return {
          id: d.id,
          title: data.title || "—",
          userId: data.userId,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          status: data.status || "completed",
          createdAt: data.createdAt,
        };
      });
    }

    return {
      users,
      translations,
      usersCount: users.length,
      translationsCount: translations.length,
      error: null,
    };
  } catch (err: any) {
    return {
      ...empty,
      error: err?.message || "Falha ao carregar dados administrativos.",
    };
  }
}
