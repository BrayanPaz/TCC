import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { auth } from "../controllers/firebaseConfig";
import { getUserProfile } from "../controllers/userController";
import {
  isCurrentUserAdmin,
  loadAdminDashboard,
  AdminDashboardData,
} from "../controllers/adminController";
import { useLanguage } from "../context/LanguageContext";

function formatDate(value: any): string {
  if (!value) return "—";
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function AdminScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardData | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const profile = await getUserProfile(user.uid);
      const ok = isCurrentUserAdmin(profile);
      setAllowed(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      const dashboard = await loadAdminDashboard();
      setData(dashboard);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c12]">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/[0.07]">
        <View className="flex-row items-center gap-2">
          <Feather name="shield" size={16} color="#6b8cff" />
          <Text className="text-white font-semibold">{t("adminTitle")}</Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06]"
          onPress={() => router.replace("/")}
          accessibilityLabel={t("adminBack")}
        >
          <Feather name="arrow-left" size={13} color="#c8c8d8" />
          <Text className="text-[#c8c8d8] text-xs">{t("adminBack")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 py-5">
        <Text className="text-[#a0a0b8] text-xs mb-5">{t("adminSubtitle")}</Text>

        {allowed === false && (
          <View className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <Text className="text-red-300 text-sm">{t("adminAccessDenied")}</Text>
          </View>
        )}

        {loading && (
          <View className="items-center py-10">
            <ActivityIndicator color="#6b8cff" />
          </View>
        )}

        {allowed && data && (
          <>
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1 rounded-xl border border-white/[0.08] bg-[#13131c] p-4">
                <Text className="text-[10px] uppercase tracking-wider text-[#6b6b80] mb-1">
                  {t("adminUsers")}
                </Text>
                <Text className="text-2xl font-bold text-[#6b8cff]">{data.usersCount}</Text>
              </View>
              <View className="flex-1 rounded-xl border border-white/[0.08] bg-[#13131c] p-4">
                <Text className="text-[10px] uppercase tracking-wider text-[#6b6b80] mb-1">
                  {t("adminTranslations")}
                </Text>
                <Text className="text-2xl font-bold text-[#6b8cff]">{data.translationsCount}</Text>
              </View>
            </View>

            {data.error ? (
              <Text className="text-amber-400 text-xs mb-4">{data.error}</Text>
            ) : null}

            <Text className="text-white text-sm font-semibold mb-2">{t("adminUsers")}</Text>
            {data.users.length === 0 ? (
              <Text className="text-[#6b6b80] text-xs mb-6">{t("adminEmpty")}</Text>
            ) : (
              <View className="rounded-xl border border-white/[0.08] overflow-hidden mb-6">
                <View className="flex-row bg-white/[0.04] px-3 py-2">
                  <Text className="flex-[1.4] text-[10px] uppercase text-[#8888a0]">{t("adminColName")}</Text>
                  <Text className="flex-[1.6] text-[10px] uppercase text-[#8888a0]">{t("adminColEmail")}</Text>
                  <Text className="flex-1 text-[10px] uppercase text-[#8888a0]">{t("adminRole")}</Text>
                  <Text className="flex-1 text-[10px] uppercase text-[#8888a0]">{t("adminColCreated")}</Text>
                </View>
                {data.users.map((user) => (
                  <View key={user.uid} className="flex-row px-3 py-2.5 border-t border-white/[0.05]">
                    <Text className="flex-[1.4] text-xs text-white" numberOfLines={1}>
                      {user.displayName || "—"}
                    </Text>
                    <Text className="flex-[1.6] text-xs text-[#c8c8d8]" numberOfLines={1}>
                      {user.email || "—"}
                    </Text>
                    <Text className="flex-1 text-xs text-[#6b8cff]">
                      {user.role === "admin" ? t("adminRoleAdmin") : t("adminRoleUser")}
                    </Text>
                    <Text className="flex-1 text-xs text-[#8888a0]">{formatDate(user.createdAt)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text className="text-white text-sm font-semibold mb-2">{t("adminTranslations")}</Text>
            {data.translations.length === 0 ? (
              <Text className="text-[#6b6b80] text-xs">{t("adminEmpty")}</Text>
            ) : (
              <View className="rounded-xl border border-white/[0.08] overflow-hidden mb-8">
                {data.translations.slice(0, 40).map((item) => (
                  <View key={item.id} className="px-3 py-2.5 border-b border-white/[0.05]">
                    <Text className="text-xs text-white" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-[10px] text-[#6b6b80] mt-0.5">
                      {(item.sourceLang || "?").toUpperCase()} → {(item.targetLang || "?").toUpperCase()} •{" "}
                      {item.status} • {formatDate(item.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
