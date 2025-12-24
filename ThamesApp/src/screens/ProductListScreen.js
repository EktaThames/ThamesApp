import React, { useEffect, useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal, ScrollView, TouchableWithoutFeedback, Image, InteractionManager, SectionList, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config/api';
import BarcodeScannerScreen from './BarcodeScannerScreen';

// Optimized Chip Component (Only re-renders if selection changes)
const FilterChip = React.memo(({ id, label, isSelected, onToggle }) => (
  <TouchableOpacity 
    style={[styles.chip, isSelected && styles.chipActive]}
    onPress={() => onToggle(id)}
  >
    <Text style={[styles.chipText, isSelected && styles.chipActiveText]}>{label}</Text>
  </TouchableOpacity>
));

const FilterToggle = React.memo(({ label, isActive, onToggle }) => (
  <TouchableOpacity 
    style={[styles.toggleButton, isActive && styles.toggleActive]}
    onPress={onToggle}
  >
    <Text style={[styles.toggleText, isActive && styles.toggleActiveText]}>{label}</Text>
  </TouchableOpacity>
));

// Helper to chunk items into rows for virtualized grid rendering
const chunkItems = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const ToggleSection = React.memo(({ pmp, promotion, clearance, onPmpToggle, onPromotionToggle, onClearanceToggle }) => (
  <View style={styles.toggleContainer}>
    <FilterToggle 
      label="PMP" 
      isActive={pmp} 
      onToggle={onPmpToggle} 
    />
    <FilterToggle 
      label="Promotion" 
      isActive={promotion} 
      onToggle={onPromotionToggle} 
    />
    <FilterToggle 
      label="Clearance" 
      isActive={clearance} 
      onToggle={onClearanceToggle} 
    />
  </View>
));

const FilterHeader = React.memo(({ onClear }) => (
  <View style={styles.modalHeader}>
    <Text style={styles.modalTitle}>Filters</Text>
    <TouchableOpacity onPress={onClear}>
      <Text style={styles.clearButtonText}>Clear All</Text>
    </TouchableOpacity>
  </View>
));

// Separate FilterModal component to prevent main screen re-renders
const FilterModal = React.memo(({ 
  visible, 
  onClose, 
  onApply, 
  filters, 
  categories, 
  subcategories, 
  brands,
  onCategoryToggle,
  onSubcategoryToggle,
  onBrandToggle,
  onPmpToggle,
  onPromotionToggle,
  onClearanceToggle,
  onClear
}) => {
  const [expandedSections, setExpandedSections] = useState({
    categories: false,
    subcategories: false,
    brands: false
  });

  const filteredSubcategories = useMemo(() => {
    if (filters.categories.length === 0) return [];
    return subcategories.filter(sub => filters.categories.includes(sub.category_id));
  }, [subcategories, filters.categories]);

  // Create Sets for O(1) lookup
  const selectedCategories = useMemo(() => new Set(filters.categories), [filters.categories]);
  const selectedSubcategories = useMemo(() => new Set(filters.subcategories), [filters.subcategories]);
  const selectedBrands = useMemo(() => new Set(filters.brands), [filters.brands]);

  const sections = useMemo(() => {
    const result = [];
    const INITIAL_LIMIT = 16;

    const createSection = (key, title, items) => {
      if (!items || items.length === 0) return null;
      const isExpanded = expandedSections[key];
      const visibleItems = isExpanded ? items : items.slice(0, INITIAL_LIMIT);
      // Chunk items into rows of 4 for grid layout within SectionList
      const data = chunkItems(visibleItems, 4);
      
      return {
        title,
        key,
        data,
        totalCount: items.length,
        isExpanded,
        showButton: items.length > INITIAL_LIMIT
      };
    };

    const s1 = createSection('categories', 'Category', categories);
    if (s1) result.push(s1);
    
    const s2 = createSection('subcategories', 'Sub-category', filteredSubcategories);
    if (s2) result.push(s2);
    
    const s3 = createSection('brands', 'Brand', brands);
    if (s3) result.push(s3);

    return result;
  }, [categories, filteredSubcategories, brands, expandedSections]);

  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.filterSectionTitle}>{title}</Text>
  );

  const renderItem = useCallback(({ item, section }) => {
    let isSelectedFunc;
    let onToggleFunc;

    if (section.key === 'categories') {
      isSelectedFunc = (id) => selectedCategories.has(id);
      onToggleFunc = onCategoryToggle;
    } else if (section.key === 'subcategories') {
      isSelectedFunc = (id) => selectedSubcategories.has(id);
      onToggleFunc = onSubcategoryToggle;
    } else {
      isSelectedFunc = (id) => selectedBrands.has(id);
      onToggleFunc = onBrandToggle;
    }

    return (
      <View style={styles.chipRow}>
        {item.map(dataItem => (
          <FilterChip
            key={dataItem.id}
            id={dataItem.id}
            label={dataItem.name}
            isSelected={isSelectedFunc(dataItem.id)}
            onToggle={onToggleFunc}
          />
        ))}
      </View>
    );
  }, [selectedCategories, selectedSubcategories, selectedBrands, onCategoryToggle, onSubcategoryToggle, onBrandToggle]);

  const renderSectionFooter = ({ section }) => {
    if (!section.showButton) return null;
    return (
      <TouchableOpacity 
        onPress={() => setExpandedSections(prev => ({ ...prev, [section.key]: !prev[section.key] }))} 
        style={styles.showMoreButton}
      >
        <Text style={styles.showMoreText}>
          {section.isExpanded ? 'Show Less' : `Show All (${section.totalCount})`}
        </Text>
        <Icon name={section.isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={16} color="#2a9d8f" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <FilterHeader onClear={onClear} />
              <SectionList
                sections={sections}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                renderSectionFooter={renderSectionFooter}
                ListHeaderComponent={
                  <ToggleSection 
                    pmp={filters.pmp} 
                    promotion={filters.promotion} 
                    clearance={filters.clearance}
                    onPmpToggle={onPmpToggle} 
                    onPromotionToggle={onPromotionToggle} 
                    onClearanceToggle={onClearanceToggle}
                  />
                }
                contentContainerStyle={{ paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => onApply(filters)}>
                <Text style={styles.closeButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

// FilterUI Component: Manages visibility internally to prevent parent re-renders
const FilterUI = React.memo(forwardRef(({ activeFilters, categories, subcategories, brands, onApply }, ref) => {
  const [visible, setVisible] = useState(false);
  const [draftFilters, setDraftFilters] = useState(activeFilters);

  const openModal = useCallback(() => {
    setDraftFilters(activeFilters);
    // Use requestAnimationFrame to ensure the UI is ready to handle the update
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }, [activeFilters]);

  useImperativeHandle(ref, () => ({
    open: openModal,
    close: () => setVisible(false)
  }));

  // Optimization: Map subcategory ID to Category ID for O(1) lookup
  const subcategoryCategoryMap = useMemo(() => {
    const map = {};
    subcategories.forEach(sub => {
      map[sub.id] = sub.category_id;
    });
    return map;
  }, [subcategories]);

  const handleCategoryToggle = useCallback((catId) => {
    setDraftFilters(prev => {
      const newCategories = prev.categories.includes(catId)
        ? prev.categories.filter(id => id !== catId)
        : [...prev.categories, catId];
      
      const newSubcategories = prev.subcategories.filter(subId => {
        const catId = subcategoryCategoryMap[subId];
        return newCategories.includes(catId);
      });

      return { ...prev, categories: newCategories, subcategories: newSubcategories };
    });
  }, [subcategoryCategoryMap]);

  const handleSubcategoryToggle = useCallback((subId) => {
    setDraftFilters(prev => ({
      ...prev,
      subcategories: prev.subcategories.includes(subId)
        ? prev.subcategories.filter(id => id !== subId)
        : [...prev.subcategories, subId],
    }));
  }, []);

  const handleBrandToggle = useCallback((brandId) => {
    setDraftFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brandId)
        ? prev.brands.filter(id => id !== brandId)
        : [...prev.brands, brandId],
    }));
  }, []);

  const handleClear = useCallback(() => {
    setDraftFilters({
      categories: [],
      subcategories: [],
      brands: [],
      pmp: false,
      promotion: false,
      clearance: false,
    });
  }, []);

  const handleApply = useCallback((filters) => {
    setVisible(false);
    onApply(filters);
  }, [onApply]);

  return (
    <>
      <TouchableOpacity style={styles.filterButton} onPress={openModal}>
        <Icon name="options-outline" size={24} color="#495057" />
      </TouchableOpacity>
      <FilterModal
        visible={visible}
        onClose={() => setVisible(false)}
        onApply={handleApply}
        filters={draftFilters}
        categories={categories}
        subcategories={subcategories}
        brands={brands}
        onCategoryToggle={handleCategoryToggle}
        onSubcategoryToggle={handleSubcategoryToggle}
        onBrandToggle={handleBrandToggle}
        onPmpToggle={() => setDraftFilters(f => ({...f, pmp: !f.pmp}))}
        onPromotionToggle={() => setDraftFilters(f => ({...f, promotion: !f.promotion}))}
        onClearanceToggle={() => setDraftFilters(f => ({...f, clearance: !f.clearance}))}
        onClear={handleClear}
      />
    </>
  );
}));

export default function ProductListScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState(
    route.params?.expandedProductId ? String(route.params.expandedProductId) : null
  );
  const [cart, setCart] = useState({}); // { productId: { product, quantity } }
  const [searchQuery, setSearchQuery] = useState(route.params?.initialSearch || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(route.params?.initialSearch || '');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isScannerVisible, setScannerVisible] = useState(route.params?.openScanner || false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [actingAsClient, setActingAsClient] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const filterRef = useRef(null);

  // State for filter options
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  // const [sizeOptions, setSizeOptions] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    subcategories: [],
    brands: [],
    pmp: false,
    promotion: false,
    clearance: false,
    ...(route.params?.activeFilters || {})
  });

  const shareMissingImages = useCallback(async () => {
    const missing = Object.keys(imageErrors);
    if (missing.length === 0) return;
    try {
      await Share.share({
        message: `Missing Images Report (${missing.length}):\n\n${missing.join('\n')}`,
        title: 'Missing Product Images'
      });
    } catch (error) {
      console.error(error);
    }
  }, [imageErrors]);

  const scanImages = useCallback(async () => {
    if (products.length === 0) {
      Alert.alert("No Products", "No products loaded to scan.");
      return;
    }

    Alert.alert(
      "Scan Images",
      `Scan ${products.length} loaded products for missing images?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Scan", 
          onPress: async () => {
            setLoading(true);
            const newErrors = {};
            const BATCH_SIZE = 10;
            
            // Filter out products we already know have errors to save time
            const productsToCheck = products.filter(p => !imageErrors[p.item]);

            for (let i = 0; i < productsToCheck.length; i += BATCH_SIZE) {
              const batch = productsToCheck.slice(i, i + BATCH_SIZE);
              await Promise.all(batch.map(async (p) => {
                const url = `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${p.item}.webp`;
                try {
                  const res = await fetch(url, { method: 'HEAD' });
                  if (res.status !== 200) {
                    newErrors[p.item] = true;
                  }
                } catch (e) {
                  newErrors[p.item] = true;
                }
              }));
            }

            setImageErrors(prev => ({ ...prev, ...newErrors }));
            setLoading(false);
            
            const count = Object.keys(newErrors).length;
            Alert.alert("Scan Complete", count > 0 ? `Found ${count} new missing images.` : "No new missing images found.");
          }
        }
      ]
    );
  }, [products, imageErrors]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* <TouchableOpacity onPress={scanImages} style={{ marginRight: 16 }}>
            <Icon name="images-outline" size={26} color="#1d3557" />
          </TouchableOpacity> */}
          {/* {Object.keys(imageErrors).length > 0 && (
            <TouchableOpacity onPress={shareMissingImages} style={{ marginRight: 16 }}>
              <Icon name="alert-circle-outline" size={26} color="#e63946" />
            </TouchableOpacity>
          )} */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            style={{ marginRight: 16 }}
          >
            <Icon name="cart-outline" size={28} color="#1d3557" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, imageErrors, shareMissingImages, scanImages]);

  // Helper to format price
  const formatPrice = (price) => {
    const numericPrice = parseFloat(price);
    // Guard against null/undefined values before calling toFixed()
    if (isNaN(numericPrice)) return 'N/A';
    return isNaN(numericPrice) ? 'N/A' : `£${numericPrice.toFixed(2)}`;
  };

  useFocusEffect(
    useCallback(() => {
      const loadCart = async () => {
        try {
          const clientData = await AsyncStorage.getItem('actingAsClient');
          let targetId = null;
          if (clientData) {
            const client = JSON.parse(clientData);
            setActingAsClient(client);
            targetId = client.id;
          } else {
            targetId = await AsyncStorage.getItem('userId');
            setActingAsClient(null);
          }
          
          const cartKey = targetId ? `cart_${targetId}` : 'cart';
          const storedCart = await AsyncStorage.getItem(cartKey);
          if (storedCart) {
            setCart(JSON.parse(storedCart));
          } else {
            setCart({});
          }
        } catch (e) { console.error(e); }
      };
      loadCart();
    }, [])
  );

  const exitClientMode = async () => {
    await AsyncStorage.removeItem('actingAsClient');
    setActingAsClient(null);
    // Reload cart for original user
    const userId = await AsyncStorage.getItem('userId');
    const cartKey = userId ? `cart_${userId}` : 'cart';
    const storedCart = await AsyncStorage.getItem(cartKey);
    setCart(storedCart ? JSON.parse(storedCart) : {});
  };

  const updateCartQuantity = useCallback((product, tier, amount) => {
    const cartKey = `${product.id}-${tier.tier}`;
    setCart(prevCart => {
      const existingItem = prevCart[cartKey];
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + amount;
      let newCart;

      if (newQuantity <= 0) {
        const { [cartKey]: _, ...rest } = prevCart;
        newCart = rest; // Remove item from cart
      } else {
        newCart = {
          ...prevCart,
          [cartKey]: { product, tier, quantity: newQuantity }
        };
      }
      
      // Determine correct storage key
      AsyncStorage.getItem('actingAsClient').then(clientData => {
        return clientData ? JSON.parse(clientData).id : AsyncStorage.getItem('userId');
      }).then(targetId => {
        const cartKey = targetId ? `cart_${targetId}` : 'cart';
        AsyncStorage.setItem(cartKey, JSON.stringify(newCart)).catch(e => console.error(e));
      });
      return newCart;
    });
  }, []);

  const setCartQuantity = useCallback((product, tier, quantity) => {
    const cartKey = `${product.id}-${tier.tier}`;
    setCart(prevCart => {
      let newCart;
      
      if (quantity <= 0) {
        const { [cartKey]: _, ...rest } = prevCart;
        newCart = rest; 
      } else {
        newCart = {
          ...prevCart,
          [cartKey]: { product, tier, quantity: quantity }
        };
      }
      
      // Determine correct storage key
      AsyncStorage.getItem('actingAsClient').then(clientData => {
        return clientData ? JSON.parse(clientData).id : AsyncStorage.getItem('userId');
      }).then(targetId => {
        const cartKey = targetId ? `cart_${targetId}` : 'cart';
        AsyncStorage.setItem(cartKey, JSON.stringify(newCart)).catch(e => console.error(e));
      });
      return newCart;
    });
  }, []);

  const cartTotal = Object.values(cart).reduce((total, item) => {
    const price = parseFloat(item.tier.promo_price || item.tier.sell_price);
    return total + (price * item.quantity);
  }, 0);

  const totalItems = Object.values(cart).reduce((total, item) => total + item.quantity, 0);

  const fetchProducts = async (pageNumber = 1, shouldReset = false) => {
    if (pageNumber === 1) setLoading(true);
    
    try {
      // Construct Query Params
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: '20',
        search: debouncedSearchQuery,
        pmp: activeFilters.pmp.toString(),
        promotion: activeFilters.promotion.toString(),
        clearance: (activeFilters.clearance || false).toString(),
      });

      if (activeFilters.categories.length > 0) params.append('categories', activeFilters.categories.join(','));
      if (activeFilters.subcategories.length > 0) params.append('subcategories', activeFilters.subcategories.join(','));
      if (activeFilters.brands.length > 0) params.append('brands', activeFilters.brands.join(','));

      const response = await fetch(`${API_URL}/api/products?${params.toString()}`);
      const data = await response.json();

      if (shouldReset) {
        setProducts(data);
      } else {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewData = data.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewData];
        });
      }

      setHasMore(data.length === 20); // If we got less than limit, we are at the end
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Initial Fetch and Filter Changes
  useEffect(() => {
    setPage(1);
    fetchProducts(1, true);
  }, [activeFilters, debouncedSearchQuery]); // Re-fetch when filters or search change

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, false);
  };

  useEffect(() => {
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

  // Consolidated Effect to handle all navigation params (Search, Filters, Expansion)
  useEffect(() => {
    if (!route.params) return;

    const { 
      expandedProductId, 
      productId,
      activeFilters: incomingFilters, 
      initialSearch, 
      openScanner, 
      openFilters 
    } = route.params;

    // Handle Search & Filters together to prevent double fetch and flash of content
    if (initialSearch !== undefined || incomingFilters) {
      setLoading(true); // Show loading immediately to prevent showing previous results
      setProducts([]);  // Clear previous list
      
      if (initialSearch !== undefined) {
        setSearchQuery(initialSearch);
        setDebouncedSearchQuery(initialSearch);
      }
      
      if (incomingFilters) {
        // Merge with defaults to ensure all keys exist
        setActiveFilters({
          categories: [],
          subcategories: [],
          brands: [],
          pmp: false,
          promotion: false,
          clearance: false,
          ...incomingFilters
        });
      }
    }

    const targetId = expandedProductId ?? productId;
    if (targetId != null && String(targetId) !== 'undefined') {
      InteractionManager.runAfterInteractions(() => {
        setExpandedProductId(String(targetId));
      });
    }

    if (openScanner !== undefined) {
      setScannerVisible(openScanner);
    }
    if (openFilters) {
      filterRef.current?.open();
    }
  }, [route.params]);

  const handleBarcodeSearch = async (code) => {
    const barcodeToSearch = typeof code === 'string' ? code : scannedBarcode;
    if (!barcodeToSearch) return;

    setScanLoading(true);
    setScanError('');
    try {
      const response = await fetch(`${API_URL}/api/products/by-barcode/${barcodeToSearch}`);
      const product = await response.json();

      if (response.ok) {
        setProducts([product]); // Show only the scanned product
        setExpandedProductId(product.id); // Expand it
        setScannerVisible(false); // Close the modal
        setScannedBarcode('');
      } else {
        // If scanning with camera, show Alert since modal might be closing or camera active
        Alert.alert('Product not found', `Scanned: ${barcodeToSearch}\n\n${product.message || 'Product not found.'}`);
        setScanError(product.message || 'Product not found.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
      console.error('Barcode search error:', error);
    } finally {
      setScanLoading(false);
    }
  };

  const handleApplyFilters = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);

  const handleImageError = useCallback((sku) => {
    console.log('Missing Image SKU:', sku);
    setImageErrors(prev => ({ ...prev, [sku]: true }));
  }, []);

  // Memoize the renderItem function to prevent the FlatList from re-rendering
  // when we are just interacting with the Modal (which updates state)
  const renderProductItem = useCallback(({ item }) => {
    const isExpanded = expandedProductId != null && String(expandedProductId) === String(item.id);

    const isClearance = item.item && item.item.endsWith('/R');
    const isPromotion = !isClearance && item.pricing && item.pricing.some(p => p.promo_price && parseFloat(p.promo_price) > 0);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpandedProductId(isExpanded ? null : item.id)}
      >
        {/* Collapsed View */}
        <View style={styles.collapsedContainer}>
          <View style={styles.imageContainer}>
            {imageErrors[item.item] ? (
              <View style={[styles.productImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }]}>
                <Icon name="image-outline" size={24} color="#ced4da" />
              </View>
            ) : (
              <Image source={{ uri: `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${item.item}.webp` }} style={styles.productImage} onError={() => handleImageError(item.item)} />
            )}
            {isClearance && (
              <View style={[styles.badge, styles.clearanceBadge]}>
                <Text style={styles.badgeText}>Sale</Text>
              </View>
            )}
            {isPromotion && (
              <View style={[styles.badge, styles.promotionBadge]}>
                <Text style={styles.badgeText}>Sale</Text>
              </View>
            )}
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.name} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.sku}>
              SKU: {item.item} {item.pack_description ? `| ${item.pack_description}` : ''}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            {item.pricing && item.pricing.length > 0 && (
              <Text style={styles.price}>
                {formatPrice(item.pricing[0].promo_price || item.pricing[0].sell_price)}
              </Text>
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
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType="numeric"
                    value={String(cart[`${item.id}-${tier.tier}`]?.quantity || 0)}
                    onChangeText={(text) => {
                      const val = parseInt(text) || 0;
                      setCartQuantity(item, tier, val);
                    }}
                  />
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
  }, [expandedProductId, cart, updateCartQuantity, imageErrors, handleImageError]);

  return (
    <>
      {/* FILTER MODAL */}
      {/* Barcode Scanner Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isScannerVisible}
        onRequestClose={() => setScannerVisible(false)}
      >
        <BarcodeScannerScreen
          onClose={() => setScannerVisible(false)}
          onBarcodeScanned={(code) => {
            // This callback is triggered from the scanner
            setScannerVisible(false); // Close the modal
            handleBarcodeSearch(code); // Process the code
          }}
        />
      </Modal>

      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {actingAsClient && (
          <View style={{ backgroundColor: '#e0f4f1', padding: 8, marginBottom: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#2a9d8f', fontWeight: 'bold' }}>Ordering for: {actingAsClient.name}</Text>
            <TouchableOpacity onPress={exitClientMode}>
              <Text style={{ color: '#e63946', fontWeight: 'bold' }}>Exit</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.searchContainer}>
            <Icon name="search-outline" size={20} color="#6c757d" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#6c757d"
            />
            <TouchableOpacity style={styles.barcodeButton} onPress={() => setScannerVisible(true)}>
              <Icon name="camera-outline" size={22} color="#495057" />
            </TouchableOpacity>
            <FilterUI 
              ref={filterRef}
              activeFilters={activeFilters}
              categories={categories}
              subcategories={subcategories}
              brands={brands}
              onApply={handleApplyFilters}
            />
          </View>
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d3557" />
        </View>
      ) : (
        <FlatList
          data={products}
          extraData={expandedProductId}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }} // Padding to not hide last item behind cart total
          ListFooterComponent={loadingMore && <ActivityIndicator size="small" color="#1d3557" style={{ marginVertical: 20 }} />}
        />
      )}

      {/* Cart Total Footer */}
      {totalItems > 0 && (
        <TouchableOpacity 
          style={styles.footer}
          onPress={() => navigation.navigate('Cart', { cart, onCartUpdate: setCart })}
        >
          <Text style={styles.footerText}>{totalItems} item(s) in cart</Text>
          <View style={styles.viewCartContainer}>
            <Text style={styles.footerTotal}>View Cart: {formatPrice(cartTotal)}</Text>
            <Icon name="chevron-forward-outline" size={22} color="white" style={{ marginLeft: 8 }}/>
          </View>
        </TouchableOpacity>
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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  iconButton: {
    padding: 5,
    marginHorizontal: 2,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginHorizontal: 8,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1d3557',
  },
  barcodeButton: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 8,
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
  imageContainer: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
  quantityInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#ced4da',
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
  viewCartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    elevation: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  clearanceBadge: {
    backgroundColor: '#e63946', // Red
  },
  promotionBadge: {
    backgroundColor: '#fca311', // Orange/Yellow
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
  chipRow: {
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
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 5,
  },
  showMoreText: {
    color: '#2a9d8f',
    fontWeight: '600',
    marginRight: 4,
  },
  closeCameraButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
});
