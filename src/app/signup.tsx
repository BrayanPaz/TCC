import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { signUpUser } from '../controllers/authController';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles as styles } from '../styles/authStyles';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('Aviso LGPD', 'Você precisa concordar com os Termos e Privacidade para prosseguir.');
      return;
    }
    
    setLoading(true);
    const { user, error } = await signUpUser(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Erro ao cadastrar', error);
    } else {
      Alert.alert('Sucesso!', 'Conta criada com sucesso.');
      router.replace('/');
    }
  };

  return (
    <SafeAreaView className={styles.container}>
      <View className={styles.card}>
        <View className={styles.headerContainer}>
          <Text className={styles.headerTitle}>Crie sua Conta</Text>
          <Text className={styles.headerSubtitle}>Junte-se a nós para traduções inteligentes.</Text>
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
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#5a5a70"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View className={styles.inputGroup}>
            <Text className={styles.inputLabel}>Confirmar Senha</Text>
            <TextInput 
              className={styles.inputField}
              placeholder="Repita sua senha"
              placeholderTextColor="#5a5a70"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity 
          className={styles.checkboxContainer} 
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <View className={`${styles.checkboxBox} ${agreedToTerms ? styles.checkboxChecked : styles.checkboxUnchecked}`}>
            {agreedToTerms && <Text className={styles.checkboxCheckmark}>✓</Text>}
          </View>
          <View className={styles.termsContainer}>
            <Text className={styles.footerText}>Eu concordo com os </Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text className={styles.footerLink}>Termos de Uso</Text>
            </TouchableOpacity>
            <Text className={styles.footerText}> e a </Text>
            <TouchableOpacity onPress={() => router.push('/privacy')}>
              <Text className={styles.footerLink}>Política de Privacidade</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          className={(!agreedToTerms || loading) ? styles.disabledButton : styles.primaryButton}
          onPress={handleSignUp}
          disabled={loading || !agreedToTerms}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={!agreedToTerms ? styles.disabledButtonText : styles.primaryButtonText}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <View className={styles.footerContainer}>
          <Text className={styles.footerText}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className={styles.footerLink}>Faça login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
