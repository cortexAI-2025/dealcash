import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { listingsApi } from '../../services/api';
import { Listing, RootStackParamList, UrgencyLevel } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Route = RouteProp<RootStackParamList, 'ListingDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  LOW: '#4CAF50', MEDIUM: '#FF9800', HIGH: '#F44336', FLASH: '#9C27B0',
};

export const ListingDetailScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    listingsApi.getOne(route.params.listingId).then(({ data }) => {
      setListing(data.data);
      setLoading(false);
    }).catch(() => {
      Alert.alert('Error', 'Could not load listing');
      navigation.goBack();
    });
  }, [route.params.listingId, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!listing) return null;

  const isOwner = user?.id === listing.sellerId;
  const canBuy = !isOwner && listing.status === 'ACTIVE';

  return (
    <ScrollView style={styles.container}>
      {listing.photos.length > 0 ? (
        <View>
          <Image
            source={{ uri: listing.photos[currentPhoto] }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          {listing.photos.length > 1 && (
            <View style={styles.photoDots}>
              {listing.photos.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setCurrentPhoto(i)}>
                  <View style={[styles.dot, i === currentPhoto && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.mainImage, styles.placeholder]}>
          <Text style={{ fontSize: 60 }}>📷</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: URGENCY_COLORS[listing.urgency] }]}>
            <Text style={styles.urgencyText}>{listing.urgency}</Text>
          </View>
        </View>

        <Text style={styles.price}>{listing.price.toFixed(2)}€</Text>

        <View style={styles.metaRow}>
          <Text style={styles.category}>📦 {listing.category}</Text>
          {listing.city && <Text style={styles.location}>📍 {listing.city}</Text>}
          <Text style={styles.views}>👁 {listing.viewCount}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{listing.description}</Text>

        <Text style={styles.sectionTitle}>Seller</Text>
        <View style={styles.sellerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {listing.seller.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.sellerName}>{listing.seller.name}</Text>
        </View>

        <Text style={styles.expiresAt}>
          Expires: {new Date(listing.expiresAt).toLocaleDateString()}
        </Text>

        {canBuy && (
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => navigation.navigate('Payment', { listingId: listing.id })}
          >
            <Text style={styles.buyButtonText}>Buy Now — {listing.price.toFixed(2)}€</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerText}>This is your listing</Text>
          </View>
        )}

        {listing.status !== 'ACTIVE' && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>
              {listing.status === 'SOLD' ? '✅ Sold' : `Status: ${listing.status}`}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainImage: { width: '100%', height: 300 },
  placeholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  photoDots: { flexDirection: 'row', justifyContent: 'center', padding: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc', marginHorizontal: 3 },
  dotActive: { backgroundColor: '#6C63FF' },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 10 },
  urgencyBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  urgencyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  price: { fontSize: 32, fontWeight: '800', color: '#6C63FF', marginVertical: 8 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  category: { fontSize: 14, color: '#666' },
  location: { fontSize: 14, color: '#666' },
  views: { fontSize: 14, color: '#aaa' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  description: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 16 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sellerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  expiresAt: { fontSize: 13, color: '#aaa', marginBottom: 24 },
  buyButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buyButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ownerBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  ownerText: { color: '#4CAF50', fontWeight: '600' },
  unavailableBadge: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  unavailableText: { color: '#666', fontWeight: '600' },
});
