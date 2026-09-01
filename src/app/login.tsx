import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser } from '../controllers/authController';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles as styles } from '../styles/authStyles';

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    
    setLoading(true);
    const { user, error } = await loginUser(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Erro ao entrar', error);
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView className={styles.container}>
      <View className={styles.card}>
        <View className={styles.headerContainer}>
          <Text className={styles.headerTitle}>Bem-vindo de volta</Text>
          <Text className={styles.headerSubtitle}>Entre para continuar suas traduções com IA.</Text>
        </View>

        <View className={styles.formContainer}>
          <View>
            <Text className={styles.inputLabel}>E-mail</Text>
            <TextInput 
              className={styles.inputField}
              placeholder="Digite seu e-mail"
              placeholderTextColor="#5a5a70"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className={styles.inputGroup}>
            <Text className={styles.inputLabel}>Senha</Text>
            <TextInput 
              className={styles.inputField}
              placeholder="Digite sua senha"
              placeholderTextColor="#5a5a70"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity 
          className={loading ? styles.disabledButton : styles.primaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={styles.primaryButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <View className={styles.footerContainer}>
          <Text className={styles.footerText}>Novo por aqui?</Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text className={styles.footerLink}>Crie sua conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
