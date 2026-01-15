import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform, PermissionsAndroid, Text, AppState, Dimensions } from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { Ionicons as Icon } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

export default function BarcodeScannerScreen({ onBarcodeScanned, onClose }) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const check = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (check) {
            setPermissionGranted(true);
          }

          if (!check) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CAMERA,
              {
                title: 'Camera Permission',
                message: 'App needs access to your camera to scan barcodes.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              },
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              setPermissionGranted(true);
            } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
              Alert.alert('Permission Required', 'Camera permission was denied permanently. Please enable it in App Settings.', [{ text: 'OK', onPress: onClose }]);
            } else {
              Alert.alert('Permission Denied', 'Camera permission is required.');
              onClose();
            }
          }
        } catch (err) {
          console.warn(err);
          onClose();
        }
      } else {
        setPermissionGranted(true);
      }
    };

    requestCameraPermission();

    // Handle AppState changes to ensure camera behaves correctly when returning from background
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Re-trigger initialization check if needed
        if (permissionGranted) {
           setIsCameraInitialized(false);
           setTimeout(() => setIsCameraInitialized(true), 500);
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (permissionGranted) {
      const timer = setTimeout(() => {
        setIsCameraInitialized(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [permissionGranted]);

  if (!permissionGranted || !isCameraInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Initializing Camera...</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        scanBarcode={true}
        onReadCode={(event) => {
          const code = event.nativeEvent.codeStringValue;
          console.log("Barcode Scanned:", code);
          if (code) {
            onBarcodeScanned(code);
          }
        }}
        showFrame={true}
        laserColor="red"
        frameColor="white"
        style={styles.camera}
        cameraType={CameraType ? CameraType.Back : 'back'}
        torchMode="off"
        focusMode="on"
      />
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Icon name="close" size={30} color="white" />
      </TouchableOpacity>
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Align barcode within frame</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  loadingText: { color: 'white', textAlign: 'center', marginTop: height / 2 - 20 },
  closeButton: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 50 : 30, 
    right: 20, 
    padding: 10, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: 20,
    zIndex: 100,
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
});