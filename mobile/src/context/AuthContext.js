import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, verifyEmailOtp } from '../services/api';

const TOKEN_KEY = 'gigmatch.auth.token';
const AuthContext = createContext(null);

async function getStoredToken() {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(TOKEN_KEY);
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token) {
  if (!token) return;
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

  const applyAuthenticatedSession = useCallback(async (result) => {
    await saveToken(result.token);
    setToken(result.token);
    const authenticatedUser = {
      _id: result._id,
      name: result.name,
      email: result.email,
      role: result.role,
    };
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

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

  const signIn = useCallback(async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return applyAuthenticatedSession(result);
  }, [applyAuthenticatedSession]);

  const signUp = useCallback(async (name, email, password, role) => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    if (result.token) {
      const authenticatedUser = await applyAuthenticatedSession(result);
      return { verified: true, user: authenticatedUser };
    }
    return {
      verified: false,
      email: result.email || email,
      message: result.message || 'Verification code sent to your email.',
    };
  }, [applyAuthenticatedSession]);

  const completeEmailVerification = useCallback(async (email, code) => {
    const result = await verifyEmailOtp({ email, code });
    return applyAuthenticatedSession(result);
  }, [applyAuthenticatedSession]);

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
    completeEmailVerification,
    signOut,
    sessionError,
  }), [user, token, loading, signIn, signUp, completeEmailVerification, signOut, sessionError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}