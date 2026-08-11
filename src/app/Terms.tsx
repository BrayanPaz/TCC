import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Terms() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      <View className="flex-row items-center p-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-white text-lg">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Termos de Uso</Text>
      </View>
      <ScrollView className="p-4">
        <Text className="text-white text-2xl font-bold mb-4">Termos e Condições de Uso</Text>
        <Text className="text-gray-300 text-base leading-relaxed mb-4">
          Bem-vindo ao nosso Aplicativo de Tradução. Ao acessar ou usar nosso serviço, você concorda com estes termos.
        </Text>
        
        <Text className="text-white text-lg font-bold mt-4 mb-2">1. Coleta de Dados e Privacidade (LGPD)</Text>
        <Text className="text-gray-300 text-base leading-relaxed mb-4">
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD), informamos que seus documentos, histórico de traduções e glossários são estritamente privados e armazenados com criptografia. Você tem o direito de solicitar a exclusão permanente de todos os seus dados a qualquer momento através das configurações da sua conta.
        </Text>

        <Text className="text-white text-lg font-bold mt-4 mb-2">2. Uso da Inteligência Artificial</Text>
        <Text className="text-gray-300 text-base leading-relaxed mb-4">
          O processamento das traduções é realizado por modelos de Inteligência Artificial terceirizados (ex: Google Gemini). Os textos submetidos são utilizados exclusivamente para o propósito da tradução momentânea, não sendo utilizados para treinar modelos abertos ou compartilhados publicamente.
        </Text>

        <Text className="text-white text-lg font-bold mt-4 mb-2">3. Conteúdo do Usuário</Text>
        <Text className="text-gray-300 text-base leading-relaxed mb-8">
          Você retém todos os direitos sobre os documentos originais que enviar. Não nos responsabilizamos por informações sensíveis contidas em documentos não editados que você venha a traduzir de forma imprópria.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
