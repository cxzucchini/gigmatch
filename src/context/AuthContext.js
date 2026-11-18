import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../services/api';

const TOKEN_KEY = 'gigmatch.auth.token';
const AuthContext = createContext(null);

// Web: persist in localStorage so the session survives page reloads.
// Native: SecureStore (encrypted Keychain/Keystore).
async function getStoredToken() {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(TOKEN_KEY);
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token) {
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode); session stays in-memory for this tab.
  }
}

async function removeToken() {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const savedToken = await getStoredToken();
        if (!savedToken) return;
        const currentUser = await apiRequest('/auth/me', { token: savedToken });
        if (active) {
          setToken(savedToken);
          setUser(currentUser);
        }
      } catch (error) {
        if (error.status === 401) {
          await removeToken();
        } else if (active) {
          setSessionError(error.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const authenticate = useCallback(async (endpoint, payload) => {
    const result = await apiRequest(`/auth/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await saveToken(result.token);
    setToken(result.token);
    const authenticatedUser = { _id: result._id, name: result.name, email: result.email, role: result.role };
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const signIn = useCallback((email, password) => authenticate('login', { email, password }), [authenticate]);
  const signUp = useCallback((name, email, password, role) => (
    authenticate('register', { name, email, password, role })
  ), [authenticate]);

  const signOut = useCallback(async () => {
    await removeToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    signIn,
    signUp,
    signOut,
    sessionError,
  }), [user, token, loading, signIn, signUp, signOut, sessionError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
