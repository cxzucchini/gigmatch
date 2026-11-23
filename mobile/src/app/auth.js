import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import AppAlert from '../components/AppAlert';
import HoverPressable from '../components/HoverPressable';
import { useAuth } from '../context/AuthContext';
import { requestPasswordResetOtp, resendAuthOtp, resetPasswordWithOtp } from '../services/api';
import { theme } from '../styles/theme';

// mode: 'signin' | 'signup' | 'verify_email' | 'forgot_password'
export default function AuthScreen() {
  const router = useRouter();
  const { user, loading, sessionError, signIn, signUp, completeEmailVerification, signOut } = useAuth();

  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP & password reset states
  const [otpCode, setOtpCode] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const isRegistering = mode === 'signup';

  const switchMode = (nextMode) => {
    setError('');
    setStatusMessage('');
    setMode(nextMode);
  };

  const handleAuthSubmit = async () => {
    setError('');
    setStatusMessage('');

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
      const normalizedEmail = email.trim().toLowerCase();
      if (isRegistering) {
        const outcome = await signUp(name.trim(), normalizedEmail, password, role);
        setEmail(normalizedEmail);
        if (outcome.verified) {
          router.replace('/verify-id');
          return;
        }
        setOtpCode('');
        setStatusMessage(outcome.message || 'Enter the 6-digit code sent to your email.');
        setMode('verify_email');
        return;
      }

      const authenticatedUser = await signIn(normalizedEmail, password);
      router.replace(authenticatedUser.role === 'musician' ? '/musician/profile' : '/');
    } catch (requestError) {
      if (requestError.data?.requiresEmailVerification) {
        setEmail(requestError.data.email || email.trim().toLowerCase());
        setOtpCode('');
        setStatusMessage(requestError.message || 'Verify your email to continue.');
        setMode('verify_email');
        return;
      }
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async () => {
    setError('');
    setStatusMessage('');
    const cleanCode = otpCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Enter the 6-digit verification code from your email.');
      return;
    }

    setSubmitting(true);
    try {
      await completeEmailVerification(email.trim().toLowerCase(), cleanCode);
      // Required step: every new account must verify a government ID before continuing.
      router.replace('/verify-id');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async (purpose = 'verify_email') => {
    setError('');
    setStatusMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address first.');
      return;
    }

    setResending(true);
    try {
      const res = await resendAuthOtp({ email: normalizedEmail, purpose });
      setStatusMessage(res.message || 'A new 6-digit code has been sent.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResending(false);
    }
  };

  const handleSendResetCode = async () => {
    setError('');
    setStatusMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestPasswordResetOtp({ email: normalizedEmail });
      setResetSent(true);
      setOtpCode('');
      setStatusMessage(res.message || 'If an account exists, a 6-digit code has been sent.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setStatusMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Enter the 6-digit reset code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Your new passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordWithOtp({
        email: normalizedEmail,
        code: cleanCode,
        newPassword,
      });
      setPassword('');
      setConfirmPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtpCode('');
      setResetSent(false);
      setMode('signin');
      setStatusMessage('Password updated. Sign in with your new password.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
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
              <HoverPressable
                onPress={() => router.replace(user.role === 'musician' ? '/musician/profile' : '/')}
                style={styles.primaryButton}
                hoverStyle={styles.buttonHovered}
              >
                <Text style={styles.primaryButtonText}>
                  {user.role === 'musician' ? 'Set up or edit your profile' : 'Set up your profile'}
                </Text>
              </HoverPressable>
              <HoverPressable onPress={async () => { await signOut(); }} style={styles.textButton}>
                <Text style={styles.textButtonText}>Sign out</Text>
              </HoverPressable>
            </View>
          ) : mode === 'verify_email' ? (
            <View style={styles.card}>
              <Text style={styles.kicker}>VERIFY YOUR EMAIL</Text>
              <Text style={styles.title}>Check your inbox.</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit verification code sent to {email || 'your email'}.
              </Text>

              {statusMessage ? <Text style={styles.notice}>{statusMessage}</Text> : null}

              <Text style={styles.label}>6-digit code</Text>
              <TextInput
                value={otpCode}
                onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={theme.muted}
                accessibilityLabel="6-digit verification code"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={handleVerifyEmail}
                style={[styles.input, styles.otpInput]}
              />

              <HoverPressable
                onPress={handleVerifyEmail}
                disabled={submitting}
                style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                hoverStyle={styles.buttonHovered}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify email</Text>}
              </HoverPressable>

              <HoverPressable
                onPress={() => handleResendCode('verify_email')}
                disabled={resending}
                style={styles.textButton}
              >
                <Text style={styles.textButtonText}>
                  {resending ? 'Sending code...' : 'Resend code'}
                </Text>
              </HoverPressable>

              <View style={styles.switchRow}>
                <HoverPressable onPress={() => switchMode('signin')}>
                  <Text style={styles.switchAction}>Back to sign in</Text>
                </HoverPressable>
              </View>
            </View>
          ) : mode === 'forgot_password' ? (
            <View style={styles.card}>
              <Text style={styles.kicker}>ACCOUNT RECOVERY</Text>
              <Text style={styles.title}>Reset password.</Text>
              <Text style={styles.subtitle}>
                {resetSent
                  ? 'Enter the 6-digit code from your email and choose a new password.'
                  : 'Enter your account email and we will send a 6-digit reset code.'}
              </Text>

              {statusMessage ? <Text style={styles.notice}>{statusMessage}</Text> : null}

              <Text style={styles.label}>Email address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!resetSent}
                style={[styles.input, resetSent && styles.inputMuted]}
              />

              {resetSent ? (
                <>
                  <Text style={styles.label}>6-digit reset code</Text>
                  <TextInput
                    value={otpCode}
                    onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    placeholderTextColor={theme.muted}
                    accessibilityLabel="6-digit reset code"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[styles.input, styles.otpInput]}
                  />

                  <Text style={styles.label}>New password</Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={theme.muted}
                    accessibilityLabel="New password"
                    secureTextEntry
                    autoComplete="new-password"
                    style={styles.input}
                  />

                  <Text style={styles.label}>Confirm new password</Text>
                  <TextInput
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="Enter new password again"
                    placeholderTextColor={theme.muted}
                    accessibilityLabel="Confirm new password"
                    secureTextEntry
                    autoComplete="new-password"
                    returnKeyType="go"
                    onSubmitEditing={handleResetPassword}
                    style={styles.input}
                  />

                  <HoverPressable
                    onPress={handleResetPassword}
                    disabled={submitting}
                    style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                    hoverStyle={styles.buttonHovered}
                  >
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Update password</Text>}
                  </HoverPressable>

                  <HoverPressable
                    onPress={() => handleResendCode('reset_password')}
                    disabled={resending}
                    style={styles.textButton}
                  >
                    <Text style={styles.textButtonText}>
                      {resending ? 'Sending code...' : 'Resend reset code'}
                    </Text>
                  </HoverPressable>
                </>
              ) : (
                <HoverPressable
                  onPress={handleSendResetCode}
                  disabled={submitting}
                  style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                  hoverStyle={styles.buttonHovered}
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send reset code</Text>}
                </HoverPressable>
              )}

              <View style={styles.switchRow}>
                <HoverPressable
                  onPress={() => {
                    setResetSent(false);
                    setOtpCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    switchMode('signin');
                  }}
                >
                  <Text style={styles.switchAction}>Back to sign in</Text>
                </HoverPressable>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.kicker}>{isRegistering ? 'JOIN THE GIGMATCH COMMUNITY' : 'WELCOME BACK'}</Text>
              <Text style={styles.title}>{isRegistering ? 'Create your account.' : 'Find your sound.'}</Text>
              <Text style={styles.subtitle}>
                {isRegistering ? 'Start discovering performers or sharing your music.' : 'Sign in to continue to Gigmatch.'}
              </Text>

              {statusMessage ? <Text style={styles.notice}>{statusMessage}</Text> : null}

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
                        <Text style={[styles.roleText, role === option && styles.roleTextSelected]}>
                          {option === 'client' ? 'Event host' : 'Musician'}
                        </Text>
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
                onSubmitEditing={() => (isRegistering ? confirmPasswordRef.current?.focus() : handleAuthSubmit())}
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
                    onSubmitEditing={handleAuthSubmit}
                    style={styles.input}
                  />
                </>
              ) : null}

              {sessionError && !error ? <Text style={styles.notice}>{sessionError}</Text> : null}
              <HoverPressable
                onPress={handleAuthSubmit}
                disabled={submitting}
                style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                hoverStyle={styles.buttonHovered}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{isRegistering ? 'Create account' : 'Sign in'}</Text>
                )}
              </HoverPressable>

              {!isRegistering ? (
                <HoverPressable
                  onPress={() => {
                    setResetSent(false);
                    setOtpCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    switchMode('forgot_password');
                  }}
                  style={styles.forgotLinkWrap}
                >
                  <Text style={styles.forgotLinkText}>Forgot password?</Text>
                </HoverPressable>
              ) : null}

              <View style={styles.switchRow}>
                <Text style={styles.switchPrompt}>{isRegistering ? 'Already have an account?' : 'New to Gigmatch?'}</Text>
                <HoverPressable onPress={() => switchMode(isRegistering ? 'signin' : 'signup')}>
                  <Text style={styles.switchAction}>{isRegistering ? 'Sign in' : 'Create account'}</Text>
                </HoverPressable>
              </View>
              <Text style={styles.footnote}>
                By continuing, you agree to use Gigmatch respectfully and keep your account details secure.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <AppAlert
        visible={Boolean(error)}
        title={mode === 'verify_email' ? 'Verification issue' : mode === 'forgot_password' ? 'Reset issue' : 'Sign-in problem'}
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
  inputMuted: { opacity: 0.7 },
  otpInput: { letterSpacing: 8, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, paddingVertical: 12, backgroundColor: '#FBF9F6' },
  roleOptionSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  roleText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
  roleTextSelected: { color: '#fff' },
  primaryButton: { backgroundColor: theme.accentDark, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  buttonDisabled: { opacity: 0.7 },
  notice: { color: theme.accent, backgroundColor: '#EAE1D7', padding: 10, fontSize: 11, lineHeight: 17, marginTop: 14 },
  forgotLinkWrap: { alignItems: 'center', marginTop: 14 },
  forgotLinkText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 18 },
  switchPrompt: { color: theme.muted, fontSize: 12 },
  switchAction: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  footnote: { color: theme.muted, fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 17 },
  roleBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 11, paddingVertical: 6, marginTop: 14 },
  roleBadgeText: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  textButton: { alignItems: 'center', padding: 14 },
  textButtonText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
});