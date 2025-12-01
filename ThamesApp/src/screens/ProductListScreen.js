import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config/api';

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [cart, setCart] = useState({}); // { productId: { product, quantity } }
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Helper to format price
  const formatPrice = (price) => {
    const numericPrice = parseFloat(price);
    return isNaN(numericPrice) ? 'N/A' : `£${numericPrice.toFixed(2)}`;
  };

  const updateCartQuantity = (product, tier, amount) => {
    const cartKey = `${product.id}-${tier.tier}`;
    setCart(prevCart => {
      const existingItem = prevCart[cartKey];
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + amount;

      if (newQuantity <= 0) {
        const { [cartKey]: _, ...rest } = prevCart;
        return rest; // Remove item from cart
      } else {
        return {
          ...prevCart,
          [cartKey]: { product, tier, quantity: newQuantity }
        };
      }
    });
  };

  const cartTotal = Object.values(cart).reduce((total, item) => {
    const price = parseFloat(item.tier.promo_price || item.tier.sell_price);
    return total + (price * item.quantity);
  }, 0);

  const totalItems = Object.values(cart).reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setFilteredProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  // Effect to handle filtering when search query changes
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredProducts(products);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = products.filter(product => 
        product.description.toLowerCase().includes(lowercasedQuery) ||
        product.item.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.barcodeButton} onPress={() => alert('Barcode scanner coming soon!')}>
            <Icon name="camera-outline" size={24} color="#495057" />
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <Text style={styles.loadingText}>Loading products...</Text>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isExpanded = expandedProductId === item.id;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setExpandedProductId(isExpanded ? null : item.id)}
              >
                {/* Collapsed View */}
                <View style={styles.collapsedContainer}>
                  <View style={styles.infoContainer}>
                    <Text style={styles.name} numberOfLines={2}>{item.description}</Text>
                    <Text style={styles.sku}>
                      SKU: {item.item} {item.pack_description ? `| ${item.pack_description}` : ''}
                    </Text>
                  </View>
                  <View style={styles.priceContainer}>
                    {item.pricing && item.pricing.length > 0 && (
                      <Text style={styles.price}>{formatPrice(item.pricing[0].sell_price)}</Text>
                    )}
                    <Text style={styles.stock}>Stock: {item.qty_in_stock ?? '0'}</Text>
                  </View>
                </View>

                {/* Expanded View */}
                {isExpanded && (
                  <View style={styles.expandedContainer}>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>RRP</Text>
                        <Text style={styles.detailValue}>{formatPrice(item.rrp)}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>POR</Text>
                      <Text style={styles.detailValue}>{!isNaN(parseFloat(item.por)) ? `${parseFloat(item.por).toFixed(2)}%` : 'N/A'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>VAT</Text>
                        <Text style={styles.detailValue}>{item.vat || 'N/A'}</Text>
                      </View>
                    </View>
                    <Text style={styles.sectionTitle}>Pack Sizes & Prices</Text>
                    {item.pricing?.map(tier => (
                      <View key={tier.tier} style={styles.tierRow}>
                        <View style={styles.tierInfo}>
                          <Text style={styles.tierPack}>{tier.pack_size || `Pack ${tier.tier}`}</Text>
                          {tier.promo_price ? (
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <Text style={styles.promoPrice}>{formatPrice(tier.promo_price)}</Text>
                              <Text style={styles.originalPrice}>{formatPrice(tier.sell_price)}</Text>
                            </View>
                          ) : (
                            <Text style={styles.normalPrice}>{formatPrice(tier.sell_price)}</Text>
                          )}
                        </View>
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity 
                            style={styles.quantityButton} 
                            onPress={() => updateCartQuantity(item, tier, -1)}
                          >
                            <Text style={styles.quantityButtonText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.quantityValue}>
                            {cart[`${item.id}-${tier.tier}`]?.quantity || 0}
                          </Text>
                          <TouchableOpacity 
                            style={styles.quantityButton} 
                            onPress={() => updateCartQuantity(item, tier, 1)}>
                            <Text style={styles.quantityButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Cart Total Footer */}
      {totalItems > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{totalItems} item(s) in cart</Text>
          <Text style={styles.footerTotal}>Total: {formatPrice(cartTotal)}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f7',
    borderRadius: 10,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1d3557',
  },
  barcodeButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  collapsedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  infoContainer: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d3557',
  },
  sku: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
  stock: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  expandedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
    marginTop: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1d3557',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d3557',
    marginTop: 10,
    marginBottom: 8,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  tierInfo: {
    flex: 1,
  },
  tierPack: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  normalPrice: {
    fontSize: 14,
    color: '#333',
  },
  promoPrice: {
    fontSize: 14,
    color: '#e63946',
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 12,
    color: '#888',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  quantityButton: {
    backgroundColor: '#2a9d8f',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d3557',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1d3557',
    padding: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerTotal: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
