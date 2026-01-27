import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { API_URL } from '../config/api';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    entity: '',
    
    // Trading Address
    tradingStreet: '',
    tradingLine2: '',
    tradingCity: '',
    tradingZip: '',
    tradingCountry: '',
    
    phone: '',
    email: '',
    password: '',
    
    // Owner
    ownerFirstName: '',
    ownerLastName: '',
    
    // Owner Address
    ownerStreet: '',
    ownerLine2: '',
    ownerCity: '',
    ownerZip: '',
    ownerCountry: '',
    
    ownerEmail: '',
    ownerPhone: '',
    
    vatNumber: '',
    isNotVatRegistered: false,
    
    eoid: '',
    fid: '',
    companyRegNumber: '',
    
    // Company Reg Address
    regStreet: '',
    regLine2: '',
    regCity: '',
    regZip: '',
    regCountry: '',
    
    referredBy: '',
    
    // Checkboxes
    hasIdProof: false,
    termsAccepted: false,
    privacyAccepted: false,
    marketingAccepted: false
  });

  const [loading, setLoading] = useState(false);
  const [sectionToggles, setSectionToggles] = useState({
    ownerAddress: false,
    regAddress: false
  });
  
  // Modal State for Dropdowns
  const [modalVisible, setModalVisible] = useState(false);
  const [modalField, setModalField] = useState(null); // 'businessType' or 'entity'

  const businessTypes = ['Off licence', 'Supermarket', 'Restaurant or Pub', 'Grocers', 'Other'];
  const entities = ['Limited Company', 'Sole Proprietorship', 'Partnership'];

  // Dynamic Form Schema
  const formSchema = [
    { type: 'header', label: 'Business Details' },
    { key: 'businessName', label: 'Business Trading Name', type: 'text', placeholder: 'Enter trading name' },
    { key: 'businessType', label: 'Type of Business', type: 'select', options: businessTypes, required: true },
    { key: 'entity', label: 'Entity', type: 'select', options: entities, required: true },
    
    { type: 'header', label: 'Trading Address' },
    { key: 'tradingStreet', label: 'Street Address', type: 'text', placeholder: '123 Main St' },
    { key: 'tradingLine2', label: 'Address Line 2', type: 'text', placeholder: 'Suite, Unit, etc.' },
    { key: 'tradingCity', label: 'City', type: 'text', placeholder: 'London', required: true },
    { key: 'tradingZip', label: 'ZIP / Postal Code', type: 'text', placeholder: 'SW1A 1AA', required: true },
    { key: 'tradingCountry', label: 'Country', type: 'text', placeholder: 'United Kingdom', required: true },

    { type: 'header', label: 'Contact Information' },
    { key: 'phone', label: 'Phone', type: 'text', placeholder: '020 1234 5678', required: true, keyboardType: 'phone-pad' },
    { key: 'email', label: 'Email', type: 'text', placeholder: 'business@example.com', required: true, keyboardType: 'email-address' },
    { key: 'password', label: 'Password', type: 'text', placeholder: '******', required: true, secure: true },

    { type: 'header', label: 'Owner Name' },
    { key: 'ownerFirstName', label: 'First Name', type: 'text', placeholder: 'John', required: true },
    { key: 'ownerLastName', label: 'Last Name', type: 'text', placeholder: 'Doe', required: true },

    { type: 'header', label: "Owner / Director's Address" },
    { type: 'toggle', label: 'Enter Address (If different from Trading Address)', toggleKey: 'ownerAddress' },
    { key: 'ownerStreet', label: 'Street Address', type: 'text', placeholder: 'Street Address', visibleIf: 'ownerAddress' },
    { key: 'ownerLine2', label: 'Apartment, suite, etc', type: 'text', placeholder: 'Apt 1', visibleIf: 'ownerAddress' },
    { key: 'ownerCity', label: 'City', type: 'text', placeholder: 'City', visibleIf: 'ownerAddress' },
    { key: 'ownerZip', label: 'ZIP / Postal Code', type: 'text', placeholder: 'Postcode', visibleIf: 'ownerAddress' },
    { key: 'ownerCountry', label: 'Country', type: 'text', placeholder: 'Country', visibleIf: 'ownerAddress' },

    { key: 'ownerEmail', label: 'Owner Email Address', type: 'text', placeholder: 'owner@example.com', required: true, keyboardType: 'email-address' },
    { key: 'ownerPhone', label: "Owner / Director's Contact Number", type: 'text', placeholder: '07700 900000', required: true, keyboardType: 'phone-pad' },

    { type: 'header', label: 'Tax & Registration' },
    { key: 'vatNumber', label: 'VAT Registration Number', type: 'text', placeholder: 'GB123456789', required: (data) => !data.isNotVatRegistered },
    { key: 'isNotVatRegistered', label: "I'm not VAT registered", type: 'checkbox' },
    
    { key: 'eoid', label: 'EOID', type: 'text', placeholder: 'Economic Operator ID' },
    { key: 'fid', label: 'FID', type: 'text', placeholder: 'Facility ID' },
    { key: 'companyRegNumber', label: 'Company Registration Number', type: 'text', placeholder: '12345678' },

    { type: 'header', label: 'Company Registered Address' },
    { type: 'toggle', label: 'Enter Address (If different from Trading Address)', toggleKey: 'regAddress' },
    { key: 'regStreet', label: 'Street Address', type: 'text', placeholder: 'Street Address', visibleIf: 'regAddress' },
    { key: 'regLine2', label: 'Apartment, suite, etc', type: 'text', placeholder: 'Apt 1', visibleIf: 'regAddress' },
    { key: 'regCity', label: 'City', type: 'text', placeholder: 'City', visibleIf: 'regAddress' },
    { key: 'regZip', label: 'ZIP / Postal Code', type: 'text', placeholder: 'Postcode', visibleIf: 'regAddress' },
    { key: 'regCountry', label: 'Country', type: 'text', placeholder: 'Country', visibleIf: 'regAddress' },

    { key: 'referredBy', label: 'Referred By', type: 'text', placeholder: 'Sales Rep Name / Code', required: true },

    { type: 'divider' },
    { key: 'hasIdProof', label: "I confirm I have ID & Address proof available", type: 'checkbox' },
    { key: 'termsAccepted', label: "By submitting, I have read and accepted the terms & conditions and the data protection & privacy policy and confirm that I am the validly authorized signatory of the customer. A copy of the terms & conditions and the data protection & privacy policy can be provided over email if required. Please contact us for the same.", type: 'checkbox' },
    { key: 'privacyAccepted', label: "By submitting, I agree for my personal information only to be used to process & update any purchases made with Thames C&C Ltd. services, both via in-depot or online.", type: 'checkbox' },
    { key: 'marketingAccepted', label: "I accept to receive any marketing information such as special offers, business updates and any other industry tips & guiding information. I can always choose to opt out later on by reaching out to Thames C&C Ltd.", type: 'checkbox' },
  ];

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSelection = (value) => {
    handleChange(modalField, value);
    setModalVisible(false);
  };

  const handleRegister = async () => {
    // Dynamic Validation
    for (const field of formSchema) {
      if (field.visibleIf && !sectionToggles[field.visibleIf]) continue;
      if (field.type === 'header' || field.type === 'toggle' || field.type === 'divider') continue;

      const isRequired = typeof field.required === 'function' ? field.required(formData) : field.required;
      if (isRequired && !formData[field.key]) {
        Alert.alert('Missing Information', `Please fill in ${field.label}`);
        return;
      }
    }

    if (!formData.termsAccepted || !formData.privacyAccepted) {
        Alert.alert('Terms & Conditions', 'Please accept the Terms & Conditions and Privacy Policy.');
        return;
    }

    setLoading(true);
    try {
      // Construct payload
      const payload = {
        username: formData.email,
        password: formData.password,
        name: `${formData.ownerFirstName} ${formData.ownerLastName}`, // Map owner name to user name
        email: formData.email,
        phone: formData.phone,
        address: `${formData.tradingStreet}, ${formData.tradingCity}, ${formData.tradingZip}`, // Primary address
        ...formData // Send all other fields as well
      };

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created and is pending Admin approval. You will be able to login once approved.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Registration Failed', data.message || 'Something went wrong.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (item) => {
    const required = typeof item.required === 'function' ? item.required(formData) : item.required;
    return (
    <View style={styles.inputGroup} key={item.key}>
      <Text style={styles.label}>{item.label} {required && '*'}</Text>
      <TextInput 
        style={styles.input} 
        placeholder={item.placeholder} 
        value={formData[item.key]}
        onChangeText={(t) => handleChange(item.key, t)}
        keyboardType={item.keyboardType || 'default'}
        secureTextEntry={item.secure}
        autoCapitalize={item.key.toLowerCase().includes('email') ? 'none' : 'sentences'}
        placeholderTextColor="#A0AEC0"
      />
    </View>
    );
  };

  const renderSelector = (item) => (
    <View style={styles.inputGroup} key={item.key}>
      <Text style={styles.label}>{item.label} {item.required && '*'}</Text>
      <TouchableOpacity 
        style={styles.selector} 
        onPress={() => { setModalField(item.key); setModalVisible(true); }}
      >
        <Text style={[styles.selectorText, !formData[item.key] && { color: '#A0AEC0' }]}>
          {formData[item.key] || `Select ${item.label}`}
        </Text>
        <Icon name="chevron-down" size={20} color="#718096" />
      </TouchableOpacity>
    </View>
  );

  const renderCheckbox = (item) => (
    <TouchableOpacity key={item.key} style={styles.checkboxContainer} onPress={() => handleChange(item.key, !formData[item.key])}>
      <Icon name={formData[item.key] ? "checkbox" : "square-outline"} size={24} color="#1d3557" />
      <Text style={styles.checkboxLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  const renderField = (item, index) => {
    if (item.visibleIf && !sectionToggles[item.visibleIf]) return null;

    switch (item.type) {
      case 'header':
        return <Text key={`header-${index}`} style={styles.sectionHeader}>{item.label}</Text>;
      case 'divider':
        return <View key={`divider-${index}`} style={styles.divider} />;
      case 'text':
        return renderInput(item);
      case 'select':
        return renderSelector(item);
      case 'checkbox':
        return renderCheckbox(item);
      case 'toggle':
        return (
          <TouchableOpacity 
            key={`toggle-${index}`}
            style={styles.toggleButton} 
            onPress={() => setSectionToggles(prev => ({ ...prev, [item.toggleKey]: !prev[item.toggleKey] }))}
          >
            <Text style={styles.toggleButtonText}>
              {sectionToggles[item.toggleKey] ? 'Hide Address Fields' : item.label}
            </Text>
            <Icon name={sectionToggles[item.toggleKey] ? "chevron-up" : "chevron-down"} size={16} color="#2a9d8f" />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#1d3557" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start ordering</Text>

          <View style={styles.form}>
            {formSchema.map((item, index) => renderField(item, index))}

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Register</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select {modalField === 'businessType' ? 'Business Type' : 'Entity'}</Text>
                <FlatList 
                    data={modalField === 'businessType' ? businessTypes : entities}
                    keyExtractor={(item) => item}
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.modalOption} onPress={() => handleSelection(item)}>
                            <Text style={styles.modalOptionText}>{item}</Text>
                            {formData[modalField] === item && <Icon name="checkmark" size={20} color="#2a9d8f" />}
                        </TouchableOpacity>
                    )}
                />
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  scrollContent: { padding: 24 },
  backButton: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1d3557', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6c757d', marginBottom: 32 },
  form: { gap: 12 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginTop: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 4 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, color: '#2D3748' },
  selector: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorText: { fontSize: 16, color: '#2D3748' },
  
  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, marginTop: 4 },
  checkboxLabel: { marginLeft: 12, fontSize: 14, color: '#4A5568', flex: 1, lineHeight: 20 },
  
  toggleButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  toggleButtonText: { color: '#2a9d8f', fontWeight: '600', marginRight: 8 },
  subSection: { paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', marginBottom: 10 },
  
  button: { backgroundColor: '#1d3557', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1d3557', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  modalOptionText: { fontSize: 16, color: '#2D3748' },
  closeButton: { marginTop: 20, padding: 12, alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12 },
  closeButtonText: { color: '#e63946', fontWeight: 'bold' },
});
