// Inside HomeScreen.js
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Button, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import CustomDrawerContent from './CustomDrawerContent';

export default function HomeScreen({ navigation, route }) {
  const { user } = useAuth();
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
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

  const handleSearchSubmit = () => {
    navigation.navigate('ProductList', { initialSearch: searchText });
    setSearchText('');
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, subcategoriesRes] = await Promise.all([
          fetch(`${API_URL}/api/products`),
          fetch(`${API_URL}/api/categories`),
          fetch(`${API_URL}/api/categories/sub`)
        ]);

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        const subcategoriesData = await subcategoriesRes.json();

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
        Alert.alert('Success', 'Sales representative assigned successfully.');
        // Update local state to reflect change
        setAdminCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, sales_rep_id: repId, sales_rep_name: salesReps.find(r => r.id === repId)?.name } : c));
        setAssignModalVisible(false);
        setSelectedCustomer(null);
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

  // Helper function to get a relevant icon for each subcategory
  const getIconForSubcategory = (name) => {
    // Return a single, consistent icon for all subcategories
    return 'pricetag-outline';
  };

  const handleImageError = (sku) => {
    setImageErrors(prev => ({ ...prev, [sku]: true }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconButton}>
          <Icon name="menu-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
        
        <View style={styles.headerSearchContainer}>
          <Icon name="search-outline" size={20} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            placeholderTextColor="#6c757d"
          />
          <TouchableOpacity onPress={() => navigation.navigate('ProductList', { openScanner: true })} style={{ paddingHorizontal: 5 }}>
            <Icon name="camera-outline" size={22} color="#495057" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ProductList', { openFilters: true, initialSearch: searchText })} style={{ paddingRight: 8, paddingLeft: 5 }}>
            <Icon name="options-outline" size={22} color="#495057" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.iconButton}>
          <Icon name="cart-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.bannerPlaceholder}>
          <Text style={styles.bannerPlaceholderText}>Banner Placeholder</Text>
        </View>

        {/* Admin Section: Manage Customers */}
        {user?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.mainSectionTitle}>Manage Customer Allocation</Text>
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
                    <Icon name="person-circle-outline" size={40} color="#1d3557" />
                    <Text style={styles.adminCardTitle} numberOfLines={1}>{item.name || item.username || 'Customer'}</Text>
                    <Text style={styles.adminCardSubtitle}>
                      {item.sales_rep_name ? `Rep: ${item.sales_rep_name}` : 'Unassigned'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.assignButton}
                      onPress={() => { setSelectedCustomer(item); setAssignModalVisible(true); }}
                    >
                      <Text style={styles.assignButtonText}>Assign Rep</Text>
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
            <Text style={styles.mainSectionTitle}>My Assigned Customers</Text>
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
                    <Icon name="briefcase" size={40} color="#2a9d8f" />
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
                <TouchableOpacity style={styles.productCard} onPress={() => navigation.navigate('ProductList', { expandedProductId: item.id })}>
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
                        <Text style={styles.productPrice}>£{parseFloat(item.pricing[0].sell_price).toFixed(2)}</Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.addButton} onPress={() => alert(`Added ${item.description}`)}>
                    <Icon name="add" size={22} color="white" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          )}
          <View style={styles.content}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('ProductList')}>
              <Text style={styles.primaryButtonText}>View All Products</Text>
              <Icon name="arrow-forward" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('OrderList')}>
              <Text style={styles.secondaryButtonText}>My Orders</Text>
              <Icon name="receipt-outline" size={16} color="#1d3557" />
            </TouchableOpacity>
          </View>
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
                      <Icon name={getIconForSubcategory(item.name)} size={32} color="#1d3557" />
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
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1d3557' }}>Name:</Text>
                  <Text style={{ fontSize: 16, color: '#495057', marginBottom: 10 }}>{selectedCustomer?.name || selectedCustomer?.username}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1d3557' }}>Email:</Text>
                  <Text style={{ fontSize: 16, color: '#495057', marginBottom: 10 }}>{selectedCustomer?.email}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1d3557' }}>Address:</Text>
                  <Text style={{ fontSize: 16, color: '#495057', marginBottom: 10 }}>{selectedCustomer?.address || 'N/A'}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  iconButton: {
    padding: 5,
    marginHorizontal: 2,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginHorizontal: 8,
    backgroundColor: '#f8f9fa',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1d3557',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  bannerPlaceholder: {
    height: 180,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: '500',
  },
  section: {
    paddingTop: 30, // Use paddingTop for the first section
  },
  categorySection: {
    marginBottom: 20, // Space between each category and its slider
  },
  mainSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1d3557',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  trendingSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1d3557',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'normal',
    color: '#1d3557',
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a9d8f',
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: 110,
    height: 110,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1d3557',
    textAlign: 'center',
    marginTop: 8,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: 170,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f8f9fa', // A fallback color
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    height: 36, // Reserve space for 2 lines
  },
  productSize: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 10,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
  addButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#2a9d8f',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4, // Add shadow for Android
  },
  content: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#1d3557',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 12,
    width: 160,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adminCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1d3557',
    marginTop: 8,
    textAlign: 'center',
  },
  adminCardSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
    textAlign: 'center',
  },
  assignButton: {
    backgroundColor: '#1d3557',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#e0f4f1',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    color: '#2a9d8f',
    fontSize: 10,
    fontWeight: 'bold',
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
});
