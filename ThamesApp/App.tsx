import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductDetails from './src/screens/ProductDetails'; 
import CartScreen from './src/screens/CartScreen'; // <-- Import the new CartScreen


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: "Home" }}
        />

        <Stack.Screen 
          name="ProductList" 
          component={ProductListScreen} 
          options={{ title: "Products" }}
        />

        {/* ✅ NEW ROUTE FOR DETAILS */}
        <Stack.Screen 
          name="ProductDetails" 
          component={ProductDetails} 
          options={{ title: "Product Details" }}
        />
                <Stack.Screen name="Cart" component={CartScreen} />


      </Stack.Navigator>
    </NavigationContainer>
  );
}
