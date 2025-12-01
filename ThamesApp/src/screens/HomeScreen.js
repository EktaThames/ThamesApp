// Inside HomeScreen.js
import React from 'react';
import { View, Button, StyleSheet, FlatList, Image, Dimensions, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dummy data for the banner slider. In a real app, this would come from an API.
const bannerData = [
  { id: '1', image: 'https://via.placeholder.com/400x200/2a9d8f/ffffff?text=Special+Offers' },
  { id: '2', image: 'https://via.placeholder.com/400x200/e9c46a/ffffff?text=New+Arrivals' },
  { id: '3', image: 'https://via.placeholder.com/400x200/f4a261/ffffff?text=Shop+Drinks' },
];

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.sliderContainer}>
        {/* Banner Slider */}
        <FlatList
          data={bannerData}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            </View>
          )}
        />
      </View>

      <View style={styles.content}>
        {/* You can add other sections like "Trending Products" here later */}
        <Button
          title="Go to Products"
          onPress={() => navigation.navigate('ProductList')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  safeArea: {
    flex: 1,
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
  slide: {
    width: width,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 16,
  }
});
