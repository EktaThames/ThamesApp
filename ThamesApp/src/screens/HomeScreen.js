// Inside HomeScreen.js
import React from 'react';
import { View, Button } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View>
      <Button
        title="Go to Products"
        onPress={() => navigation.navigate('ProductList')}
      />
    </View>
  );
}
