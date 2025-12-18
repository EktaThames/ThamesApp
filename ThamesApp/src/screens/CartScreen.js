import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function CartScreen({ route, navigation }) {
  const { cart: initialCart = {}, onCartUpdate = () => {} } = route.params || {};
  const [cart, setCart] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const [actingAsClient, setActingAsClient] = useState(null);
  
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // Default tomorrow
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const loadSession = async () => {
      const clientData = await AsyncStorage.getItem('actingAsClient');
      let targetId = null;
      
      if (clientData) {
        const client = JSON.parse(clientData);
        setActingAsClient(client);
        targetId = client.id;
        // Pre-fill from client data
        if (client.address) setDeliveryAddress(client.address);
        if (client.phone) setCustomerPhone(client.phone); // Assuming phone exists on user object
      } else {
        targetId = await AsyncStorage.getItem('userId');
        // Fetch user details to pre-fill
        if (targetId) {
          try {
            const token = await AsyncStorage.getItem('userToken');
            // We need an endpoint to get single user details, or we can use the list if we are admin/sales
            // For now, let's try to use what we have or leave blank if not available easily
            // If you have a /api/users/me endpoint that would be ideal.
            // Assuming we might not have it, we leave it blank or user fills it.
            const response = await fetch(`${API_URL}/api/users`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const users = await response.json();
            if (Array.isArray(users)) {
              const currentUser = users.find(u => String(u.id) === String(targetId));
              if (currentUser) {
                if (currentUser.address) setDeliveryAddress(currentUser.address);
                if (currentUser.phone) setCustomerPhone(currentUser.phone);
              }
            }
          } catch (e) {
            console.log("Error fetching user details", e);
          }
        }
      }

      if (Object.keys(initialCart).length === 0) {
        const cartKey = targetId ? `cart_${targetId}` : 'cart';
        const storedCart = await AsyncStorage.getItem(cartKey);
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        }
      }
    };
    loadSession();
  }, []);

  const updateQuantity = (cartKey, amount) => {
    const updatedCart = { ...cart };
    const item = updatedCart[cartKey];

    if (item) {
      const currentQty = Number(item.quantity) || 0;
      const newQty = currentQty + amount;

      if (newQty <= 0) {
        delete updatedCart[cartKey];
      }
      else {
        item.quantity = newQty;
      }
      setCart(updatedCart);
      onCartUpdate(updatedCart); // Update the state in ProductListScreen
      // Determine correct storage key
      AsyncStorage.getItem('actingAsClient').then(clientData => {
        return clientData ? JSON.parse(clientData).id : AsyncStorage.getItem('userId');
      }).then(targetId => {
        const cartKey = targetId ? `cart_${targetId}` : 'cart';
        AsyncStorage.setItem(cartKey, JSON.stringify(updatedCart)).catch(e => console.error(e));
      });
    }
  };

  const setQuantity = (cartKey, input) => {
    const updatedCart = { ...cart };
    const item = updatedCart[cartKey];

    if (item) {
      if (input === '') {
        item.quantity = '';
      } else {
        const quantity = parseInt(input, 10);
        if (!isNaN(quantity)) {
          if (quantity <= 0) {
            delete updatedCart[cartKey];
          } else {
            item.quantity = quantity;
          }
        }
      }
      setCart(updatedCart);
      onCartUpdate(updatedCart);
      
      AsyncStorage.getItem('actingAsClient').then(clientData => {
        return clientData ? JSON.parse(clientData).id : AsyncStorage.getItem('userId');
      }).then(targetId => {
        const cartKey = targetId ? `cart_${targetId}` : 'cart';
        AsyncStorage.setItem(cartKey, JSON.stringify(updatedCart)).catch(e => console.error(e));
      });
    }
  };

  const calculateTotals = () => {
    let net = 0;
    let tax = 0;
    
    Object.values(cart).forEach(item => {
      const price = parseFloat(item.tier.promo_price || item.tier.sell_price);
      const quantity = Number(item.quantity) || 0;
      const lineNet = price * quantity;
      
      // Simple VAT logic: Default to 20% if not specified or standard
      let vatRate = 0.20; 
      const vatStr = String(item.product.vat || '').toUpperCase();
      if (vatStr.includes('0') && !vatStr.includes('20')) vatRate = 0; // Zero rated
      
      net += lineNet;
      tax += lineNet * vatRate;
    });
    
    return { net, tax, gross: net + tax };
  };

  const totals = calculateTotals();

  const totalItems = Object.values(cart).reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const formatPrice = (price) => `£${parseFloat(price).toFixed(2)}`;

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    try {
      const authToken = await AsyncStorage.getItem('userToken');

      if (!deliveryAddress) {
        Alert.alert('Missing Information', 'Delivery address not found in customer profile.');
        setIsLoading(false);
        return;
      }

      const body = {
        items: Object.values(cart)
          .filter(item => (Number(item.quantity) || 0) > 0)
          .map(item => ({
            product_id: item.product.id,
            tier: item.tier.tier,
            quantity: Number(item.quantity),
            price: parseFloat(item.tier.promo_price || item.tier.sell_price),
          })),
        total_amount: totals.gross,
        net_amount: totals.net,
        tax_amount: totals.tax,
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress,
        customer_phone: customerPhone,
        notes: notes
      };

      if (actingAsClient) {
        body.customer_id = actingAsClient.id;
      }

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(body),
      });

      // Read response as text first to handle potential HTML errors
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("🔥 Server Invalid Response:", text);
        throw new Error("Server returned an invalid response. Check console for details.");
      }

      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order.');
      }

      Alert.alert('Success', 'Your order has been placed successfully!');
      setCart({});
      onCartUpdate({}); // Clear the cart
      
      const targetId = actingAsClient ? actingAsClient.id : await AsyncStorage.getItem('userId');
      const cartKey = targetId ? `cart_${targetId}` : 'cart';
      await AsyncStorage.removeItem(cartKey);

      // Clear actingAsClient so the next order defaults back to the Sales Rep (unless they select a customer again)
      if (actingAsClient) {
        await AsyncStorage.removeItem('actingAsClient');
      }

      navigation.navigate('ProductList'); // Go back to product list

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        onPress={() => navigation.navigate('ProductList', { 
          productId: String(item.product.id),
          expandedProductId: String(item.product.id),
          initialSearch: item.product.item || item.product.description,
          activeFilters: { categories: [], subcategories: [], brands: [], pmp: false, promotion: false }
        })}
      >
        <Image source={{ uri: `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${item.product.item}.webp` }} style={styles.productImage} />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{item.product.description}</Text>
          <Text style={styles.tierPack}>{item.tier.pack_size || `Pack ${item.tier.tier}`}</Text>
          <Text style={styles.price}>{formatPrice(item.tier.promo_price || item.tier.sell_price)}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.quantityContainer}>
        <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.key, -1)}>
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.quantityInput}
          keyboardType="numeric"
          value={String(item.quantity)}
          onChangeText={(text) => setQuantity(item.key, text)}
        />
        <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.key, 1)}>
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Header component for FlatList to render inputs above items
  const listHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Delivery Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Delivery Address</Text>
          <View style={styles.inputWrapper}>
            <Icon name="location-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Enter delivery address"
              multiline
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Icon name="call-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Order Notes</Text>
          <View style={styles.inputWrapper}>
            <Icon name="document-text-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions..."
              multiline
            />
          </View>
        </View>
      </View>
      
      <Text style={styles.itemsTitle}>Order Items</Text>
    </View>
  );

  const listFooter = (
    <View style={styles.summarySection}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total:</Text>
        <Text style={styles.summaryValue}>{formatPrice(totals.net)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>VAT / Tax:</Text>
        <Text style={styles.summaryValue}>{formatPrice(totals.tax)}</Text>
      </View>
      <View style={[styles.summaryRow, styles.grossRow]}>
        <Text style={styles.grossLabel}>Total Amount:</Text>
        <Text style={styles.grossValue}>{formatPrice(totals.gross)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        {actingAsClient && (
          <Text style={{ marginLeft: 'auto', color: '#2a9d8f', fontWeight: 'bold' }}>For: {actingAsClient.name}</Text>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <FlatList
        data={Object.keys(cart).map(key => ({ ...cart[key], key }))}
        renderItem={renderCartItem}
        keyExtractor={item => item.key}
        ListHeaderComponent={Object.keys(cart).length > 0 ? listHeader : null}
        ListFooterComponent={Object.keys(cart).length > 0 ? listFooter : null}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        }
      />
      </KeyboardAvoidingView>

      {totalItems > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>Total Items: {totalItems}</Text>
            <Text style={styles.footerTotal}>Total: {formatPrice(totals.gross)}</Text>
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
  quantityValue: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 12 }, // Keeping for reference if needed, but replaced by quantityInput
  quantityInput: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 8, minWidth: 30, textAlign: 'center', color: '#1d3557', borderBottomWidth: 1, borderBottomColor: '#ced4da', paddingVertical: 0 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#e9ecef', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 16, color: '#6c757d' },
  footerTotal: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginTop: 4 },
  placeOrderButton: { backgroundColor: '#2a9d8f', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  placeOrderButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, color: '#6c757d' },
  
  headerContainer: { marginBottom: 10 },
  detailsCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginTop: 10, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1d3557', marginBottom: 15 },
  itemsTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginBottom: 10, marginLeft: 4 },
  
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, color: '#6c757d', marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12, paddingHorizontal: 12 },
  inputIcon: { marginTop: 12, marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#212529', paddingVertical: 10 },
  
  summarySection: { marginTop: 20, backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 16, color: '#6c757d' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#212529' },
  grossRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e9ecef' },
  grossLabel: { fontSize: 18, fontWeight: 'bold', color: '#1d3557' },
  grossValue: { fontSize: 18, fontWeight: 'bold', color: '#2a9d8f' },
});