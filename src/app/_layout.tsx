import "../styles/global.css";
import "katex/dist/katex.min.css";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../context/LanguageContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';

// Mantém a splash screen visível até tudo estar pronto
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Feather.font,
  });

  useEffect(() => {
    async function prepare() {
      if (!fontsLoaded) return;

      try {
        // Tempo mínimo de exibição para evitar flash (300ms)
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn('Erro ao preparar app:', e);
      } finally {
        // Esconde a splash screen somente depois das fontes de ícone estarem carregadas
        await SplashScreen.hideAsync();
        if (typeof document !== 'undefined') {
          document.getElementById('initial-loader')?.classList.add('initial-loader-hidden');
        }
      }
    }

    prepare();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require("../../assets/images/translatio-logo.png")}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
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
  loadingLogo: {
    width: 156,
    height: 156,
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