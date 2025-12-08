import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal, ScrollView, TouchableWithoutFeedback, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config/api';

export default function ProductListScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProductId, setExpandedProductId] = useState(route.params?.expandedProductId || null);
  const [cart, setCart] = useState({}); // { productId: { product, quantity } }
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isFilterVisible, setFilterVisible] = useState(false);
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);


  // State for filter options
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  // const [sizeOptions, setSizeOptions] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    subcategories: [],
    brands: [],
    // sizes: [],
    pmp: false,
    promotion: false,
  });

  // Helper to format price
  const formatPrice = (price) => {
    const numericPrice = parseFloat(price);
    // Guard against null/undefined values before calling toFixed()
    if (isNaN(numericPrice)) return 'N/A';
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
        // Extract unique sizes from products for the filter options
        // const uniqueSizes = [...new Set(data.map(p => p.pack_description).filter(Boolean))];
        // setSizeOptions(uniqueSizes.sort());
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });

    // Fetch categories for filter
    fetch(`${API_URL}/api/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.log('Error fetching categories:', err));

    // Fetch subcategories for filter
    fetch(`${API_URL}/api/categories/sub`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSubcategories(data);
        }
      })
      .catch(err => console.log('Error fetching subcategories:', err));

    // Fetch brands for filter
    fetch(`${API_URL}/api/brands`)
      .then(res => res.json())
      .then(data => {
        // Ensure we only set an array to the state
        if (Array.isArray(data)) {
          setBrands(data);
        }
      })
      .catch(err => console.log('Error fetching brands:', err));

  }, []);

  // Effect to handle expanding a product when navigated to from another screen
  useEffect(() => {
    const { expandedProductId, activeFilters: incomingFilters } = route.params || {};
    if (expandedProductId) {
      setExpandedProductId(expandedProductId);
    }
    if (incomingFilters) {
      setActiveFilters(incomingFilters);
    }
  }, [route.params]);

  // Effect to handle filtering when search query changes
  useEffect(() => {
    const noFiltersApplied =
      searchQuery === '' &&
      activeFilters.categories.length === 0 &&
      activeFilters.subcategories.length === 0 &&
      activeFilters.brands.length === 0 &&
      // activeFilters.sizes.length === 0 &&
      !activeFilters.pmp &&
      !activeFilters.promotion;

    if (noFiltersApplied) {
      setFilteredProducts(products);
    } else {
      let filtered = [...products];

      // Apply search query
      if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(product => 
          (product.description && product.description.toLowerCase().includes(lowercasedQuery)) ||
          (product.item && product.item.toLowerCase().includes(lowercasedQuery))
        );
      }

      // Apply category filter (multi-select)
      if (activeFilters.categories.length > 0) {
        filtered = filtered.filter(p => activeFilters.categories.includes(p.hierarchy1));
      }
      // Apply subcategory filter (multi-select)
      if (activeFilters.subcategories.length > 0) {
        filtered = filtered.filter(p => activeFilters.subcategories.includes(p.hierarchy2));
      }
      // Apply brand filter (multi-select)
      if (activeFilters.brands.length > 0) {
        filtered = filtered.filter(p => activeFilters.brands.includes(p.brand_id));
      }
      // // Apply size filter (multi-select)
      // if (activeFilters.sizes.length > 0) {
      //   filtered = filtered.filter(p => activeFilters.sizes.includes(p.pack_description));
      // }
      // Apply PMP filter
      if (activeFilters.pmp) {
        filtered = filtered.filter(p => p.pmp_plain === 'PMP');
      }
      // Apply Promotion filter
      if (activeFilters.promotion) {
        filtered = filtered.filter(p => p.pricing && p.pricing.some(tier => tier.promo_price));
      }

      setFilteredProducts(filtered);
    }
  }, [searchQuery, products, activeFilters]);

  const handleBarcodeSearch = async () => {
    if (!scannedBarcode) return;
    setScanLoading(true);
    setScanError('');
    try {
      const response = await fetch(`${API_URL}/api/products/by-barcode/${scannedBarcode}`);
      const product = await response.json();

      if (response.ok) {
        setFilteredProducts([product]); // Show only the scanned product
        setExpandedProductId(product.id); // Expand it
        setScannerVisible(false); // Close the modal
        setScannedBarcode('');
      } else {
        setScanError(product.message || 'Product not found.');
      }
    } catch (error) {
      setScanError('An error occurred. Please try again.');
      console.error('Barcode search error:', error);
    } finally {
      setScanLoading(false);
    }
  };

  const handleCategoryToggle = (catId) => {
    setActiveFilters(prev => {
      const newCategories = prev.categories.includes(catId)
        ? prev.categories.filter(id => id !== catId)
        : [...prev.categories, catId];
      
      // Also remove subcategories that don't belong to the remaining selected categories
      const newSubcategories = prev.subcategories.filter(subId => {
        const sub = subcategories.find(s => s.id === subId);
        return sub && newCategories.includes(sub.category_id);
      });

      return { ...prev, categories: newCategories, subcategories: newSubcategories };
    });
  };

  const handleSubcategoryToggle = (subId) => {
    setActiveFilters(prev => ({
      ...prev,
      subcategories: prev.subcategories.includes(subId)
        ? prev.subcategories.filter(id => id !== subId)
        : [...prev.subcategories, subId],
    }));
  };

  const handleBrandToggle = (brandId) => {
    setActiveFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brandId)
        ? prev.brands.filter(id => id !== brandId)
        : [...prev.brands, brandId],
    }));
  };

  const handleClearFilters = () => {
    setActiveFilters({
      categories: [],
      subcategories: [],
      brands: [],
      pmp: false,
      promotion: false,
    });
  };

  // const handleSizeToggle = (size) => {
  //   setActiveFilters(prev => ({
  //     ...prev,
  //     sizes: prev.sizes.includes(size)
  //       ? prev.sizes.filter(s => s !== size)
  //       : [...prev.sizes, size],
  //   }));
  // };

  return (
    <>
      {/* FILTER MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isFilterVisible}
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filters</Text>
                  <TouchableOpacity onPress={handleClearFilters}>
                    <Text style={styles.clearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                  {/* PMP and Promotion Toggles */}
                  <View style={styles.toggleContainer}>
                    <TouchableOpacity 
                      style={[styles.toggleButton, activeFilters.pmp && styles.toggleActive]}
                      onPress={() => setActiveFilters(f => ({...f, pmp: !f.pmp}))}
                    >
                      <Text style={[styles.toggleText, activeFilters.pmp && styles.toggleActiveText]}>PMP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleButton, activeFilters.promotion && styles.toggleActive]}
                      onPress={() => setActiveFilters(f => ({...f, promotion: !f.promotion}))}
                    >
                      <Text style={[styles.toggleText, activeFilters.promotion && styles.toggleActiveText]}>Promotion</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Category Filter */}
                  <Text style={styles.filterSectionTitle}>Category</Text>
                  <View style={styles.chipContainer}>
                    {categories.map(cat => (
                      <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.chip, activeFilters.categories.includes(cat.id) && styles.chipActive]}
                        onPress={() => handleCategoryToggle(cat.id)}
                      >
                        <Text style={[styles.chipText, activeFilters.categories.includes(cat.id) && styles.chipActiveText]}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Subcategory Filter */}
                  {activeFilters.categories.length > 0 && (
                    <>
                      <Text style={styles.filterSectionTitle}>Sub-category</Text>
                      <View style={styles.chipContainer}>
                        {subcategories
                          .filter(sub => activeFilters.categories.includes(sub.category_id))
                          .map(sub => (
                            <TouchableOpacity 
                              key={sub.id} 
                              style={[styles.chip, activeFilters.subcategories.includes(sub.id) && styles.chipActive]} 
                              onPress={() => handleSubcategoryToggle(sub.id)}
                            >
                              <Text style={[styles.chipText, activeFilters.subcategories.includes(sub.id) && styles.chipActiveText]}>{sub.name}</Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    </>
                  )}

                  {/* Brand Filter */}
                  <Text style={styles.filterSectionTitle}>Brand</Text>
                  <View style={styles.chipContainer}>
                    {brands && brands.map(brand => (
                      <TouchableOpacity 
                        key={brand.id} 
                        style={[styles.chip, activeFilters.brands.includes(brand.id) && styles.chipActive]}
                        onPress={() => handleBrandToggle(brand.id)}
                      >
                        <Text style={[styles.chipText, activeFilters.brands.includes(brand.id) && styles.chipActiveText]}>{brand.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* {/* Size Filter */}
                  {/* <Text style={styles.filterSectionTitle}>Size</Text> */}
                  {/* <View style={styles.chipContainer}> */}
                    {/* {sizeOptions.map(size => ( */}
                      {/* <TouchableOpacity  */}
                        {/* key={size}  */}
                        {/* style={[styles.chip, activeFilters.sizes.includes(size) && styles.chipActive]} */}
                        {/* onPress={() => handleSizeToggle(size)} */}
                      {/* > */}
                        {/* <Text style={[styles.chipText, activeFilters.sizes.includes(size) && styles.chipActiveText]}>{size}</Text> */}
                      {/* </TouchableOpacity> */}
                    {/* ))} */}
                  {/* </View> */}

                </ScrollView>
                <TouchableOpacity style={styles.closeButton} onPress={() => setFilterVisible(false)}>
                  <Text style={styles.closeButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isScannerVisible}
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scannerModalContent}>
            <Text style={styles.modalTitle}>Scan Barcode</Text>
            <Text style={styles.scannerInstruction}>
              Enter the barcode number below to find a product.
            </Text>
            <TextInput
              style={styles.barcodeInput}
              placeholder="Enter EAN..."
              value={scannedBarcode}
              onChangeText={setScannedBarcode}
              keyboardType="numeric"
              autoFocus
            />
            {scanError ? <Text style={styles.scanErrorText}>{scanError}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleBarcodeSearch} disabled={scanLoading}>
              {scanLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Find Product</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setScannerVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={20} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6c757d"
          />
          <TouchableOpacity style={styles.barcodeButton} onPress={() => setScannerVisible(true)}>
            <Icon name="camera-outline" size={24} color="#495057" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)}>
            <Icon name="options-outline" size={24} color="#495057" />
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d3557" />
        </View>
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
                  <Image source={{ uri: item.image_url }} style={styles.productImage} />
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
                        <Text style={styles.detailLabel}>VAT</Text>
                        <Text style={styles.detailValue}>{item.vat || 'N/A'}</Text>
                      </View>
                    </View>
                    <Text style={styles.sectionTitle}>Pack Sizes & Prices</Text>
                    {item.pricing?.map(tier => (
                      <View key={tier.tier} style={styles.tierRow}>
                        <View style={styles.tierInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.tierPack}>{tier.pack_size || `Pack ${tier.tier}`}</Text>
                            <Text style={styles.porText}>{!isNaN(parseFloat(item.por)) ? ` | POR: ${parseFloat(item.por).toFixed(2)}%` : ''}</Text>
                          </View>
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
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }} // Padding to not hide last item behind cart total
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
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // A slightly lighter, cleaner background
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
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    height: 44,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#1d3557',
  },
  barcodeButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12, // Slightly more rounded corners
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f8f9fa',
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
    color: '#212529', // Standard dark text for better readability
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
    color: '#2a9d8f', // Use accent color for price
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
    borderTopColor: '#f1f3f5',
    marginTop: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
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
  },
  tierInfo: {
    flex: 1,
  },
  tierPack: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  porText: {
    fontSize: 12,
    color: '#2a9d8f', // Use the app's accent color
    fontWeight: 'bold',
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
    width: 36,
    height: 36,
    borderRadius: 18, // Circular buttons
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
    color: '#212529',
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
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: '100%',
    width: '85%',
    position: 'absolute',
    right: 0,
    backgroundColor: 'white',
    paddingTop: 50, // Safe area for status bar
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1d3557',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e63946',
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d3557',
    marginTop: 20,
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  toggleActive: {
    backgroundColor: '#1d3557',
    borderColor: '#1d3557',
  },
  toggleText: {
    color: '#495057',
    fontWeight: '500',
  },
  toggleActiveText: {
    color: 'white',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    margin: 5,
  },
  chipActive: {
    backgroundColor: '#2a9d8f',
  },
  chipText: {
    color: '#495057',
  },
  chipActiveText: {
    color: 'white',
  },
  closeButton: {
    backgroundColor: '#2a9d8f',
    borderRadius: 12,
    alignItems: 'center',
    padding: 16,
    marginTop: 'auto', // Pushes button to the bottom
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scannerInstruction: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  barcodeInput: {
    height: 50,
    width: '100%',
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  scanErrorText: {
    color: '#e63946',
    marginBottom: 10,
  },
  cancelButton: {
    marginTop: 15,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
});
