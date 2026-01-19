import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';
import { API_URL } from '../config/api';

export default function AdminUploadScreen({ navigation }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all files to ensure it's visible in the picker
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        if (selectedFile.name.toLowerCase().endsWith('.csv')) {
            setFile(selectedFile);
        } else {
            Alert.alert('Invalid File', 'Please select a .csv file.');
        }
      }
    } catch (err) {
      console.log('Error picking document: ', err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      formData.append('file', {
        uri: file.uri,
        name: 'products.csv',
        type: file.mimeType || 'text/csv'
      });

      const response = await fetch(`${API_URL}/api/upload/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      // Handle non-JSON responses (like 500 HTML errors) safely
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Server returned an invalid response. Please check server logs.");
      }

      if (response.ok) {
        Alert.alert(
            'Success', 
            'Product file uploaded and database updated successfully.',
            [{ text: 'OK', onPress: () => setFile(null) }]
        );
      } else {
        Alert.alert('Error', data.message || 'Upload failed.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Products</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
            <Icon name="cloud-upload-outline" size={60} color="#1d3557" style={{ marginBottom: 20 }} />
            <Text style={styles.title}>Update Product Database</Text>
            <Text style={styles.subtitle}>Select a CSV file to update products.</Text>

            {file ? (
                <View style={styles.fileInfo}>
                    <Icon name="document-text" size={24} color="#2a9d8f" />
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    <TouchableOpacity onPress={() => setFile(null)}>
                        <Icon name="close-circle" size={24} color="#e63946" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity style={styles.pickButton} onPress={pickDocument}>
                    <Text style={styles.pickButtonText}>Select CSV File</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity 
                style={[styles.uploadButton, (!file || uploading) && styles.disabledButton]} 
                onPress={handleUpload}
                disabled={!file || uploading}
            >
                {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.uploadButtonText}>Upload File</Text>}
            </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', elevation: 4 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1d3557', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#718096', marginBottom: 30 },
  pickButton: { backgroundColor: '#E6FFFA', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a9d8f', width: '100%', alignItems: 'center', marginBottom: 16 },
  pickButtonText: { color: '#2a9d8f', fontSize: 16, fontWeight: 'bold' },
  fileInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', padding: 12, borderRadius: 12, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  fileName: { flex: 1, marginHorizontal: 10, fontSize: 14, color: '#2D3748' },
  uploadButton: { backgroundColor: '#1d3557', padding: 16, width: '100%', borderRadius: 12, alignItems: 'center' },
  disabledButton: { backgroundColor: '#A0AEC0' },
  uploadButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
