import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config/api';

export default function MyProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        const token = await AsyncStorage.getItem('userToken');
        
        if (userDataStr) {
          const basicUserData = JSON.parse(userDataStr);
          setUser(basicUserData);
          
          if (token) {
            await fetchUserDetails(token);
            await fetchOrders(basicUserData.id, token);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchUserDetails = async (token) => {
    try {
      // Corrected endpoint to /api/users/me, which is now defined in the backend to fetch the authenticated user's profile.
      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        // API might return user nested under 'user' or 'data' key.
        let fullUser = data.user || data.data || data;
        
        if (Array.isArray(fullUser)) {
          fullUser = fullUser[0];
        }

        setUser(prev => {
          const merged = { ...prev, ...fullUser };
          AsyncStorage.setItem('userData', JSON.stringify(merged)).catch(e => console.error(e));
          return merged;
        });
      } else {
        console.error('API Error:', data.message || 'Failed to fetch user details.');
      }
    } catch (e) {
      console.error("Error fetching full user details:", e);
    }
  };

  const fetchOrders = async (userId, token) => {
    setLoadingOrders(true);
    try {
      const response = await fetch(`${API_URL}/api/orders?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const openEditModal = (field, value) => {
    setEditingField(field);
    setEditValue(value || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const body = {};
      if (editingField === 'phone') body.phone = editValue;
      if (editingField === 'address') body.address = editValue;

      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setUser(prev => {
          const merged = { ...prev, ...data };
          AsyncStorage.setItem('userData', JSON.stringify(merged)).catch(e => console.error(e));
          return merged;
        });
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (e) {
      console.error("Error updating profile:", e);
      Alert.alert('Error', 'An error occurred while updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d3557" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <Text style={styles.noOrdersText}>Could not load user profile.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#e63946" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Details Card */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user.name || user.username}</Text>
              <Text style={styles.userRole}>{user.role?.replace('_', ' ')}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          {user.company_name && (
            <View style={styles.detailRow}>
              <Icon name="business-outline" size={20} color="#6c757d" />
              <Text style={styles.detailText}>{user.company_name}</Text>
            </View>
          )}

          {(user.account_code || user.customer_code) && (
            <View style={styles.detailRow}>
              <Icon name="card-outline" size={20} color="#6c757d" />
              <Text style={styles.detailText}>Account: {user.account_code || user.customer_code}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="mail-outline" size={20} color="#6c757d" />
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>{user.email}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="call-outline" size={20} color="#6c757d" />
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>{user.phone || user.mobile || user.contact_number || user.telephone || user.phone_number || 'Phone not set'}</Text>
              <TouchableOpacity onPress={() => openEditModal('phone', user.phone || user.mobile || user.contact_number || user.telephone || user.phone_number)}>
                <Icon name="create-outline" size={20} color="#2a9d8f" style={styles.editIcon} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="location-outline" size={20} color="#6c757d" />
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>{user.address || user.billing_address || user.address_line_1 || user.street || 'Address not set'}</Text>
              <TouchableOpacity onPress={() => openEditModal('address', user.address || user.billing_address || user.address_line_1 || user.street)}>
                <Icon name="create-outline" size={20} color="#2a9d8f" style={styles.editIcon} />
              </TouchableOpacity>
            </View>
          </View>

          {(user.city || user.postcode || user.post_code || user.zip) && (
            <View style={styles.detailRow}>
              <Icon name="map-outline" size={20} color="#6c757d" />
              <Text style={styles.detailText}>
                {[user.city, user.postcode || user.post_code || user.zip].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Orders Section */}
        <Text style={styles.sectionTitle}>Order History</Text>
        <TouchableOpacity 
          style={styles.orderHistoryCard}
          onPress={() => navigation.navigate('OrderList')}
        >
          <View style={styles.orderHistoryContent}>
            <Icon name="receipt-outline" size={30} color="#1d3557" />
            <View style={styles.orderHistoryTextContainer}>
              <Text style={styles.orderHistoryTitle}>View Order History</Text>
              {loadingOrders ? (
                <ActivityIndicator size="small" color="#6c757d" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              ) : (
                <Text style={styles.orderHistorySubtitle}>{orders.length} order(s) found</Text>
              )}
            </View>
          </View>
          <Icon name="chevron-forward-outline" size={24} color="#6c757d" />
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Edit {editingField === 'phone' ? 'Phone Number' : 'Address'}</Text>
            <TextInput
              style={[styles.editInput, editingField === 'address' && { height: 80, textAlignVertical: 'top' }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField}`}
              multiline={editingField === 'address'}
              keyboardType={editingField === 'phone' ? 'phone-pad' : 'default'}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557' },
  scrollContent: { padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1d3557', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#212529' },
  userRole: { fontSize: 14, color: '#6c757d', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: '#e9ecef', marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  detailContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 12 },
  detailText: { fontSize: 16, color: '#495057', flex: 1 },
  editIcon: { padding: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1d3557', marginBottom: 12 },
  noOrdersText: { textAlign: 'center', color: '#6c757d', marginTop: 20, fontStyle: 'italic' },
  // Edit Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editModalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginBottom: 15 },
  editInput: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20, color: '#212529' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  cancelButton: { backgroundColor: '#e9ecef' },
  saveButton: { backgroundColor: '#2a9d8f' },
  cancelButtonText: { color: '#495057', fontWeight: 'bold' },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  // Order History Card
  orderHistoryCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  orderHistoryContent: { flexDirection: 'row', alignItems: 'center' },
  orderHistoryTextContainer: { marginLeft: 16 },
  orderHistoryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1d3557' },
  orderHistorySubtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
});
