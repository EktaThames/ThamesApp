import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CustomDrawerContent({ navigation, onClose }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    };
    loadUser();
  }, []);
  
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userId');
    if (onClose) onClose();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const MenuItem = ({ label, icon, onPress, color = '#2D3748', danger = false }) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => {
      if (onClose) { onClose(); }
      if (onPress) { onPress(); }
    }}>
      <View style={[styles.iconContainer, danger && styles.dangerIconContainer]}>
        <Icon name={icon} size={22} color={danger ? '#e63946' : '#1d3557'} />
      </View>
      <Text style={[styles.label, danger && styles.dangerLabel]}>{label}</Text>
      <Icon name="chevron-forward" size={16} color="#CBD5E0" style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>{user?.name || user?.username || 'Guest'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
        </View>
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
        <Text style={styles.sectionTitle}>Shop</Text>

        <View style={styles.section}>
             <MenuItem
            label="All Products"
            icon="cube-outline"
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
            label="Promotions"
            icon="flame-outline"
            onPress={() => navigation.navigate('ProductList', { 
              activeFilters: { categories: [], subcategories: [], brands: [], pmp: false, promotion: true, clearance: false } 
            })}
          />
          <MenuItem
            label="Clearance"
            icon="pricetags-outline"
            onPress={() => navigation.navigate('ProductList', { 
              activeFilters: { categories: [], subcategories: [], brands: [], pmp: false, promotion: false, clearance: true } 
            })}
          />
         
        </View>

        {user?.role === 'admin' && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Admin</Text>
            <View style={styles.section}>
              <MenuItem
                label="Manage Allocation"
                icon="people-outline"
                onPress={() => navigation.navigate('ManageAllocation')}
              />
              <MenuItem
                label="Upload Products"
                icon="cloud-upload-outline"
                onPress={() => navigation.navigate('AdminUpload')}
              />
              <MenuItem
                label="Pending Approvals"
                icon="person-add-outline"
                onPress={() => navigation.navigate('AdminUserApproval')}
              />
            </View>
          </>
        )}

        {user?.role === 'sales_rep' && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Sales</Text>
            <View style={styles.section}>
              <MenuItem
                label="My Customers"
                icon="people-outline"
                onPress={() => navigation.navigate('MyCustomers')}
              />
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.section}>
          <MenuItem
            label="Logout"
            icon="log-out-outline"
            danger={true}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Thames Cash & Carry</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: { 
    padding: 24, 
    backgroundColor: '#1d3557', 
    borderBottomRightRadius: 30,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#1d3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  closeButton: { 
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  userInfo: {
    marginTop: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1d3557',
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  content: { flex: 1, paddingHorizontal: 16 },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 12,
    marginTop: 8,
  },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16, marginHorizontal: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E6FFFA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dangerIconContainer: { backgroundColor: '#FED7D7' },
  label: { fontSize: 16, fontWeight: '600', color: '#2D3748', flex: 1 },
  dangerLabel: { color: '#e63946' },
  chevron: { opacity: 0.5 },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { color: '#A0AEC0', fontSize: 12 },
});