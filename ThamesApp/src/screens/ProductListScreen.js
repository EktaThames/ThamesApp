import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { API_URL } from '../config/api';

export default function ProductListScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <Text>Loading products...</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.description}</Text>
            <Text>SKU: {item.item}</Text>
      <Text>Type: {item.type}</Text>
      <Text>Stock: {item.qty_in_stock} / Cases: {item.cases_in_stock}</Text>
            {item.pricing && item.pricing.length > 0 && (
              <Text style={styles.price}>Price: £{item.pricing[0].sell_price}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  item: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  name: { fontWeight: 'bold' },
  price: { marginTop: 5 },
});
