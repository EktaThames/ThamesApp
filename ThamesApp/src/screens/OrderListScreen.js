import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config/api';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return '#27ae60'; // Green
    case 'picked': return '#f39c12';    // Orange
    case 'placed': return '#3498db';    // Blue
    case 'order placed': return '#3498db';
    default: return '#95a5a6';          // Grey
  }
};

export default function OrderListScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    const init = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      setCurrentUserId(storedUserId);
      fetchOrders();
    };
    init();
  }, []));

  const handleExport = async () => {
    if (orders.length === 0) {
      Alert.alert('No Orders', 'There are no orders to export.');
      return;
    }

    setExporting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Create CSV Content
      const header = 'Order ID,Date,Status,Customer Name,Customer Email,Delivery Address,Phone,Notes,Placed By,Product SKU,Product Name,Pack Size,Quantity,Unit Price,Line Total\n';
      
      const rows = [];

      // Fetch full details for each order to get line items
      for (const orderSummary of orders) {
        const res = await fetch(`${API_URL}/api/orders/${orderSummary.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) continue;
        
        const fullOrder = await res.json();
        const date = new Date(fullOrder.created_at).toLocaleDateString();
        const customer = fullOrder.customer_name || fullOrder.customer_username || 'Unknown';
        const email = fullOrder.customer_username || ''; 
        const creator = fullOrder.creator_name || fullOrder.creator_username || customer;
        const clean = (text) => `"${String(text || '').replace(/"/g, '""')}"`;

        if (fullOrder.items && fullOrder.items.length > 0) {
          fullOrder.items.forEach(item => {
            const lineTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
            const row = [
              fullOrder.id,
              date,
              fullOrder.status,
              clean(customer),
              clean(email),
              clean(fullOrder.delivery_address),
              clean(fullOrder.customer_phone),
              clean(fullOrder.notes),
              clean(creator),
              clean(item.product.item),
              clean(item.product.description),
              clean(item.pack_size || `Pack ${item.tier}`),
              item.quantity,
              parseFloat(item.price).toFixed(2),
              lineTotal
            ].join(',');
            rows.push(row);
          });
        } else {
          // Handle empty order case
          const row = [
            fullOrder.id, date, fullOrder.status, clean(customer), clean(email), 
            clean(fullOrder.delivery_address), clean(fullOrder.customer_phone), clean(fullOrder.notes), clean(creator),
            '', '', '', '', '', '0.00'
          ].join(',');
          rows.push(row);
        }
      }

      const csvContent = header + rows.join('\n');
      // console.log('--- CSV EXPORT START ---');
      // console.log(csvContent);
      // console.log('--- CSV EXPORT END ---');

      const filename = `Orders_Export_${new Date().getTime()}.csv`;

      if (Platform.OS === 'android') {
        // Android: Save directly to user-selected folder (e.g. Downloads)
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'text/csv');
          await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
          setShowSuccessModal(true);
        } else {
          // User cancelled folder selection
          return;
        }
      } else {
        // iOS: Use Share Sheet (Save to Files)
        const fileUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Orders',
            UTI: 'public.comma-separated-values-text' // Helps iOS recognize the file type
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting orders.');
    } finally {
      setExporting(false);
    }
  };

  const handleSingleExport = async (orderId) => {
    setExporting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch order details');

      const fullOrder = await res.json();
      
      const header = 'Order ID,Date,Status,Customer Name,Customer Email,Delivery Address,Phone,Notes,Placed By,Product SKU,Product Name,Pack Size,Quantity,Unit Price,Line Total\n';
      const date = new Date(fullOrder.created_at).toLocaleDateString();
      const customer = fullOrder.customer_name || fullOrder.customer_username || 'Unknown';
      const email = fullOrder.customer_username || ''; 
      const creator = fullOrder.creator_name || fullOrder.creator_username || customer;
      const clean = (text) => `"${String(text || '').replace(/"/g, '""')}"`;

      const rows = [];
      if (fullOrder.items && fullOrder.items.length > 0) {
        fullOrder.items.forEach(item => {
          const lineTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
          const row = [
            fullOrder.id, date, fullOrder.status, clean(customer), clean(email),
            clean(fullOrder.delivery_address), clean(fullOrder.customer_phone), clean(fullOrder.notes), clean(creator),
            clean(item.product.item), clean(item.product.description), clean(item.pack_size || `Pack ${item.tier}`),
            item.quantity, parseFloat(item.price).toFixed(2), lineTotal
          ].join(',');
          rows.push(row);
        });
      } else {
        const row = [
          fullOrder.id, date, fullOrder.status, clean(customer), clean(email), 
          clean(fullOrder.delivery_address), clean(fullOrder.customer_phone), clean(fullOrder.notes), clean(creator),
          '', '', '', '', '', '0.00'
        ].join(',');
        rows.push(row);
      }

      const csvContent = header + rows.join('\n');
      const filename = `Order_${fullOrder.id}_Export_${new Date().getTime()}.csv`;

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'text/csv');
          await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
          setShowSuccessModal(true);
        }
      } else {
        const fileUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: `Export Order #${fullOrder.id}`, UTI: 'public.comma-separated-values-text' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Single Export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting the order.');
    } finally {
      setExporting(false);
    }
  };

  const renderOrderItem = ({ item }) => {
    // Determine display text for "Placed by"
    const customerName = item.customer_name || item.customer_username || 'Customer';
    const creatorName = item.creator_name || item.creator_username || customerName;
    
    let placedByName = customerName;
    let onBehalfText = null;
    const isOwnOrder = String(currentUserId) === String(item.user_id);

    if (item.creator_username && item.creator_username !== item.customer_username) {
      placedByName = creatorName;
      if (!isOwnOrder) {
        onBehalfText = `for ${customerName}`;
      }
    }

    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', marginBottom: 6 }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
            <TouchableOpacity 
              style={styles.singleExportButton} 
              onPress={() => handleSingleExport(item.id)}
            >
              <Icon name="download-outline" size={16} color="#1d3557" />
              <Text style={styles.singleExportText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.cardBody}>
          <View style={styles.userContainer}>
            <Icon name="person-circle-outline" size={32} color="#1d3557" />
            <View style={{marginLeft: 10, flex: 1}}>
                <Text style={styles.placedByLabel}>Placed by <Text style={styles.placedByName}>{placedByName}</Text></Text>
                {onBehalfText && <Text style={styles.onBehalfText}>{onBehalfText}</Text>}
            </View>
          </View>
          <Text style={styles.amount}>£{parseFloat(item.total_amount).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportButton} disabled={exporting}>
          {exporting ? <ActivityIndicator size="small" color="#1d3557" /> : <Icon name="download-outline" size={24} color="#1d3557" />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2a9d8f" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders found.</Text>
            </View>
          }
        />
      )}

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
            <Text style={styles.successTitle}>Export Complete!</Text>
            <Text style={styles.successMessage}>File saved successfully to your device.</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e9ecef', elevation: 2 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1d3557', flex: 1 },
  exportButton: { padding: 8 },
  
  card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: {width: 0, height: 2}, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#1d3557' },
  date: { color: '#6c757d', fontSize: 13, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  
  singleExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7'
  },
  singleExportText: { fontSize: 12, fontWeight: '600', color: '#1d3557', marginLeft: 4 },
  
  divider: { height: 1, backgroundColor: '#f1f3f5', marginHorizontal: 16 },
  
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  userContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  placedByLabel: { fontSize: 12, color: '#6c757d' },
  placedByName: { fontWeight: 'bold', color: '#1d3557', fontSize: 14 },
  onBehalfText: { fontSize: 12, color: '#2a9d8f', fontStyle: 'italic' },
  
  amount: { fontSize: 18, fontWeight: 'bold', color: '#212529' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#6c757d' },

  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
});