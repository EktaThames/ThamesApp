import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductDetails from './src/screens/ProductDetails'; 
import CartScreen from './src/screens/CartScreen';
import OrderListScreen from './src/screens/OrderListScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import MyProfileScreen from './src/screens/MyProfileScreen';
import ManageAllocationScreen from './src/screens/ManageAllocationScreen';
import MyCustomersScreen from './src/screens/MyCustomersScreen';

SplashScreen.preventAutoHideAsync();

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ProductList: { initialSearch?: string; openFilters?: boolean; activeFilters?: any; openScanner?: boolean; expandedProductId?: string | number };
  ProductDetails: { product: any };
  Cart: undefined;
  OrderList: undefined;
  OrderDetail: { orderId: number };
  MyProfile: undefined;
  ManageAllocation: undefined;
  MyCustomers: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded, error] = useFonts({
    ...Ionicons.font,
  });

  React.useEffect(() => {
    if (error) throw error;
  }, [error]);

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: true }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: "Products" }} />
          <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ title: "Product Details" }} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="OrderList" component={OrderListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ManageAllocation" component={ManageAllocationScreen} options={{ title: 'Manage Allocation' }} />
          <Stack.Screen name="MyCustomers" component={MyCustomersScreen} options={{ title: 'My Customers' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
