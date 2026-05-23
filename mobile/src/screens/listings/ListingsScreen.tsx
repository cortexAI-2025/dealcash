import React, { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchListings } from '../../store/listings.slice';
import { RootState, AppDispatch } from '../../store';
import { ListingCard } from '../../components/ListingCard';
import { FilterBar } from '../../components/FilterBar';
import { RootStackParamList } from '../../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ListingsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<Nav>();
  const { items, loading, pagination } = useSelector((state: RootState) => state.listings);

  const [urgency, setUrgency] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadListings = useCallback((page = 1) => {
    const params: Record<string, string | number> = { page };
    if (urgency) params.urgency = urgency;
    if (category) params.category = category;
    if (search) params.search = search;
    dispatch(fetchListings(params));
  }, [dispatch, urgency, category, search]);

  useEffect(() => { loadListings(); }, [loadListings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchListings({}));
    setRefreshing(false);
  };

  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !loading) {
      loadListings(pagination.page + 1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DealCash</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Text style={styles.addButtonText}>+ Sell</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          placeholder="Search deals..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadListings()}
          returnKeyType="search"
        />
      </View>

      <FilterBar
        selectedUrgency={urgency}
        selectedCategory={category}
        onUrgencyChange={(u) => { setUrgency(u); }}
        onCategoryChange={(c) => { setCategory(c); }}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No deals found</Text>
              <Text style={styles.emptySubText}>Be the first to post one!</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={styles.loader} color="#6C63FF" /> : null
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6C63FF',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  searchContainer: { backgroundColor: '#fff', padding: 12 },
  search: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  loader: { marginVertical: 20 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666' },
  emptySubText: { fontSize: 14, color: '#aaa', marginTop: 8 },
  emptyContainer: { flexGrow: 1 },
});
