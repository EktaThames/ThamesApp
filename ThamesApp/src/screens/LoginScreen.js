import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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
      <View style={styles.container}>
        <Text style={styles.welcomeTitle}>Welcome to ThamesCC</Text>
        <Text style={styles.subtitle}>Please select your role to login</Text>
        <TouchableOpacity style={styles.roleButton} onPress={() => setUserType('customer')}>
          <Icon name="person-outline" size={24} color="white" />
          <Text style={styles.roleButtonText}>Trade Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roleButton} onPress={() => setUserType('sales_rep')}>
          <Icon name="briefcase-outline" size={24} color="white" />
          <Text style={styles.roleButtonText}>Sales Representative</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roleButton} onPress={() => setUserType('admin')}>
          <Icon name="shield-checkmark-outline" size={24} color="white" />
          <Text style={styles.roleButtonText}>Admin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Renders the login form once a role is selected
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => setUserType(null)}>
        <Icon name="arrow-back-outline" size={24} color="#1d3557" />
      </TouchableOpacity>
      <Text style={styles.title}>{`${
        userType === 'sales_rep' ? 'Sales Rep' : userType.charAt(0).toUpperCase() + userType.slice(1)
      } Login`}</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f5f7', padding: 20 },
  welcomeTitle: { fontSize: 32, fontWeight: 'bold', color: '#1d3557', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#495057', marginBottom: 40, textAlign: 'center' },
  roleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1d3557', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, marginBottom: 15, width: '90%' },
  roleButtonText: { color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 15 },
  backButton: { position: 'absolute', top: 60, left: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1d3557', marginBottom: 30 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', width: '100%', height: 55, marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 16, color: '#212529' },
  loginButton: { backgroundColor: '#2a9d8f', padding: 16, borderRadius: 12, alignItems: 'center', width: '100%', marginTop: 10 },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: '#e63946', marginBottom: 10, textAlign: 'center' },
});
