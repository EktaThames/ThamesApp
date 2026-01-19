import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  useEffect(() => {
    const init = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      setCurrentUserId(storedUserId);
      fetchOrders();
    };
    init();
  }, []);

  const handleExport = async () => {
    if (orders.length === 0) {
      Alert.alert('No Orders', 'There are no orders to export.');
      return;
    }

    try {
      // Create CSV Content
      const header = 'Order ID,Date,Status,Customer,Placed By,Total Amount\n';
      const rows = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        const customer = order.customer_name || order.customer_username || 'Unknown';
        const creator = order.creator_name || order.creator_username || customer;
        // Escape commas in fields
        const clean = (text) => `"${String(text || '').replace(/"/g, '""')}"`;
        
        return `${order.id},${date},${order.status},${clean(customer)},${clean(creator)},${order.total_amount}`;
      }).join('\n');

      const csvContent = header + rows;
      console.log('--- CSV EXPORT START ---');
      console.log(csvContent);
      console.log('--- CSV EXPORT END ---');

      // Save to File
      const filename = `Orders_Export_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.cacheDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });
      console.log('File saved to:', fileUri);

      // Share
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Orders',
          UTI: 'public.comma-separated-values-text' // Helps iOS recognize the file type
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting orders.');
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
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
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
        <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
          <Icon name="download-outline" size={24} color="#1d3557" />
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
  
  divider: { height: 1, backgroundColor: '#f1f3f5', marginHorizontal: 16 },
  
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  userContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  placedByLabel: { fontSize: 12, color: '#6c757d' },
  placedByName: { fontWeight: 'bold', color: '#1d3557', fontSize: 14 },
  onBehalfText: { fontSize: 12, color: '#2a9d8f', fontStyle: 'italic' },
  
  amount: { fontSize: 18, fontWeight: 'bold', color: '#212529' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#6c757d' },
});