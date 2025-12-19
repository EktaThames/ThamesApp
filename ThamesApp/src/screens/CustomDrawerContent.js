import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

export default function CustomDrawerContent(props) {
  const { signOut } = useAuth();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ThamesCC</Text>
      </View>
      
      <View style={styles.section}>
        <DrawerItem
          label="My Orders"
          icon={({ color, size }) => <Icon name="receipt-outline" color={color} size={size} />}
          onPress={() => props.navigation.navigate('OrderList')}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <DrawerItem
          label="Brands Filter"
          icon={({ color, size }) => <Icon name="pricetag-outline" color={color} size={size} />}
          onPress={() => props.navigation.navigate('ProductList', { openFilters: true })}
        />
        <DrawerItem
          label="Clearance"
          icon={({ color, size }) => <Icon name="pricetags-outline" color={color} size={size} />}
          onPress={() => props.navigation.navigate('ProductList', { 
            activeFilters: { categories: [], subcategories: [], brands: [], pmp: false, promotion: false, clearance: true } 
          })}
        />
        <DrawerItem
          label="All Products"
          icon={({ color, size }) => <Icon name="grid-outline" color={color} size={size} />}
          onPress={() => props.navigation.navigate('ProductList')}
        />
      </View>

      <View style={[styles.section, { marginTop: 'auto', marginBottom: 20 }]}>
        <DrawerItem
          label="Logout"
          icon={({ color, size }) => <Icon name="log-out-outline" color="#e63946" size={size} />}
          onPress={() => signOut()}
        />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#1d3557', marginBottom: 10 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  section: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#e9ecef', marginVertical: 10, marginHorizontal: 20 },
});