import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function MyCustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(c => 
          (c.name && c.name.toLowerCase().includes(lower)) || 
          (c.username && c.username.toLowerCase().includes(lower)) ||
          (c.email && c.email.toLowerCase().includes(lower))
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/sales/my-customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setCustomers(data);
        setFilteredCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      Alert.alert("Error", "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId) => {
    setOrdersLoading(true);
    setCustomerOrders([]);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/orders?user_id=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCustomerOrders(data);
      }
    } catch (e) {
      console.error("Error fetching customer orders:", e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCustomerPress = (customer) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
    fetchCustomerOrders(customer.id);
  };

  const handleStartOrder = async (customer) => {
    await AsyncStorage.setItem('actingAsClient', JSON.stringify(customer));
    setModalVisible(false);
    navigation.navigate('ProductList');
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleCustomerPress(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name?.charAt(0) || item.username?.charAt(0) || 'C'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name || item.username}</Text>
          <Text style={styles.cardSubtitle}>{item.email}</Text>
        </View>
        <Icon name="chevron-forward" size={20} color="#CBD5E0" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Customers</Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#6c757d"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d3557" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No customers assigned.</Text>}
        />
      )}

      {/* Customer Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Customer Details</Text>
            
            <View style={styles.detailsContainer}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{selectedCustomer?.name || selectedCustomer?.username}</Text>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{selectedCustomer?.email}</Text>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{selectedCustomer?.address || 'N/A'}</Text>
            </View>

            <Text style={styles.sectionHeader}>Order History</Text>
            {ordersLoading ? (
              <ActivityIndicator color="#1d3557" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={customerOrders}
                keyExtractor={item => item.id.toString()}
                style={styles.ordersList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.orderHistoryItem}
                    onPress={() => { 
                      setModalVisible(false);
                      navigation.navigate('OrderDetail', { orderId: item.id });
                    }}
                  >
                    <View>
                      <Text style={styles.orderHistoryId}>Order #{item.id}</Text>
                      <Text style={styles.orderHistoryDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.orderHistoryAmount}>£{parseFloat(item.total_amount).toFixed(2)}</Text>
                      <Text style={styles.orderHistoryStatus}>{item.status}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyOrdersText}>No orders found.</Text>}
              />
            )}
            
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => handleStartOrder(selectedCustomer)}
            >
              <Text style={styles.primaryButtonText}>Place Order for Customer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'white', elevation: 4 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, color: '#1d3557' },
  listContent: { padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e0f4f1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#2a9d8f', fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  cardSubtitle: { fontSize: 14, color: '#718096' },
  emptyText: { textAlign: 'center', color: '#6c757d', marginTop: 20 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginBottom: 15 },
  detailsContainer: { width: '100%', marginBottom: 20 },
  detailLabel: { fontSize: 12, color: '#A0AEC0', fontWeight: 'bold', marginTop: 8 },
  detailValue: { fontSize: 16, color: '#2D3748', fontWeight: '500' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#1d3557', alignSelf: 'flex-start', marginBottom: 10 },
  ordersList: { width: '100%', marginBottom: 20 },
  orderHistoryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', width: '100%' },
  orderHistoryId: { fontWeight: 'bold', color: '#1d3557' },
  orderHistoryDate: { fontSize: 12, color: '#6c757d' },
  orderHistoryAmount: { fontWeight: 'bold', color: '#2a9d8f' },
  orderHistoryStatus: { fontSize: 12, color: '#6c757d', textTransform: 'capitalize' },
  emptyOrdersText: { color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: 10 },
  
  primaryButton: {
    backgroundColor: '#1d3557',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  closeButton: { padding: 10 },
  closeButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
});