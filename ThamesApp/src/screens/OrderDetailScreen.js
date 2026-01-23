import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config/api';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return '#27ae60';
    case 'picked': return '#f39c12';
    case 'placed': return '#3498db';
    case 'order placed': return '#3498db';
    default: return '#95a5a6';
  }
};

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ title: '', message: '' });
  const [navigateOnClose, setNavigateOnClose] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setCurrentUserRole(userData.role);
        }
        setCurrentUserId(storedUserId);
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          setOrder(data);
        } else {
          console.error('Failed to fetch order details');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const handleExport = async () => {
    if (!order) return;

    setExporting(true);
    try {
      // CSV Header
      const header = 'Order ID,Date,Status,Customer Name,Customer Email,Delivery Address,Phone,Notes,Placed By,Product SKU,Product Name,Pack Size,Quantity,Unit Price,Line Total\n';
      
      const date = new Date(order.created_at).toLocaleDateString();
      const customer = order.customer_name || order.customer_username || 'Unknown';
      const email = order.customer_username || ''; 
      const creator = order.creator_name || order.creator_username || customer;
      const clean = (text) => `"${String(text || '').replace(/"/g, '""')}"`;

      const rows = [];
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const lineTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
          const row = [
            order.id,
            date,
            order.status,
            clean(customer),
            clean(email),
            clean(order.delivery_address),
            clean(order.customer_phone),
            clean(order.notes),
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
        const row = [
          order.id, date, order.status, clean(customer), clean(email), 
          clean(order.delivery_address), clean(order.customer_phone), clean(order.notes), clean(creator),
          '', '', '', '', '', '0.00'
        ].join(',');
        rows.push(row);
      }

      const csvContent = header + rows.join('\n');
      const filename = `Order_${order.id}_Export_${new Date().getTime()}.csv`;

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'text/csv');
          await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
          setSuccessConfig({ title: 'Export Complete!', message: 'File saved successfully.' });
          setNavigateOnClose(false);
          setShowSuccessModal(true);
        }
      } else {
        const fileUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: `Export Order #${order.id}`, UTI: 'public.comma-separated-values-text' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting the order.');
    } finally {
      setExporting(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setOrder(prev => ({ ...prev, status: newStatus }));
        setSuccessConfig({ title: 'Success!', message: `Order marked as ${newStatus}.` });
        if (newStatus === 'picked') {
            setNavigateOnClose(true);
        }
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const renderItem = ({ item }) => {
    const targetId = item.product?.id || item.product_id;
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('ProductList', { 
          productId: String(targetId),
          expandedProductId: String(targetId), 
          initialSearch: item.product?.item || item.product?.description || '',
          activeFilters: { categories: [], subcategories: [], brands: [], pmp: false, promotion: false }
        })}
      >
        <Image source={{ uri: item.product.image_url || 'https://via.placeholder.com/60' }} style={styles.productImage} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.product.description}</Text>
          <Text style={styles.itemMeta}>Tier {item.tier} | Qty: {item.quantity}</Text>
          <Text style={styles.itemPrice}>£{parseFloat(item.price).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a9d8f" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Order not found.</Text>
      </View>
    );
  }

  // Determine display text for "Ordered By"
  const customerName = order.customer_name || order.customer_username || 'Customer';
  const creatorName = order.creator_name || order.creator_username || customerName;
  
  let placedByName = customerName;
  let onBehalfText = null;
  const isOwnOrder = String(currentUserId) === String(order.user_id);

  if (order.creator_username && order.creator_username !== order.customer_username) {
    placedByName = creatorName;
    if (!isOwnOrder) {
      onBehalfText = `for ${customerName}`;
    }
  }

  const statusColor = getStatusColor(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportButton} disabled={exporting}>
          {exporting ? <ActivityIndicator size="small" color="#1d3557" /> : <Icon name="download-outline" size={24} color="#1d3557" />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={order.items}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryLabel}>Order Date</Text>
                <Text style={styles.summaryDate}>{new Date(order.created_at).toLocaleString()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{order.status}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Ordered By</Text>
                <Text style={styles.summaryValue}>{placedByName}</Text>
                {onBehalfText && <Text style={styles.summarySubValue}>{onBehalfText}</Text>}
              </View>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Delivery Details</Text>
              <Text style={styles.detailText}>Date: {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A'}</Text>
              <Text style={styles.detailText}>Address: {order.delivery_address || 'N/A'}</Text>
              <Text style={styles.detailText}>Phone: {order.customer_phone || 'N/A'}</Text>
            </View>

            {order.notes && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailText}>{order.notes}</Text>
              </View>
            )}

            <View style={styles.totalContainer}>
              <View style={{width: '100%'}}>
                <View style={styles.subTotalRow}>
                  <Text style={styles.subTotalLabel}>Total:</Text>
                  <Text style={styles.subTotalValue}>£{parseFloat(order.net_amount || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.subTotalRow}>
                  <Text style={styles.subTotalLabel}>Tax:</Text>
                  <Text style={styles.subTotalValue}>£{parseFloat(order.tax_amount || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.grossRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>£{parseFloat(order.total_amount).toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Picker Action Button */}
            {currentUserRole === 'picker' && ['placed', 'order placed'].includes(order.status?.toLowerCase()) && (
              <TouchableOpacity style={styles.actionButton} onPress={() => handleStatusUpdate('picked')}>
                <Icon name="checkmark-circle-outline" size={24} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Mark as Picked</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponentStyle={{ marginBottom: 20 }}
      />

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
            <Text style={styles.successTitle}>{successConfig.title}</Text>
            <Text style={styles.successMessage}>{successConfig.message}</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => {
              setShowSuccessModal(false);
              if (navigateOnClose) navigation.goBack();
            }}>
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  backButton: { marginRight: 16, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', flex: 1 },
  exportButton: { padding: 8 },
  
  summaryCard: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 3 
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  summaryDate: { color: '#2D3748', fontSize: 15, fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  
  divider: { height: 1, backgroundColor: '#EDF2F7', marginBottom: 20 },
  
  summaryRow: { marginBottom: 20 },
  summaryLabel: { fontSize: 12, color: '#A0AEC0', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
  summarySubValue: { fontSize: 14, color: '#2a9d8f', fontStyle: 'italic', marginTop: 2 },
  
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 12, color: '#A0AEC0', textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },
  detailText: { fontSize: 15, color: '#4A5568', marginBottom: 4, lineHeight: 22 },

  totalContainer: { marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#EDF2F7' },
  subTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  subTotalLabel: { fontSize: 15, color: '#718096' },
  subTotalValue: { fontSize: 15, color: '#2D3748', fontWeight: '600' },
  grossRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F7FAFC' },
  totalLabel: { fontSize: 18, fontWeight: '800', color: '#1d3557' },
  totalAmount: { fontSize: 24, fontWeight: '800', color: '#2a9d8f' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748', marginBottom: 16, marginLeft: 4 },
  
  itemCard: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  productImage: { width: 60, height: 60, borderRadius: 12, marginRight: 16, backgroundColor: '#F7FAFC', resizeMode: 'contain' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 4 },
  itemMeta: { fontSize: 13, color: '#718096', marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: '700', color: '#2a9d8f', marginTop: 6 },

  actionButton: {
    backgroundColor: '#2a9d8f',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    elevation: 4,
  },
  actionButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

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
