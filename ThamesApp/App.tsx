import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductDetails from './src/screens/ProductDetails'; 
import CartScreen from './src/screens/CartScreen';
import OrderListScreen from './src/screens/OrderListScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import MyProfileScreen from './src/screens/MyProfileScreen';

// Define types for better code quality (Optional but recommended standard)
export type RootStackParamList = {
  Home: undefined;
  ProductList: { initialSearch?: string; openFilters?: boolean; activeFilters?: any; openScanner?: boolean; expandedProductId?: number };
  ProductDetails: { product: any };
  Cart: undefined;
  OrderList: undefined;
  OrderDetail: { orderId: number };
  MyProfile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: true }}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ProductList" 
          component={ProductListScreen} 
          options={{ title: "Products" }}
        />
        <Stack.Screen 
          name="ProductDetails" 
          component={ProductDetails} 
          options={{ title: "Product Details" }}
        />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="OrderList" component={OrderListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
