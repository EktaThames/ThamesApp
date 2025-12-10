import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function CartScreen({ route, navigation }) {
  const { cart: initialCart, onCartUpdate } = route.params;
  const [cart, setCart] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);

  const updateQuantity = (cartKey, amount) => {
    const updatedCart = { ...cart };
    const item = updatedCart[cartKey];

    if (item) {
      item.quantity += amount;
      if (item.quantity <= 0) {
        delete updatedCart[cartKey];
      }
      setCart(updatedCart);
      onCartUpdate(updatedCart); // Update the state in ProductListScreen
    }
  };

  const cartTotal = Object.values(cart).reduce((total, item) => {
    const price = parseFloat(item.tier.promo_price || item.tier.sell_price);
    return total + (price * item.quantity);
  }, 0);

  const totalItems = Object.values(cart).reduce((total, item) => total + item.quantity, 0);

  const formatPrice = (price) => `£${parseFloat(price).toFixed(2)}`;

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    try {
      const authToken = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          items: Object.values(cart).map(item => ({
            product_id: item.product.id,
            tier: item.tier.tier,
            quantity: item.quantity,
            price: parseFloat(item.tier.promo_price || item.tier.sell_price),
          })),
          total_amount: cartTotal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order.');
      }

      Alert.alert('Success', 'Your order has been placed successfully!');
      onCartUpdate({}); // Clear the cart
      navigation.navigate('ProductList'); // Go back to product list

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.product.description}</Text>
        <Text style={styles.tierPack}>{item.tier.pack_size || `Pack ${item.tier.tier}`}</Text>
        <Text style={styles.price}>{formatPrice(item.tier.promo_price || item.tier.sell_price)}</Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.key, -1)}>
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.key, 1)}>
          <Text style={styles.quantityButtonText}>+</Text>
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
        <Text style={styles.headerTitle}>Your Cart</Text>
      </View>

      <FlatList
        data={Object.keys(cart).map(key => ({ ...cart[key], key }))}
        renderItem={renderCartItem}
        keyExtractor={item => item.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        }
      />

      {totalItems > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>Total Items: {totalItems}</Text>
            <Text style={styles.footerTotal}>Total Price: {formatPrice(cartTotal)}</Text>
          </View>
          <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e9ecef', backgroundColor: 'white' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1d3557' },
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 16, marginVertical: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 16 },
  infoContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#212529' },
  tierPack: { fontSize: 14, color: '#6c757d', marginTop: 4 },
  price: { fontSize: 16, fontWeight: '600', color: '#2a9d8f', marginTop: 4 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityButton: { backgroundColor: '#e9ecef', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quantityButtonText: { color: '#1d3557', fontSize: 18, fontWeight: 'bold' },
  quantityValue: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#e9ecef', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 16, color: '#6c757d' },
  footerTotal: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginTop: 4 },
  placeOrderButton: { backgroundColor: '#2a9d8f', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  placeOrderButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, color: '#6c757d' },
});