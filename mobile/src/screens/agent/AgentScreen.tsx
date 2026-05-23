import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { agentApi } from '../../services/api';
import { AgentRule, UrgencyLevel } from '../../types';

const CATEGORIES = ['Electronics', 'Clothing', 'Furniture', 'Books', 'Sports', 'Other'];
const URGENCY_OPTIONS: UrgencyLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'FLASH'];

const defaultForm = {
  name: '',
  maxPrice: '',
  dailyBudget: '',
  categories: [] as string[],
  urgencyLevels: [] as UrgencyLevel[],
  keywords: '',
  maxDistanceKm: '',
};

export const AgentScreen: React.FC = () => {
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const loadRules = async () => {
    try {
      const { data } = await agentApi.getRules();
      setRules(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRules(); }, []);

  const toggleRule = async (id: string) => {
    try {
      const { data } = await agentApi.toggleRule(id);
      setRules((prev) => prev.map((r) => r.id === id ? data.data : r));
    } catch {
      Alert.alert('Error', 'Could not toggle rule');
    }
  };

  const deleteRule = (id: string) => {
    Alert.alert('Delete Rule', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await agentApi.deleteRule(id);
          setRules((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!form.name || !form.maxPrice || !form.dailyBudget) {
      Alert.alert('Error', 'Name, max price and daily budget are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await agentApi.createRule({
        name: form.name,
        maxPrice: parseFloat(form.maxPrice),
        dailyBudget: parseFloat(form.dailyBudget),
        categories: form.categories,
        urgencyLevels: form.urgencyLevels,
        keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        maxDistanceKm: form.maxDistanceKm ? parseFloat(form.maxDistanceKm) : undefined,
      });
      setRules((prev) => [data.data, ...prev]);
      setModalVisible(false);
      setForm(defaultForm);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', e.response?.data?.error || 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const toggleUrgency = (u: UrgencyLevel) => {
    setForm((f) => ({
      ...f,
      urgencyLevels: f.urgencyLevels.includes(u)
        ? f.urgencyLevels.filter((l) => l !== u)
        : [...f.urgencyLevels, u],
    }));
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 AI Agent</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ New Rule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        <Text style={styles.description}>
          Your AI agent automatically purchases listings that match your rules, even when you're offline.
        </Text>

        {rules.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>No rules yet</Text>
            <Text style={styles.emptyText}>Create a rule to let AI buy deals for you automatically</Text>
          </View>
        ) : (
          rules.map((rule) => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Switch
                  value={rule.status === 'ACTIVE'}
                  onValueChange={() => toggleRule(rule.id)}
                  trackColor={{ true: '#6C63FF' }}
                />
              </View>

              <View style={styles.ruleDetails}>
                <Text style={styles.ruleDetail}>💰 Max price: {rule.maxPrice}€</Text>
                <Text style={styles.ruleDetail}>📅 Daily budget: {rule.spentToday.toFixed(0)}€ / {rule.dailyBudget}€</Text>
                {rule.categories.length > 0 && (
                  <Text style={styles.ruleDetail}>📦 {rule.categories.join(', ')}</Text>
                )}
                {rule.urgencyLevels.length > 0 && (
                  <Text style={styles.ruleDetail}>⚡ {rule.urgencyLevels.join(', ')}</Text>
                )}
                {rule.maxDistanceKm && (
                  <Text style={styles.ruleDetail}>📍 Within {rule.maxDistanceKm}km</Text>
                )}
                <Text style={styles.ruleStat}>✅ {rule.totalPurchases} purchases made</Text>
              </View>

              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRule(rule.id)}>
                <Text style={styles.deleteButtonText}>Delete Rule</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Agent Rule</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput style={styles.input} placeholder="Rule name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          <TextInput style={styles.input} placeholder="Max price (€) *" value={form.maxPrice} onChangeText={(v) => setForm((f) => ({ ...f, maxPrice: v }))} keyboardType="decimal-pad" />
          <TextInput style={styles.input} placeholder="Daily budget (€) *" value={form.dailyBudget} onChangeText={(v) => setForm((f) => ({ ...f, dailyBudget: v }))} keyboardType="decimal-pad" />
          <TextInput style={styles.input} placeholder="Max distance (km, optional)" value={form.maxDistanceKm} onChangeText={(v) => setForm((f) => ({ ...f, maxDistanceKm: v }))} keyboardType="decimal-pad" />
          <TextInput style={styles.input} placeholder="Keywords (comma separated)" value={form.keywords} onChangeText={(v) => setForm((f) => ({ ...f, keywords: v }))} />

          <Text style={styles.fieldLabel}>Categories (any = all)</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, form.categories.includes(cat) && styles.chipActive]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={[styles.chipText, form.categories.includes(cat) && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Urgency levels (any = all)</Text>
          <View style={styles.chipRow}>
            {URGENCY_OPTIONS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, form.urgencyLevels.includes(u) && styles.chipActive]}
                onPress={() => toggleUrgency(u)}
              >
                <Text style={[styles.chipText, form.urgencyLevels.includes(u) && styles.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.createButton, submitting && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Create Rule</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  addButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '700' },
  list: { flex: 1, padding: 16 },
  description: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  ruleCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2 },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ruleName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  ruleDetails: { gap: 4, marginBottom: 12 },
  ruleDetail: { fontSize: 13, color: '#555' },
  ruleStat: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  deleteButton: { alignSelf: 'flex-end' },
  deleteButtonText: { color: '#F44336', fontSize: 13 },
  modal: { flex: 1, backgroundColor: '#fff', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  modalClose: { fontSize: 20, color: '#666' },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  createButton: { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20 },
  createButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
