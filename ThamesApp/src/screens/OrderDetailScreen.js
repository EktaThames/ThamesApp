import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const storedUserId = await AsyncStorage.getItem('userId');
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
      </View>

      <FlatList
        data={order.items}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryDate}>{new Date(order.created_at).toLocaleString()}</Text>
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
          </View>
        }
        ListHeaderComponentStyle={{ marginBottom: 10 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e9ecef', elevation: 2 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1d3557' },
  
  summaryCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  summaryDate: { color: '#6c757d', fontSize: 14 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  
  divider: { height: 1, backgroundColor: '#f1f3f5', marginBottom: 15 },
  
  summaryRow: { marginBottom: 15 },
  summaryLabel: { fontSize: 12, color: '#6c757d', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#1d3557' },
  summarySubValue: { fontSize: 14, color: '#2a9d8f', fontStyle: 'italic' },
  
  detailSection: { marginBottom: 15 },
  detailLabel: { fontSize: 12, color: '#6c757d', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  detailText: { fontSize: 14, color: '#212529', marginBottom: 2 },

  totalContainer: { marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f3f5' },
  subTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  subTotalLabel: { fontSize: 14, color: '#6c757d' },
  subTotalValue: { fontSize: 14, color: '#212529', fontWeight: '600' },
  grossRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f8f9fa' },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1d3557' },
  totalAmount: { fontSize: 24, fontWeight: 'bold', color: '#2a9d8f' },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1d3557', marginBottom: 12, marginLeft: 4 },
  
  itemCard: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#f8f9fa' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#212529', marginBottom: 4 },
  itemMeta: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#1d3557', marginTop: 4 },
});
