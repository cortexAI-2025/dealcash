import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Listing, UrgencyLevel } from '../types';

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  LOW: '#4CAF50',
  MEDIUM: '#FF9800',
  HIGH: '#F44336',
  FLASH: '#9C27B0',
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'Urgent',
  FLASH: '⚡ Flash',
};

interface Props {
  listing: Listing;
  onPress: () => void;
}

export const ListingCard: React.FC<Props> = ({ listing, onPress }) => {
  const timeLeft = () => {
    const diff = new Date(listing.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        {listing.photos.length > 0 ? (
          <Image source={{ uri: listing.photos[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}
        <View style={[styles.urgencyBadge, { backgroundColor: URGENCY_COLORS[listing.urgency] }]}>
          <Text style={styles.urgencyText}>{URGENCY_LABELS[listing.urgency]}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.price}>{listing.price.toFixed(2)}€</Text>

        <View style={styles.meta}>
          {listing.city && (
            <Text style={styles.location}>📍 {listing.city}</Text>
          )}
          <Text style={styles.time}>{timeLeft()}</Text>
        </View>

        <Text style={styles.seller}>by {listing.seller.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 180 },
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 40 },
  urgencyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  urgencyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  info: { padding: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  price: { fontSize: 22, fontWeight: '800', color: '#6C63FF', marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  location: { fontSize: 13, color: '#666' },
  time: { fontSize: 13, color: '#999' },
  seller: { fontSize: 12, color: '#aaa' },
});
