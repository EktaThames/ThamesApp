import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function ManageAllocationScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customerDetailVisible, setCustomerDetailVisible] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [custRes, repRes] = await Promise.all([
        fetch(`${API_URL}/api/users?role=customer`, { headers }),
        fetch(`${API_URL}/api/users?role=sales_rep`, { headers })
      ]);
      
      const custData = await custRes.json();
      const repData = await repRes.json();

      const extractArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.users)) return data.users;
        return [];
      };

      const custList = extractArray(custData);
      setCustomers(custList);
      setFilteredCustomers(custList);
      setSalesReps(extractArray(repData));
    } catch (error) {
      console.error("Error fetching allocation data:", error);
      Alert.alert("Error", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRep = async (repId) => {
    if (!selectedCustomer) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/assign-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          sales_rep_id: repId
        })
      });

      if (response.ok) {
        const repName = salesReps.find(r => r.id === repId)?.name;
        
        setCustomers(prev => prev.map(c => 
          c.id === selectedCustomer.id ? { ...c, sales_rep_id: repId, sales_rep_name: repName } : c
        ));
        
        setAssignModalVisible(false);
        setSelectedCustomer(null);
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', 'Failed to assign representative.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred.');
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

  const handleStartOrderForCustomer = async (customer) => {
    await AsyncStorage.setItem('actingAsClient', JSON.stringify(customer));
    setCustomerDetailVisible(false);
    navigation.navigate('ProductList');
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        setSelectedCustomer(item);
        setCustomerDetailVisible(true);
        fetchCustomerOrders(item.id);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name?.charAt(0) || item.username?.charAt(0) || 'C'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name || item.username}</Text>
          <Text style={styles.cardSubtitle}>{item.email}</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.label}>Assigned Rep:</Text>
          <Text style={styles.value}>{item.sales_rep_name || 'Unassigned'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.assignButton}
          onPress={() => { setSelectedCustomer(item); setAssignModalVisible(true); }}
        >
          <Text style={styles.assignButtonText}>Assign</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Allocation</Text>
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
          ListEmptyComponent={<Text style={styles.emptyText}>No customers found.</Text>}
        />
      )}

      {/* Assign Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Sales Rep</Text>
            <Text style={styles.modalSubtitle}>For: {selectedCustomer?.name || selectedCustomer?.username}</Text>
            
            <FlatList
              data={salesReps}
              keyExtractor={item => item.id.toString()}
              style={{ maxHeight: 300, width: '100%' }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.repOption} onPress={() => handleAssignRep(item.id)}>
                  <Text style={styles.repName}>{item.name || item.username}</Text>
                  <Icon name="chevron-forward" size={20} color="#6c757d" />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setAssignModalVisible(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Icon name="checkmark-outline" size={50} color="white" />
            </View>
            <Text style={styles.successTitle}>Assignment Complete!</Text>
            <Text style={styles.successMessage}>Sales representative has been successfully assigned.</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={customerDetailVisible}
        onRequestClose={() => setCustomerDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Customer Details</Text>
            <View style={{ width: '100%', marginBottom: 20 }}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{selectedCustomer?.name || selectedCustomer?.username}</Text>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{selectedCustomer?.email}</Text>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{selectedCustomer?.address || 'N/A'}</Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1d3557', alignSelf: 'flex-start', marginBottom: 10 }}>Order History</Text>
            {ordersLoading ? (
              <ActivityIndicator color="#1d3557" style={{ marginBottom: 20 }} />
            ) : (
              <FlatList
                data={customerOrders}
                keyExtractor={item => item.id.toString()}
                style={{ width: '100%', marginBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.orderHistoryItem}
                    onPress={() => { 
                      setCustomerDetailVisible(false);
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
                ListEmptyComponent={<Text style={{ color: '#6c757d', fontStyle: 'italic' }}>No orders found for this customer.</Text>}
              />
            )}
            
            <TouchableOpacity style={[styles.primaryButton, { width: '100%', marginBottom: 10 }]} onPress={() => handleStartOrderForCustomer(selectedCustomer)}>
              <Text style={styles.primaryButtonText}>Place Order for Customer</Text>
            </TouchableOpacity>
        
            <TouchableOpacity style={styles.closeButton} onPress={() => setCustomerDetailVisible(false)}>
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
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1d3557', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  cardSubtitle: { fontSize: 14, color: '#718096' },
  divider: { height: 1, backgroundColor: '#EDF2F7', marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#A0AEC0', fontWeight: 'bold' },
  value: { fontSize: 14, color: '#2D3748', fontWeight: '600' },
  assignButton: { backgroundColor: '#1d3557', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  assignButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#6c757d', marginTop: 20 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#6c757d', marginBottom: 20 },
  repOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  repName: { fontSize: 16, color: '#212529' },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
  
  // Success Modal Styles
  successModalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a9d8f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2a9d8f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1d3557', marginBottom: 12, textAlign: 'center' },
  successMessage: { fontSize: 15, color: '#6c757d', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  successButton: {
    backgroundColor: '#1d3557',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  // Customer Detail Styles
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 10,
  },
  detailValue: {
    fontSize: 16,
    color: '#1d3557',
    marginBottom: 5,
    fontWeight: '500',
  },
  orderHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    width: '100%',
  },
  orderHistoryId: { fontWeight: 'bold', color: '#1d3557' },
  orderHistoryDate: { fontSize: 12, color: '#6c757d' },
  orderHistoryAmount: { fontWeight: 'bold', color: '#2a9d8f' },
  orderHistoryStatus: { fontSize: 12, color: '#6c757d', textTransform: 'capitalize' },
  primaryButton: {
    backgroundColor: '#1d3557',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});