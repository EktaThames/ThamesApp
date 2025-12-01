import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductDetails({ route }) {
  const { product } = route.params; // Receive item from navigation
  const [quantity, setQuantity] = useState(1);
  const [selectedPack, setSelectedPack] = useState(
  product.pricing && product.pricing.length > 0 ? product.pricing[0] : null
);

  // Helper to format price, ensuring it's a number
  const formatPrice = (price) => {
    const numericPrice = parseFloat(price);
    return isNaN(numericPrice) ? 'N/A' : `£${numericPrice.toFixed(2)}`;
  };

  const handleQuantityChange = (amount) => {
    setQuantity(prev => Math.max(1, prev + amount));
  };

  // Get the primary price (Tier 1) to display prominently
const primaryPrice = selectedPack;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Image Placeholder */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Image</Text>
        </View>

        {/* Main Info Card */}
        <View style={styles.mainInfoCard}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{product.description}</Text>
            {primaryPrice && (
              <Text style={styles.mainPrice}>{formatPrice(primaryPrice.sell_price)}</Text>
            )}
          </View>
          <Text style={styles.packDescription}>{product.pack_description}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>SKU</Text>
              <Text style={styles.metaValue}>{product.item}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Stock</Text>
              <Text style={[styles.metaValue, styles.stockValue]}>{product.qty_in_stock ?? '0'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>VAT Code</Text>
              <Text style={styles.metaValue}>{product.vat ?? 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Pack Selector Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Select Pack Size</Text>

  {product.pricing?.length > 0 ? (
    product.pricing.map((p, index) => {
      const isSelected = selectedPack?.tier === p.tier;
      return (
        <TouchableOpacity
          key={index}
          onPress={() => setSelectedPack(p)}
          style={[
            styles.packOption,
            isSelected && styles.packSelected
          ]}
        >
          <View>
            <Text style={styles.packLabel}>
              {p.pack_size || `Pack ${p.tier}`}
            </Text>
            <Text style={styles.packDescriptionText}>
              {p.description || product.pack_description}
            </Text>
          </View>

          <View>
            {p.promo_price ? (
              <>
                <Text style={styles.promoPrice}>{formatPrice(p.promo_price)}</Text>
                <Text style={styles.originalPrice}>{formatPrice(p.sell_price)}</Text>
              </>
            ) : (
              <Text style={styles.normalPrice}>{formatPrice(p.sell_price)}</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    })
  ) : (
    <Text style={styles.noData}>No pack sizes available.</Text>
  )}
</View>


        {/* Pricing Section */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing Tiers</Text>
          {product.pricing?.length > 0 ? (
            product.pricing.map((p, index) => (
              <View key={index} style={styles.priceRow}>
                <Text style={styles.priceTier}>{p.pack_size || `Tier ${p.tier}`}</Text>
                <View style={styles.priceValues}>
                  {p.promo_price ? (
                    <>
                      <Text style={styles.promoPrice}>{formatPrice(p.promo_price)}</Text>
                      <Text style={styles.originalPrice}>{formatPrice(p.sell_price)}</Text>
                    </>
                  ) : (
                    <Text style={styles.normalPrice}>{formatPrice(p.sell_price)}</Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No pricing information available.</Text>
          )}
        </View> */}

        {/* Barcodes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Barcodes</Text>
          {product.barcodes?.length > 0 ? (
            product.barcodes.map((b, i) => (
              <View key={i} style={styles.barcodeRow}>
                <Text style={styles.barcodeText}>{b.barcode}</Text>
                <Text style={styles.barcodeType}>{b.barcode_type}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No barcodes available.</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Add to Cart Button */}
      <View style={styles.footer}>
        <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(-1)}>
                <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(1)}>
                <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addToCartButton} onPress={() => alert(`${quantity} x ${selectedPack.pack_size || product.description} added to cart!`)}>
          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    packOption: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#e9ecef',
  marginBottom: 10,
  backgroundColor: '#ffffff',
},
packSelected: {
  borderColor: '#2a9d8f',
  backgroundColor: '#e0f4f1',
},
packLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: '#1d3557',
},
packDescriptionText: {
  fontSize: 14,
  color: '#6c757d',
},

  safeArea: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  container: {
    flex: 1,
  },
  imagePlaceholder: {
    height: 250,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#adb5bd',
    fontSize: 18,
    fontWeight: '500',
  },
  mainInfoCard: {
    backgroundColor: 'white',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    marginTop: -50, // Pulls the card up over the image
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  mainPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d3557',
    flex: 1, // Allow title to take up available space and wrap
    marginRight: 8, // Add space between title and price
  },
  packDescription: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 16,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  stockValue: {
    color: '#2a9d8f',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d3557',
    marginBottom: 12,
  },
  noData: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  priceValues: {
    alignItems: 'flex-end',
  },
  priceTier: {
    fontSize: 15,
    color: '#495057',
    fontWeight: '500',
  },
  normalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  promoPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e63946', // A vibrant red for promos
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    color: '#adb5bd',
  },
  barcodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  barcodeText: {
    fontSize: 14,
    color: '#495057',
  },
  barcodeType: {
    fontSize: 14,
    color: '#6c757d',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#495057',
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d3557',
    marginHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 24, // Extra padding for home bar
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  addToCartButton: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: '#2a9d8f',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
