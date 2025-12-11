import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
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

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <Image source={{ uri: item.product.image_url || 'https://via.placeholder.com/60' }} style={styles.productImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.description}</Text>
        <Text style={styles.itemMeta}>Tier {item.tier} | Qty: {item.quantity}</Text>
        <Text style={styles.itemPrice}>£{parseFloat(item.price).toFixed(2)}</Text>
      </View>
    </View>
  );

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Date: {new Date(order.created_at).toLocaleString()}</Text>
        <Text style={styles.summaryText}>Status: <Text style={styles.status}>{order.status}</Text></Text>
        <Text style={styles.totalAmount}>Total: £{parseFloat(order.total_amount).toFixed(2)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Items</Text>

      <FlatList
        data={order.items}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1d3557' },
  summary: { backgroundColor: 'white', padding: 16, margin: 16, borderRadius: 12, elevation: 2 },
  summaryText: { fontSize: 16, color: '#495057', marginBottom: 4 },
  status: { fontWeight: 'bold', color: '#2a9d8f', textTransform: 'capitalize' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1d3557', marginLeft: 16, marginTop: 8 },
  itemCard: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 1 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#212529' },
  itemMeta: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: '600', color: '#2a9d8f', marginTop: 2 },
});
