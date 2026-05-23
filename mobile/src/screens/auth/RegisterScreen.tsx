import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '../../store/auth.slice';
import { AppDispatch, RootState } from '../../store';

interface Props {
  onSwitchToLogin: () => void;
}

export const RegisterScreen: React.FC<Props> = ({ onSwitchToLogin }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = () => {
    dispatch(clearError());
    dispatch(register({ name: name.trim(), email: email.trim().toLowerCase(), password, phone: phone || undefined }));
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.logo}>DealCash</Text>
        <Text style={styles.tagline}>Join the marketplace</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Password (min. 8 characters)" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#6C63FF" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchLink} onPress={onSwitchToLogin}>
          <Text style={styles.switchText}>Already have an account? <Text style={styles.switchTextBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6C63FF' },
  content: { padding: 28, paddingTop: 80 },
  logo: { fontSize: 42, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 40 },
  errorBox: { backgroundColor: 'rgba(255,0,0,0.15)', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#ffcdd2', textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  button: { backgroundColor: '#fff', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#6C63FF', fontSize: 17, fontWeight: '700' },
  switchLink: { marginTop: 20, alignItems: 'center' },
  switchText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  switchTextBold: { color: '#fff', fontWeight: '700' },
});
