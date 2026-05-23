import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';

import { RootState, AppDispatch } from '../store';
import { setToken, loadProfile } from '../store/auth.slice';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ListingsScreen } from '../screens/listings/ListingsScreen';
import { ListingDetailScreen } from '../screens/listings/ListingDetailScreen';
import { CreateListingScreen } from '../screens/listings/CreateListingScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AgentScreen } from '../screens/agent/AgentScreen';
import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        const icons: Record<string, string> = {
          Listings: 'list',
          Dashboard: 'bar-chart',
          Agent: 'robot',
          Profile: 'person',
        };
        return <Ionicons name={(icons[route.name] || 'list') as never} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6C63FF',
      tabBarInactiveTintColor: '#aaa',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Listings" component={ListingsScreen} />
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Agent" component={AgentScreen} options={{ tabBarLabel: 'AI Agent' }} />
  </Tab.Navigator>
);

const AuthFlow: React.FC = () => {
  const [showRegister, setShowRegister] = useState(false);
  return showRegister ? (
    <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />
  ) : (
    <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />
  );
};

export const AppNavigator: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { token } = useSelector((state: RootState) => state.auth);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await SecureStore.getItemAsync('token');
      if (storedToken) {
        dispatch(setToken(storedToken));
        dispatch(loadProfile());
      }
      setInitializing(false);
    })();
  }, [dispatch]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#6C63FF' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
        {!token ? (
          <Stack.Screen name="Auth" component={AuthFlow} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Listing' }} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: 'New Listing' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
