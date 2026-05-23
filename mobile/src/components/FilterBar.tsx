import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { UrgencyLevel } from '../types';

const URGENCY_OPTIONS: { label: string; value: UrgencyLevel | '' }[] = [
  { label: 'All', value: '' },
  { label: '⚡ Flash', value: 'FLASH' },
  { label: '🔴 Urgent', value: 'HIGH' },
  { label: '🟡 Medium', value: 'MEDIUM' },
  { label: '🟢 Low', value: 'LOW' },
];

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Furniture', 'Books', 'Sports', 'Other'];

interface Props {
  selectedUrgency: string;
  selectedCategory: string;
  onUrgencyChange: (urgency: string) => void;
  onCategoryChange: (category: string) => void;
}

export const FilterBar: React.FC<Props> = ({
  selectedUrgency,
  selectedCategory,
  onUrgencyChange,
  onCategoryChange,
}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {URGENCY_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, selectedUrgency === opt.value && styles.chipActive]}
          onPress={() => onUrgencyChange(opt.value)}
        >
          <Text style={[styles.chipText, selectedUrgency === opt.value && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={styles.separator} />
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.chip, selectedCategory === cat && styles.chipActive]}
          onPress={() => onCategoryChange(cat === 'All' ? '' : cat)}
        >
          <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { View } = require('react-native');

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#6C63FF' },
  chipText: { fontSize: 13, color: '#666', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  separator: { width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 },
});
