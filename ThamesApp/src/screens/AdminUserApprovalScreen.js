import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function AdminUserApprovalScreen({ navigation }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/pending-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setPendingUsers(data);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/approve-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (response.ok) {
        Alert.alert('Success', 'User approved successfully.');
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        Alert.alert('Error', 'Failed to approve user.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0) || 'U'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.detail}>{item.phone || 'No Phone'}</Text>
          <Text style={styles.detail}>{item.address || 'No Address'}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(item.id)}>
          <Text style={styles.approveText}>Approve User</Text>
          <Icon name="checkmark-circle" size={20} color="white" style={{marginLeft: 8}} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1d3557" style={{marginTop: 20}} />
      ) : (
        <FlatList
          data={pendingUsers}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending registrations.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', elevation: 4 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E6FFFA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#2a9d8f' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1d3557' },
  email: { fontSize: 14, color: '#2a9d8f', marginBottom: 4 },
  detail: { fontSize: 13, color: '#718096' },
  actions: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  approveButton: { backgroundColor: '#1d3557', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12 },
  approveText: { color: 'white', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#718096', fontSize: 16 },
});
