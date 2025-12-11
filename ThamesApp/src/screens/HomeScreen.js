// Inside HomeScreen.js
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Button, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config/api';

export default function HomeScreen({ navigation }) {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});

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
  }, []);

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
        <Text style={styles.headerTitle}>ThamesCC</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart', { cart: {}, onCartUpdate: () => {} })}>
          <Icon name="cart-outline" size={28} color="#1d3557" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.bannerPlaceholder}>
          <Text style={styles.bannerPlaceholderText}>Banner Placeholder</Text>
        </View>

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
                    <Image source={{ uri: item.image_url }} style={styles.productImage} onError={() => handleImageError(item.item)} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
});
