import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function CartScreen({ route, navigation }) {
  const { cart: initialCart = {}, onCartUpdate = () => {} } = route.params || {};
  const [cart, setCart] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const [actingAsClient, setActingAsClient] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
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
        // Pre-fill from client data with robust field checking
        const addr = client.address || client.billing_address || client.address_line_1 || client.street || '';
        if (addr) setDeliveryAddress(addr);
        
        const ph = client.phone || client.mobile || client.contact_number || client.telephone || client.phone_number || '';
        if (ph) setCustomerPhone(ph);
      } else {
        targetId = await AsyncStorage.getItem('userId');
        if (!targetId) {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const user = JSON.parse(userData);
            targetId = String(user.id);
            await AsyncStorage.setItem('userId', targetId);
          }
        }
        // Fetch user details to pre-fill
        if (targetId) {
          try {
            const token = await AsyncStorage.getItem('userToken');
            // Use /api/users/me to get the current user's latest details directly from DB
            const response = await fetch(`${API_URL}/api/users/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
              const currentUser = await response.json();
              const userData = currentUser.user || currentUser.data || currentUser;
              
              const addr = userData.address || userData.billing_address || userData.address_line_1 || userData.street || '';
              if (addr) setDeliveryAddress(addr);

              const ph = userData.phone || userData.mobile || userData.contact_number || userData.telephone || userData.phone_number || '';
              if (ph) setCustomerPhone(ph);
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

      setCart({});
      onCartUpdate({}); // Clear the cart
      
      const targetId = actingAsClient ? actingAsClient.id : await AsyncStorage.getItem('userId');
      const cartKey = targetId ? `cart_${targetId}` : 'cart';
      await AsyncStorage.removeItem(cartKey);

      // Clear actingAsClient so the next order defaults back to the Sales Rep (unless they select a customer again)
      if (actingAsClient) {
        await AsyncStorage.removeItem('actingAsClient');
      }

      setShowSuccessModal(true);

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
        <View style={styles.imageContainer}>
          <Image source={{ uri: `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${item.product.item}.webp` }} style={styles.productImage} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={2}>{item.product.description}</Text>
          <Text style={styles.tierPack}>{item.tier.pack_size || `Pack ${item.tier.tier}`}</Text>
          <Text style={styles.price}>{formatPrice(item.tier.promo_price || item.tier.sell_price)}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.quantityContainer}>
        <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.key, -1)}>
          <Icon name="remove" size={18} color="#1d3557" />
        </TouchableOpacity>
        <TextInput
          style={styles.quantityInput}
          keyboardType="numeric"
          value={String(item.quantity)}
          onChangeText={(text) => setQuantity(item.key, text)}
        />
        <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.key, 1)}>
          <Icon name="add" size={18} color="#1d3557" />
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
            <Icon name="location-outline" size={20} color="#A0AEC0" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Enter delivery address"
              placeholderTextColor="#A0AEC0"
              multiline
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Icon name="call-outline" size={20} color="#A0AEC0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#A0AEC0"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Order Notes</Text>
          <View style={styles.inputWrapper}>
            <Icon name="document-text-outline" size={20} color="#A0AEC0" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions..."
              placeholderTextColor="#A0AEC0"
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
      <View style={styles.divider} />
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
          <View style={styles.clientBadge}>
            <Text style={styles.clientBadgeText}>For: {actingAsClient.name}</Text>
          </View>
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
            <Icon name="cart-outline" size={80} color="#E2E8F0" />
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        }
      />
      </KeyboardAvoidingView>

      {totalItems > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>{totalItems} Items</Text>
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

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Icon name="checkmark-outline" size={50} color="white" />
            </View>
            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successMessage}>Your order has been successfully placed.</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => {
              setShowSuccessModal(false);
              navigation.navigate('ProductList');
            }}>
              <Text style={styles.successButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557' },
  clientBadge: { marginLeft: 'auto', backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  clientBadgeText: { color: '#2a9d8f', fontWeight: '700', fontSize: 12 },

  card: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 12, 
    marginVertical: 8, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: { width: '100%', height: '100%', borderRadius: 12, resizeMode: 'contain' },
  infoContainer: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 4 },
  tierPack: { fontSize: 12, color: '#A0AEC0', marginBottom: 4 },
  price: { fontSize: 16, fontWeight: '800', color: '#2a9d8f' },
  
  quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12, padding: 4 },
  quantityButton: { 
    backgroundColor: 'white', 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityInput: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginHorizontal: 8, 
    minWidth: 30, 
    textAlign: 'center', 
    color: '#2D3748',
    paddingVertical: 0,
  },
  
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'white', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    paddingBottom: 30, 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  footerText: { fontSize: 12, color: '#A0AEC0', fontWeight: '600', textTransform: 'uppercase' },
  footerTotal: { fontSize: 22, fontWeight: '800', color: '#1d3557' },
  placeOrderButton: { 
    backgroundColor: '#1d3557', 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 16,
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, color: '#A0AEC0', marginTop: 16, fontWeight: '500' },
  
  headerContainer: { marginBottom: 10 },
  detailsCard: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 24, 
    marginTop: 10, 
    marginBottom: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 3 
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748', marginBottom: 20 },
  itemsTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748', marginBottom: 12, marginLeft: 4 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, color: '#718096', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#F7FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12, 
    paddingHorizontal: 16 
  },
  inputIcon: { marginTop: 14, marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#2D3748', paddingVertical: 14 },
  
  summarySection: { 
    marginTop: 10, 
    backgroundColor: 'white', 
    padding: 24, 
    borderRadius: 20, 
    marginBottom: 20,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 3 
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 15, color: '#718096' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#2D3748' },
  divider: { height: 1, backgroundColor: '#EDF2F7', marginVertical: 12 },
  grossRow: { marginTop: 4 },
  grossLabel: { fontSize: 18, fontWeight: '800', color: '#1d3557' },
  grossValue: { fontSize: 18, fontWeight: '800', color: '#2a9d8f' },
  
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
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1d3557',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
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
  successButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});