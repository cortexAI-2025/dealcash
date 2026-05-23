import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useDispatch } from 'react-redux';
import { createListing } from '../../store/listings.slice';
import { AppDispatch } from '../../store';
import { UrgencyLevel } from '../../types';

const CATEGORIES = ['Electronics', 'Clothing', 'Furniture', 'Books', 'Sports', 'Other'];
const URGENCY_OPTIONS: { label: string; value: UrgencyLevel; color: string }[] = [
  { label: 'Low', value: 'LOW', color: '#4CAF50' },
  { label: 'Medium', value: 'MEDIUM', color: '#FF9800' },
  { label: 'High', value: 'HIGH', color: '#F44336' },
  { label: '⚡ Flash', value: 'FLASH', color: '#9C27B0' },
];

export const CreateListingScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [urgency, setUrgency] = useState<UrgencyLevel>('LOW');
  const [photos, setPhotos] = useState<string[]>([]);
  const [useLocation, setUseLocation] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; city?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant photo library access');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setPhotos(result.assets.map((a) => a.uri));
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant location access');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync(pos.coords);
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      city: place?.city || place?.region,
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    const result = await dispatch(
      createListing({
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        urgency,
        photos,
        ...(useLocation && location
          ? { latitude: location.lat, longitude: location.lng, city: location.city }
          : {}),
      })
    );

    setLoading(false);
    if (createListing.fulfilled.match(result)) {
      Alert.alert('Success', 'Your listing is now live!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', (result.payload as string) || 'Failed to create listing');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Photos</Text>
      <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
        <Text style={styles.photoButtonText}>
          {photos.length > 0 ? `${photos.length} photo(s) selected` : '+ Add Photos'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Title *"
        value={title}
        onChangeText={setTitle}
        maxLength={200}
      />
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Description *"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        maxLength={2000}
      />
      <TextInput
        style={styles.input}
        placeholder="Price (€) *"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />

      <Text style={styles.sectionTitle}>Category</Text>
      <View style={styles.optionRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.optionChip, category === cat && styles.optionChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.optionChipText, category === cat && styles.optionChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Urgency</Text>
      <View style={styles.optionRow}>
        {URGENCY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.urgencyChip,
              urgency === opt.value && { backgroundColor: opt.color },
            ]}
            onPress={() => setUrgency(opt.value)}
          >
            <Text style={[styles.urgencyChipText, urgency === opt.value && { color: '#fff' }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.locationRow}>
        <Text style={styles.sectionTitle}>Include Location</Text>
        <Switch
          value={useLocation}
          onValueChange={(val) => {
            setUseLocation(val);
            if (val && !location) getLocation();
          }}
          trackColor={{ true: '#6C63FF' }}
        />
      </View>
      {useLocation && location && (
        <Text style={styles.locationText}>
          📍 {location.city || `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Publish Listing</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8 },
  photoButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  photoButtonText: { color: '#6C63FF', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  optionChipText: { fontSize: 13, color: '#666' },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  urgencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  urgencyChipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationText: { color: '#666', marginBottom: 8 },
  submitButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
