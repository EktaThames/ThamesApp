// Inside HomeScreen.js
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Button, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image, TextInput, Modal, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';
import { API_URL } from '../config/api';
import CustomDrawerContent from './CustomDrawerContent';

export default function HomeScreen({ navigation, route }) {
  const [user, setUser] = useState(null);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const [categoryImageErrors, setCategoryImageErrors] = useState({});
  const [searchText, setSearchText] = useState('');

  // Admin & Sales Rep State
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [myCustomers, setMyCustomers] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetailVisible, setCustomerDetailVisible] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSearchSubmit = () => {
    navigation.navigate('ProductList', { initialSearch: searchText });
    setSearchText('');
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, subcategoriesRes] = await Promise.all([
          fetch(`${API_URL}/api/products`),
          fetch(`${API_URL}/api/categories`),
          fetch(`${API_URL}/api/categories/sub`)
        ]);

        // Helper to safely parse JSON and log errors if HTML is returned
        const safeJson = async (response, name) => {
          if (!response.ok) {
            console.error(`${name} API Error: ${response.status}`);
            return [];
          }
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error(`${name} Parse Error. Received:`, text.substring(0, 100));
            return [];
          }
        };

        const productsData = await safeJson(productsRes, 'Products');
        const categoriesData = await safeJson(categoriesRes, 'Categories');
        const subcategoriesData = await safeJson(subcategoriesRes, 'Subcategories');

        if (Array.isArray(productsData)) {
          setTrendingProducts(productsData.slice(0, 10));
        }
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData);
        }
        if (Array.isArray(subcategoriesData)) {
          setSubcategories(subcategoriesData);
        }
      } catch (err) {
        console.error("Error fetching home screen data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Fetch Role-Based Data (Admin or Sales Rep)
  useEffect(() => {
    const fetchRoleData = async () => {
      if (!user) return;
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      setRoleLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        if (user.role === 'admin') {
          // Fetch all customers and sales reps for Admin
          const [custRes, repRes] = await Promise.all([
            fetch(`${API_URL}/api/users?role=customer`, { headers }),
            fetch(`${API_URL}/api/users?role=sales_rep`, { headers })
          ]);
          
          const custData = await custRes.json();
          const repData = await repRes.json();
          
          console.log('Admin Data Fetch:', { custData, repData });

          // Helper to extract array from various API response formats
          const extractArray = (data) => {
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.data)) return data.data;
            if (data && Array.isArray(data.users)) return data.users;
            return [];
          };

          setAdminCustomers(extractArray(custData));
          setSalesReps(extractArray(repData));

        } else if (user.role === 'sales_rep') {
          // Fetch assigned customers for Sales Rep
          const res = await fetch(`${API_URL}/api/sales/my-customers`, { headers });
          const data = await res.json();
          
          if (Array.isArray(data)) {
            setMyCustomers(data);
          }
        }
      } catch (error) {
        console.error("Error fetching role data:", error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRoleData();
  }, [user]);

  const handleAssignRep = async (repId) => {
    if (!selectedCustomer) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/assign-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          sales_rep_id: repId
        })
      });

      if (response.ok) {
        // Update local state to reflect change
        setAdminCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, sales_rep_id: repId, sales_rep_name: salesReps.find(r => r.id === repId)?.name } : c));
        setAssignModalVisible(false);
        setSelectedCustomer(null);
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', 'Failed to assign representative.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred.');
    }
  };

  const handleStartOrderForCustomer = async (customer) => {
    await AsyncStorage.setItem('actingAsClient', JSON.stringify(customer));
    setCustomerDetailVisible(false);
    navigation.navigate('ProductList');
  };

  const fetchCustomerOrders = async (customerId) => {
    setOrdersLoading(true);
    setCustomerOrders([]);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/orders?user_id=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCustomerOrders(data);
      }
    } catch (e) {
      console.error("Error fetching customer orders:", e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleImageError = (sku) => {
    console.log('Missing Image SKU:', sku);
    setImageErrors(prev => ({ ...prev, [sku]: true }));
  };

  const handleCategoryImageError = (id) => {
    setCategoryImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const getCategoryImageUrl = (item) => {
    if (!item) return '';
    // Best Solution: Use the Category ID. This matches the renamed files in S3 (e.g., "12.webp").
    // This eliminates issues with special characters, spaces, and case sensitivity.
    return `https://thames-product-images.s3.us-east-1.amazonaws.com/category_images/${item.id}.webp`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconButton}>
          <Icon name="menu-outline" size={26} color="#1d3557" />
        </TouchableOpacity>
        
        <View style={styles.headerSearchContainer}>
          <Icon name="search-outline" size={18} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            placeholderTextColor="#6c757d"
          />
          <TouchableOpacity onPress={() => navigation.navigate('ProductList', { openScanner: true })} style={{ paddingHorizontal: 5 }}>
            <Icon name="scan-outline" size={20} color="#495057" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ProductList', { openFilters: true, initialSearch: searchText })} style={{ paddingRight: 8, paddingLeft: 5 }}>
            <Icon name="options-outline" size={20} color="#495057" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.iconButton}>
          <Icon name="cart-outline" size={26} color="#1d3557" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Hello, {user?.name?.split(' ')[0] || user?.username || 'Guest'} 👋</Text>
            <Text style={styles.heroSubtitle}>Find the best products for your business today.</Text>
          </View>
          <Icon name="cube-outline" size={60} color="rgba(255,255,255,0.2)" style={styles.heroIcon} />
        </View>

        {/* Admin Section: Manage Customers */}
        {user?.role === 'admin' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.trendingSectionTitle}>Manage Allocation</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ManageAllocation')}>
                <Text style={styles.viewAllButton}>View All</Text>
              </TouchableOpacity>
            </View>
            {roleLoading ? <ActivityIndicator color="#1d3557" /> : (
              <FlatList
                data={adminCustomers}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.adminCard}
                    onPress={() => { 
                      setSelectedCustomer(item); 
                      setCustomerDetailVisible(true);
                      fetchCustomerOrders(item.id);
                    }}
                  >
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>{item.name?.charAt(0) || item.username?.charAt(0) || 'C'}</Text>
                    </View>
                    <Text style={styles.adminCardTitle} numberOfLines={1}>{item.name || item.username || 'Customer'}</Text>
                    <Text style={styles.adminCardSubtitle}>
                      {item.sales_rep_name ? `Rep: ${item.sales_rep_name}` : 'Unassigned'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.assignButton}
                      onPress={() => { setSelectedCustomer(item); setAssignModalVisible(true); }}
                    >
                      <Text style={styles.assignButtonText}>Assign</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{marginLeft: 16, color: '#6c757d'}}>No customers found.</Text>}
              />
            )}
          </View>
        )}

        {/* Sales Rep Section: My Customers */}
        {user?.role === 'sales_rep' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.trendingSectionTitle}>My Assigned Customers</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyCustomers')}>
                <Text style={styles.viewAllButton}>View All</Text>
              </TouchableOpacity>
            </View>
            {roleLoading ? <ActivityIndicator color="#1d3557" /> : (
              <FlatList
                data={myCustomers}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.adminCard}
                    onPress={() => { 
                      setSelectedCustomer(item); 
                      setCustomerDetailVisible(true);
                      fetchCustomerOrders(item.id);
                    }}
                  >
                    <View style={[styles.avatarContainer, { backgroundColor: '#e0f4f1' }]}>
                      <Icon name="briefcase-outline" size={24} color="#2a9d8f" />
                    </View>
                    <Text style={styles.adminCardTitle} numberOfLines={1}>{item.name || item.username || 'Customer'}</Text>
                    <Text style={styles.adminCardSubtitle}>{item.email}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Assigned</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{marginLeft: 16, color: '#6c757d'}}>No customers assigned yet.</Text>}
              />
            )}
          </View>
        )}

        {/* Trending Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.trendingSectionTitle}>Trending Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#1d3557" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={trendingProducts}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.productCard} activeOpacity={0.9} onPress={() => navigation.navigate('ProductList', { expandedProductId: item.id })}>
                  {imageErrors[item.item] ? (
                    <View style={styles.productImagePlaceholder}>
                      <Icon name="image-outline" size={40} color="#ced4da" />
                    </View>
                  ) : (
                    <Image source={{ uri: `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${item.item}.webp` }} style={styles.productImage} onError={() => handleImageError(item.item)} />
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.description}</Text>
                    <Text style={styles.productSize} numberOfLines={1}>{item.pack_description}</Text>
                    <View style={styles.cardFooter}>
                      {item.pricing && item.pricing.length > 0 && (
                        <Text style={styles.productPrice}>{parseFloat(item.pricing[0].sell_price).toFixed(2)}</Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.addButton} onPress={() => alert(`Added ${item.description}`)}>
                    <Icon name="add" size={20} color="white" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          )}
        </View>

        <View style={styles.content}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('ProductList')}>
            <Text style={styles.primaryButtonText}>Browse All Products</Text>
            <Icon name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Shop by Category Section */}
        <View style={styles.section}>
          <Text style={styles.mainSectionTitle}>Shop by Categories</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#1d3557" style={{ marginTop: 20 }} />
          ) : (
            categories.map(category => (
              <View key={category.id} style={styles.categorySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{category.name}</Text>
                </View>
                <FlatList
                  data={subcategories.filter(sc => sc.category_id === category.id)}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.categoryCard} 
                      onPress={() => {
                        navigation.navigate('ProductList', { 
                          activeFilters: { categories: [item.category_id], subcategories: [item.id], brands: [], pmp: false, promotion: false } 
                        });
                      }}
                    >
                      {categoryImageErrors[item.id] ? (
                        <View style={styles.categoryIconPlaceholder}>
                           <Icon name="grid-outline" size={24} color="#a0aec0" />
                        </View>
                      ) : (
                        <Image 
                          source={{ uri: getCategoryImageUrl(item) }}
                          style={styles.categoryImage}
                          onError={() => handleCategoryImageError(item.id)}
                        />
                      )}
                      <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                />
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Admin Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Sales Rep</Text>
            <Text style={styles.modalSubtitle}>For customer: {selectedCustomer?.name || selectedCustomer?.username}</Text>
            
            <FlatList
              data={salesReps}
              keyExtractor={item => item.id.toString()}
              style={{ maxHeight: 300, width: '100%' }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.repOption} onPress={() => handleAssignRep(item.id)}>
                  <Text style={styles.repName}>{item.name || item.username}</Text>
                  <Icon name="chevron-forward" size={20} color="#6c757d" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{padding: 20, textAlign: 'center', color: '#6c757d'}}>No sales representatives available.</Text>}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setAssignModalVisible(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Sidebar Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuModalOverlay}>
          <View style={styles.menuModalContent}>
            <CustomDrawerContent 
              navigation={navigation} 
              onClose={() => setMenuVisible(false)}
            />
          </View>
          <TouchableOpacity style={styles.menuModalCloseArea} onPress={() => setMenuVisible(false)} />
        </View>
      </Modal>

      {/* Customer Detail Modal (Sales Rep) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={customerDetailVisible}
        onRequestClose={() => setCustomerDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                <Text style={styles.modalTitle}>Customer Details</Text>
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedCustomer?.name || selectedCustomer?.username}</Text>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedCustomer?.email}</Text>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{selectedCustomer?.address || 'N/A'}</Text>
                </View>

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1d3557', alignSelf: 'flex-start', marginBottom: 10 }}>Order History</Text>
                {ordersLoading ? (
                  <ActivityIndicator color="#1d3557" style={{ marginBottom: 20 }} />
                ) : (
                  <FlatList
                    data={customerOrders}
                    keyExtractor={item => item.id.toString()}
                    style={{ width: '100%', marginBottom: 20 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.orderHistoryItem}
                        onPress={() => { 
                          setCustomerDetailVisible(false);
                          navigation.navigate('OrderDetail', { orderId: item.id });
                        }}
                      >
                        <View>
                          <Text style={styles.orderHistoryId}>Order #{item.id}</Text>
                          <Text style={styles.orderHistoryDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.orderHistoryAmount}>£{parseFloat(item.total_amount).toFixed(2)}</Text>
                          <Text style={styles.orderHistoryStatus}>{item.status}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={{ color: '#6c757d', fontStyle: 'italic' }}>No orders found for this customer.</Text>}
                  />
                )}
                
                <TouchableOpacity style={[styles.primaryButton, { width: '100%', marginBottom: 10 }]} onPress={() => handleStartOrderForCustomer(selectedCustomer)}>
                  <Text style={styles.primaryButtonText}>Place Order for Customer</Text>
                </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setCustomerDetailVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Icon name="checkmark-outline" size={50} color="white" />
            </View>
            <Text style={styles.successTitle}>Assignment Complete!</Text>
            <Text style={styles.successMessage}>Sales representative has been successfully assigned.</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
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
  iconButton: {
    padding: 4,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
    borderRadius: 12,
    height: 44,
    marginHorizontal: 12,
    paddingHorizontal: 4,
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
  heroContainer: {
    backgroundColor: '#1d3557',
    borderRadius: 20,
    margin: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  heroContent: {
    flex: 1,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  heroIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    transform: [{ rotate: '-15deg' }],
  },
  section: {
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  mainSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    marginLeft: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  trendingSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a9d8f',
  },
  categoryCard: {
    width: 100,
    marginRight: 16,
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center',
  },
  categoryImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  categoryIconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 160,
    marginRight: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
    resizeMode: 'contain',
  },
  productInfo: {
    paddingHorizontal: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
    height: 40,
    marginBottom: 4,
  },
  productSize: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2a9d8f',
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#2a9d8f',
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2a9d8f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#1d3557',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1d3557',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#1d3557',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  // Admin/Rep Styles
  adminCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 160,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1d3557',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  adminCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 4,
  },
  adminCardSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 12,
    textAlign: 'center',
  },
  assignButton: {
    backgroundColor: '#F7FAFC',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assignButtonText: {
    color: '#1d3557',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#E6FFFA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    color: '#2a9d8f',
    fontSize: 10,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  menuModalContent: { width: '80%', backgroundColor: 'white', height: '100%' },
  menuModalCloseArea: { flex: 1 },
  
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#6c757d', marginBottom: 20 },
  repOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  repName: { fontSize: 16, color: '#212529' },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
  orderHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    width: '100%',
  },
  orderHistoryId: { fontWeight: 'bold', color: '#1d3557' },
  orderHistoryDate: { fontSize: 12, color: '#6c757d' },
  orderHistoryAmount: { fontWeight: 'bold', color: '#2a9d8f' },
  orderHistoryStatus: { fontSize: 12, color: '#6c757d', textTransform: 'capitalize' },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 10,
  },
  detailValue: {
    fontSize: 16,
    color: '#1d3557',
    marginBottom: 5,
    fontWeight: '500',
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  orderDetailImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#f8f9fa' },
  orderDetailName: { fontSize: 14, fontWeight: 'bold', color: '#212529' },
  orderDetailMeta: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  
  // Success Modal Styles
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
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1d3557', marginBottom: 12, textAlign: 'center' },
  successMessage: { fontSize: 15, color: '#6c757d', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
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
  successButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
