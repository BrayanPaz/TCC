import "../styles/global.css";
import "katex/dist/katex.min.css";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../context/LanguageContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, StyleSheet } from 'react-native';

// Mantém a splash screen visível até tudo estar pronto
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Tempo mínimo de exibição para evitar flash (300ms)
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn('Erro ao preparar app:', e);
      } finally {
        // Esconde a splash screen
        await SplashScreen.hideAsync();
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoMark}>
          <Text style={styles.logoBrace}>{"{"}</Text>
          <View style={styles.logoCenter}>
            <Text style={styles.logoA}>A</Text>
            <View style={styles.logoSlash} />
            <Text style={styles.logoKanji}>文</Text>
          </View>
          <Text style={styles.logoBrace}>{"}"}</Text>
        </View>
        <Text style={styles.loadingTitle}>Translatio</Text>
        <Text style={styles.loadingSubtitle}>Preparando tradução científica</Text>
      </View>
    );
  }

  return (
    <LanguageProvider>
      <AccessibilityProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#121212' },
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="signup"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="terms"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="privacy"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="admin"
          options={{ headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
      </AccessibilityProvider>
  </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c0c12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMark: {
    width: 156,
    height: 156,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#6b8cff',
    backgroundColor: '#10101a',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6b8cff',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  logoBrace: {
    color: '#6b8cff',
    fontSize: 68,
    fontWeight: '300',
    lineHeight: 82,
  },
  logoCenter: {
    width: 68,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoA: {
    position: 'absolute',
    left: 0,
    bottom: 4,
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
  },
  logoKanji: {
    position: 'absolute',
    right: 0,
    top: 2,
    color: '#dde5ff',
    fontSize: 34,
    fontWeight: '700',
  },
  logoSlash: {
    width: 6,
    height: 76,
    borderRadius: 999,
    backgroundColor: '#e8ecff',
    transform: [{ rotate: '23deg' }],
    opacity: 0.95,
  },
  loadingTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 22,
  },
  loadingSubtitle: {
    color: '#8888a0',
    fontSize: 12,
    marginTop: 6,
  },
});