import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function LoginScreen({ navigation }) {
  const [userType, setUserType] = useState(null); // 'customer', 'sales', 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    // Handle non-admin users via API
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use 'username' as the key for the identifier, which is stored in the 'email' state variable.
          username: email,
          password,
          role: userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed!');
      }

      // Store the token securely
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      await AsyncStorage.setItem('userId', String(data.user.id));

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (err) {
      setError(err.message);
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Renders the initial role selection screen
  if (!userType) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <View style={styles.headerContainer}>
          <View style={styles.logoPlaceholder}>
            <Icon name="cube" size={40} color="white" />
          </View>
          <Text style={styles.welcomeTitle}>Thames Cash & Carry</Text>
          <Text style={styles.subtitle}>Choose your portal to continue</Text>
        </View>
        
        <View style={styles.roleContainer}>
        <TouchableOpacity style={styles.roleButton} onPress={() => setUserType('customer')}>
          <View style={[styles.iconCircle, { backgroundColor: '#E6FFFA' }]}>
            <Icon name="person" size={24} color="#2a9d8f" />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleButtonTitle}>Trade Customer</Text>
            <Text style={styles.roleButtonSubtitle}>Access your account & orders</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.roleButton} onPress={() => setUserType('sales_rep')}>
          <View style={[styles.iconCircle, { backgroundColor: '#EBF8FF' }]}>
            <Icon name="briefcase" size={24} color="#3182CE" />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleButtonTitle}>Sales Representative</Text>
            <Text style={styles.roleButtonSubtitle}>Manage clients & sales</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.roleButton} onPress={() => setUserType('picker')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFF5F5' }]}>
            <Icon name="cube-outline" size={24} color="#E53E3E" />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleButtonTitle}>Warehouse Picker</Text>
            <Text style={styles.roleButtonSubtitle}>Process & pack orders</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.roleButton} onPress={() => setUserType('admin')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FAF5FF' }]}>
            <Icon name="shield-checkmark" size={24} color="#805AD5" />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleButtonTitle}>Administrator</Text>
            <Text style={styles.roleButtonSubtitle}>System management</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Renders the login form once a role is selected
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
      <View style={styles.loginHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => setUserType(null)}>
          <Icon name="arrow-back" size={24} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.loginTitle}>Welcome Back!</Text>
        <Text style={styles.loginSubtitle}>
          Login as {userType === 'sales_rep' ? 'Sales Representative' : userType.charAt(0).toUpperCase() + userType.slice(1)}
        </Text>
      </View>

      <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <Icon
          name={userType === 'admin' ? 'mail-outline' : 'person-circle-outline'}
          size={22}
          color="#6c757d"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={
            userType === 'admin'
              ? 'Email Address'
              : userType === 'customer'
              ? 'Customer ID'
              : userType === 'picker'
              ? 'Picker ID'
              : 'Sales ID'
          }
          value={email}
          onChangeText={setEmail}
          keyboardType={userType === 'admin' ? 'email-address' : 'default'}
          autoCapitalize="none"
          placeholderTextColor="#6c757d"
        />
      </View>
      <View style={styles.inputContainer}>
        <Icon name="lock-closed-outline" size={22} color="#6c757d" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#6c757d"
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>

      {userType === 'customer' && (
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={styles.registerLink}>Register here</Text></TouchableOpacity>
        </View>
      )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  headerContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1d3557',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeTitle: { fontSize: 28, fontWeight: '800', color: '#1d3557', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#718096', textAlign: 'center' },
  
  roleContainer: {
    paddingHorizontal: 24,
  },
  roleButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 16, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleTextContainer: { flex: 1 },
  roleButtonTitle: { color: '#2D3748', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  roleButtonSubtitle: { color: '#A0AEC0', fontSize: 13 },
  
  // Login Form Styles
  loginHeader: {
    paddingHorizontal: 24,
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loginTitle: { fontSize: 28, fontWeight: '800', color: '#1d3557', marginBottom: 8 },
  loginSubtitle: { fontSize: 16, color: '#718096' },
  
  formContainer: {
    paddingHorizontal: 24,
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    width: '100%', 
    height: 60, 
    marginBottom: 16, 
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16, color: '#2D3748' },
  loginButton: { 
    backgroundColor: '#1d3557', 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    width: '100%', 
    marginTop: 24,
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#e63946', marginBottom: 16, textAlign: 'center', backgroundColor: '#FFF5F5', padding: 10, borderRadius: 8, overflow: 'hidden' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { color: '#718096' },
  registerLink: { color: '#1d3557', fontWeight: 'bold' },
});
