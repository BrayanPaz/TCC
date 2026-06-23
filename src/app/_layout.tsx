import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Define a barra de status superior com texto claro para o Dark Mode */}
      <StatusBar style="light" backgroundColor="#121212" translucent />
      
      <Stack
        screenOptions={{
          // Oculta o header nativo em todas as telas para priorizar a interface customizada
          headerShown: false,
          // Garante que o fundo de transição entre as telas seja escuro, evitando flashes brancos
          contentStyle: { backgroundColor: '#121212' },
          animation: 'fade',
        }}
      >
        {/* Configuração explícita das rotas do repositório */}
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="LogIn" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="SignUp" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Home" 
          options={{ headerShown: false }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}