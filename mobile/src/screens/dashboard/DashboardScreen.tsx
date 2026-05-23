import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { dashboardApi } from '../../services/api';
import { DashboardStats, Transaction } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const DashboardScreen: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const { data } = await dashboardApi.getStats();
      setStats(data.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}! 👋</Text>
        <Text style={styles.subtitle}>Your activity overview</Text>
      </View>

      {stats && (
        <>
          <Text style={styles.sectionTitle}>Sales</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Active Listings" value={String(stats.listings.active)} color="#6C63FF" />
            <StatCard label="Sold" value={String(stats.listings.sold)} color="#4CAF50" />
            <StatCard label="Revenue" value={`${stats.sales.revenue.toFixed(0)}€`} color="#FF9800" />
            <StatCard label="Orders" value={String(stats.sales.count)} color="#2196F3" />
          </View>

          <Text style={styles.sectionTitle}>Purchases</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Total Bought" value={String(stats.purchases.count)} color="#E91E63" />
            <StatCard label="Total Spent" value={`${stats.purchases.spent.toFixed(0)}€`} color="#9C27B0" />
          </View>

          {stats.agentRules.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>AI Agents</Text>
              {stats.agentRules.map((rule) => (
                <View key={rule.id} style={styles.agentCard}>
                  <View style={styles.agentHeader}>
                    <Text style={styles.agentName}>{rule.name}</Text>
                    <View style={[styles.agentStatus, { backgroundColor: rule.status === 'ACTIVE' ? '#4CAF50' : '#FF9800' }]}>
                      <Text style={styles.agentStatusText}>{rule.status}</Text>
                    </View>
                  </View>
                  <View style={styles.agentStats}>
                    <Text style={styles.agentStat}>{rule.totalPurchases} purchases</Text>
                    <Text style={styles.agentStat}>{rule.spentToday.toFixed(0)}€ / {rule.dailyBudget}€ today</Text>
                  </View>
                  <View style={styles.budgetBar}>
                    <View
                      style={[
                        styles.budgetFill,
                        { width: `${Math.min(100, (rule.spentToday / rule.dailyBudget) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {stats.recentTransactions.length === 0 ? (
            <Text style={styles.empty}>No transactions yet</Text>
          ) : (
            stats.recentTransactions.map((tx: Transaction) => (
              <View key={tx.id} style={styles.txCard}>
                <View style={styles.txLeft}>
                  <Text style={styles.txTitle} numberOfLines={1}>{tx.listing?.title || 'Listing'}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>
                    {tx.buyerId === user?.id ? '-' : '+'}{tx.amount.toFixed(2)}€
                  </Text>
                  <View style={[styles.txStatus, {
                    backgroundColor: tx.status === 'COMPLETED' ? '#E8F5E9' : '#FFF3E0',
                  }]}>
                    <Text style={{ fontSize: 11, color: tx.status === 'COMPLETED' ? '#4CAF50' : '#FF9800' }}>
                      {tx.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#6C63FF', padding: 20, paddingTop: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 12, paddingHorizontal: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 4 },
  agentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  agentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  agentName: { fontSize: 15, fontWeight: '600', color: '#333' },
  agentStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  agentStatusText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  agentStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  agentStat: { fontSize: 13, color: '#666' },
  budgetBar: { height: 4, backgroundColor: '#f0f0f0', borderRadius: 2 },
  budgetFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 2 },
  txCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  txDate: { fontSize: 12, color: '#aaa', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  txStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  empty: { textAlign: 'center', color: '#aaa', paddingHorizontal: 16 },
});
