import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { legalStyles as styles } from '../styles/legalStyles';

export default function Terms() {
  const router = useRouter();

  return (
    <SafeAreaView className={styles.container}>
      <View className={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mr-4">
          <Feather name="arrow-left" size={14} color="#6b8cff" />
          <Text className="text-[#6b8cff] text-xs font-medium ml-1.5">Voltar</Text>
        </TouchableOpacity>
        <Text className={styles.headerTitle}>Termos de Uso</Text>
      </View>
      <ScrollView className={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text className={styles.pageTitle}>Termos e Condições de Uso</Text>
        <Text className={styles.paragraph}>
          Ao acessar ou utilizar a plataforma Translatio, você concorda expressamente com as disposições aqui estabelecidas.
        </Text>
        
        <Text className={styles.sectionTitle}>1. Proteção de Dados e Conformidade com a LGPD</Text>
        <Text className={styles.paragraph}>
          Em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantimos que todos os textos, equações em LaTeX, glossários e documentos processados são estritamente confidenciais e vinculados unicamente ao seu identificador seguro de usuário.
        </Text>

        <Text className={styles.sectionTitle}>2. Processamento por Inteligência Artificial</Text>
        <Text className={styles.paragraph}>
          O serviço utiliza modelos de inteligência artificial de alta performance exclusivamente para a execução da tradução momentânea e estruturação de documentos, sem compartilhamento público ou reaproveitamento não autorizado.
        </Text>

        <Text className={styles.sectionTitle}>3. Propriedade Intelectual</Text>
        <Text className={styles.lastParagraph}>
          Todos os direitos sobre os textos originais e os documentos resultantes permanecem sob titularidade exclusiva do usuário.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
