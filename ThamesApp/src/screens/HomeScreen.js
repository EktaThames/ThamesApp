// Inside HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config/api';

export default function HomeScreen({ navigation }) {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products and take the first 10 as "trending"
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setTrendingProducts(data.slice(0, 10));
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching trending products:", err);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.sliderContainer}>
          <View style={styles.bannerPlaceholder}>
            <Text style={styles.bannerPlaceholderText}>Banner Placeholder</Text>
          </View>
        </View>

        {/* Trending Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Products</Text>
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
                  <View style={styles.productImagePlaceholder}>
                    <Icon name="image-outline" size={40} color="#ced4da" />
                  </View>
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
        </View>

        <View style={styles.content}>
          <Button
            title="Go to All Products"
            onPress={() => navigation.navigate('ProductList')}
          />
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1d3557',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sliderContainer: {
    height: 200,
  },
  bannerPlaceholder: {
    flex: 1,
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
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1d3557',
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a9d8f',
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
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
  }
});
