import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  const authContext = useMemo(() => ({
    signIn: async (token, user) => {
      setUserToken(token);
      setUserData(user);
      try {
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
      } catch (e) {
        console.error('Auth Context: Error saving user data', e);
      }
    },
    signOut: async () => {
      setUserToken(null);
      setUserData(null);
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
      } catch (e) {
        console.error('Auth Context: Error removing user data', e);
      }
    },
    user: userData,
    userToken,
    isLoading,
  }), [userData, userToken, isLoading]);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      let user;
      try {
        token = await AsyncStorage.getItem('userToken');
        const userStr = await AsyncStorage.getItem('userData');
        if (userStr) {
            user = JSON.parse(userStr);
        }
      } catch (e) {
        // Restoring token failed
      }
      
      if (token && user) {
          setUserToken(token);
          setUserData(user);
      }
      
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);