import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CustomDrawerContent({ navigation, onClose }) {
  
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    if (onClose) onClose();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const MenuItem = ({ label, icon, onPress, color = '#1d3557' }) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => {
      if (onClose) { onClose(); }
      if (onPress) { onPress(); }
    }}>
      <Icon name={icon} size={24} color={color} style={styles.icon} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ThamesCC</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <MenuItem
            label="My Orders"
            icon="receipt-outline"
            onPress={() => navigation.navigate('OrderList')}
          />
          <MenuItem
            label="My Profile"
            icon="person-outline"
            onPress={() => navigation.navigate('MyProfile')}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
             <MenuItem
            label="All Products"
            icon="grid-outline"
            onPress={() => navigation.navigate('ProductList')}
          />
          <MenuItem
            label="Categories"
            icon="list-outline"
            onPress={() => navigation.navigate('ProductList', { openFilters: true })}
          />
          <MenuItem
            label="Brands"
            icon="pricetag-outline"
            onPress={() => navigation.navigate('ProductList', { openFilters: true })}
          />
          <MenuItem
            label="Clearance"
            icon="pricetags-outline"
            onPress={() => navigation.navigate('ProductList', { 
              activeFilters: { categories: [], subcategories: [], brands: [], pmp: false, promotion: false, clearance: true } 
            })}
          />
         
        </View>

        <View style={[styles.section, { marginTop: 40 }]}>
          <MenuItem
            label="Logout"
            icon="log-out-outline"
            color="#e63946"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: 20, backgroundColor: '#1d3557', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  content: { flex: 1, paddingVertical: 10 },
  section: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#e9ecef', marginVertical: 10, marginHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
  icon: { marginRight: 20 },
  label: { fontSize: 16, fontWeight: '500' },
  closeButton: { padding: 5 },
});