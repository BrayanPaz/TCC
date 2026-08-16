import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { legalStyles as styles } from '../styles/legalStyles';

export default function Privacy() {
  const router = useRouter();

  return (
    <SafeAreaView className={styles.container}>
      <View className={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mr-4">
          <Feather name="arrow-left" size={14} color="#6b8cff" />
          <Text className="text-[#6b8cff] text-xs font-medium ml-1.5">Voltar</Text>
        </TouchableOpacity>
        <Text className={styles.headerTitle}>Política de Privacidade</Text>
      </View>
      <ScrollView className={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text className={styles.pageTitle}>Privacidade e Governança de Dados</Text>
        
        <Text className={styles.sectionTitle}>Isolamento de Dados por Usuário</Text>
        <Text className={styles.paragraph}>
          Toda e qualquer requisição de tradução, histórico persistido e definições de glossário são protegidos por políticas de segurança a nível de linha (RLS) no banco de dados, sendo acessíveis unicamente mediante autenticação válida.
        </Text>

        <Text className={styles.sectionTitle}>Direito à Exclusão (LGPD)</Text>
        <Text className={styles.paragraph}>
          O usuário poderá, a qualquer tempo, solicitar o encerramento de sua conta e a remoção definitiva e irrecuperável de todo e qualquer dado pessoal ou técnico armazenado em nossos sistemas.
        </Text>
        
        <Text className={styles.sectionTitle}>Segurança de Comunicação</Text>
        <Text className={styles.lastParagraph}>
          As transmissões entre o cliente e os provedores de computação em nuvem utilizam protocolos criptografados (TLS/HTTPS).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
