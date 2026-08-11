import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Privacy() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      <View className="flex-row items-center p-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-white text-lg">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Política de Privacidade</Text>
      </View>
      <ScrollView className="p-4">
        <Text className="text-white text-2xl font-bold mb-4">Privacidade e Proteção de Dados</Text>
        
        <Text className="text-white text-lg font-bold mt-4 mb-2">Seus Dados, Sua Propriedade</Text>
        <Text className="text-gray-300 text-base leading-relaxed mb-4">
          Nós tratamos a sua privacidade com a máxima seriedade. Todas as traduções realizadas, documentos upados e configurações de glossário são vinculados exclusivamente ao seu identificador de usuário (UID). Nossa infraestrutura de banco de dados utiliza Row Level Security (RLS) para garantir que ninguém, além de você, possa acessar seus arquivos.
        </Text>

        <Text className="text-white text-lg font-bold mt-4 mb-2">Direito ao Esquecimento</Text>
        <Text className="text-gray-300 text-base leading-relaxed mb-4">
          Em atendimento à LGPD, você possui o direito ao esquecimento. Isso significa que você pode deletar sua conta a qualquer momento, o que irá desencadear a exclusão imediata e irreversível de todos os seus documentos armazenados, histórico de traduções e termos do glossário dos nossos servidores.
        </Text>
        
        <Text className="text-white text-lg font-bold mt-4 mb-2">Armazenamento em Nuvem</Text>
        <Text className="text-gray-300 text-base leading-relaxed mb-8">
          Utilizamos serviços de nuvem seguros (Supabase/Firebase) para gerenciar o armazenamento. Arquivos temporários processados pela Inteligência Artificial não são utilizados para enriquecer o modelo e são descartados assim que a operação é concluída.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
