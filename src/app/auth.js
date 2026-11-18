import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import AppAlert from '../components/AppAlert';
import HoverPressable from '../components/HoverPressable';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

export default function AuthScreen() {
  const router = useRouter();
  const { user, loading, sessionError, signIn, signUp, signOut } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const submit = async () => {
    setError('');
    if (isRegistering && name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (isRegistering && password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      let authenticatedUser;
      if (isRegistering) {
        authenticatedUser = await signUp(name.trim(), email.trim(), password, role);
      } else {
        authenticatedUser = await signIn(email.trim(), password);
      }
      router.replace(authenticatedUser.role === 'musician' ? '/musician/profile' : '/');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setError('');
    setIsRegistering((current) => !current);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Account" />
      <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.select({ ios: 'padding', android: 'height' })}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : user ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>YOUR GIGMATCH ACCOUNT</Text>
            <Text style={styles.title}>Welcome, {user.name.split(' ')[0]}.</Text>
            <Text style={styles.subtitle}>{user.email}</Text>
            <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{user.role.toUpperCase()}</Text></View>
            {sessionError ? <Text style={styles.notice}>{sessionError}</Text> : null}
            <HoverPressable onPress={() => router.replace(user.role === 'musician' ? '/musician/profile' : '/')} style={styles.primaryButton} hoverStyle={styles.buttonHovered}>
                          <Text style={styles.primaryButtonText}>{user.role === 'musician' ? 'Set up or edit your profile' : 'Set up your profile'}</Text>
            </HoverPressable>
            <HoverPressable onPress={async () => { await signOut(); }} style={styles.textButton}>
              <Text style={styles.textButtonText}>Sign out</Text>
            </HoverPressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.kicker}>{isRegistering ? 'JOIN THE GIGMATCH COMMUNITY' : 'WELCOME BACK'}</Text>
            <Text style={styles.title}>{isRegistering ? 'Create your account.' : 'Find your sound.'}</Text>
            <Text style={styles.subtitle}>{isRegistering ? 'Start discovering performers or sharing your music.' : 'Sign in to continue to Gigmatch.'}</Text>

            {isRegistering ? (
              <>
                <Text style={styles.label}>I am joining as</Text>
                <View style={styles.roleRow}>
                  {['client', 'musician'].map((option) => (
                    <HoverPressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityLabel={`Join as ${option === 'client' ? 'event host' : 'musician'}`}
                      accessibilityState={{ selected: role === option }}
                      onPress={() => setRole(option)}
                      style={[styles.roleOption, role === option && styles.roleOptionSelected]}
                    >
                      <Text style={[styles.roleText, role === option && styles.roleTextSelected]}>{option === 'client' ? 'Event host' : 'Musician'}</Text>
                    </HoverPressable>
                  ))}
                </View>
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor={theme.muted}
                  accessibilityLabel="Your name"
                  autoComplete="name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  style={styles.input}
                />
              </>
            ) : null}

            <Text style={styles.label}>Email address</Text>
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.muted}
              accessibilityLabel="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.muted}
              accessibilityLabel="Password"
              secureTextEntry
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              returnKeyType={isRegistering ? 'next' : 'go'}
              blurOnSubmit={!isRegistering}
              onSubmitEditing={() => (isRegistering ? confirmPasswordRef.current?.focus() : submit())}
              style={styles.input}
            />
            {isRegistering ? (
              <>
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  ref={confirmPasswordRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Enter your password again"
                  placeholderTextColor={theme.muted}
                  accessibilityLabel="Confirm password"
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  style={styles.input}
                />
              </>
            ) : null}

            {sessionError && !error ? <Text style={styles.notice}>{sessionError}</Text> : null}
            <HoverPressable onPress={submit} disabled={submitting} style={[styles.primaryButton, submitting && styles.buttonDisabled]} hoverStyle={styles.buttonHovered}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{isRegistering ? 'Create account' : 'Sign in'}</Text>}
            </HoverPressable>
            {!isRegistering ? (
                          <Text style={styles.recoveryNote}>Password reset is not available yet. For help, contact hello@gigmatch.ph.</Text>
            ) : null}
            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>{isRegistering ? 'Already have an account?' : 'New to Gigmatch?'}</Text>
              <HoverPressable onPress={toggleMode}><Text style={styles.switchAction}>{isRegistering ? 'Sign in' : 'Create account'}</Text></HoverPressable>
            </View>
            <Text style={styles.footnote}>By continuing, you agree to use Gigmatch respectfully and keep your account details secure.</Text>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
      <AppAlert
        visible={Boolean(error)}
        title="Sign-in problem"
        message={error}
        onDismiss={() => setError('')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  keyboardAvoiding: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 36, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 480, padding: 28, backgroundColor: '#F6F1EA', borderWidth: 1, borderColor: theme.border },
  kicker: { color: theme.muted, fontSize: 9, letterSpacing: 1.8, fontWeight: '700', marginBottom: 12 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 34, lineHeight: 40 },
  subtitle: { color: theme.muted, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  label: { color: theme.accent, fontSize: 12, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingHorizontal: 13, paddingVertical: 12, color: theme.text, minHeight: 48 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, paddingVertical: 12, backgroundColor: '#FBF9F6' },
  roleOptionSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  roleText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
  roleTextSelected: { color: '#fff' },
  primaryButton: { backgroundColor: theme.accentDark, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  buttonDisabled: { opacity: 0.7 },
  error: { color: '#9B2C20', backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 10, fontSize: 12, lineHeight: 18, marginTop: 14 },
  notice: { color: theme.accent, backgroundColor: '#EAE1D7', padding: 10, fontSize: 11, lineHeight: 17, marginTop: 14 },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 18 },
  switchPrompt: { color: theme.muted, fontSize: 12 },
  switchAction: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  footnote: { color: theme.muted, fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 17 },
  recoveryNote: { color: theme.muted, fontSize: 11, lineHeight: 17, marginTop: 12 },
  roleBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 11, paddingVertical: 6, marginTop: 14 },
  roleBadgeText: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  textButton: { alignItems: 'center', padding: 14 },
  textButtonText: { color: theme.accent, fontSize: 12, fontWeight: '700' },

  demoButtons: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'center' },
  demoButton: { backgroundColor: '#E8F4FD', paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.accent, borderRadius: 20, minWidth: 140, alignItems: 'center',
  demoButtonText: { color: theme.accent, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 }}
});
