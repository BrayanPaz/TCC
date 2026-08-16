import "../styles/global.css";
import "katex/dist/katex.min.css";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#121212" translucent />
      
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
      </Stack>
    </SafeAreaProvider>
  );
}