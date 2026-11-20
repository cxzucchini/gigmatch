import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import PageLayout from '../components/PageLayout';
import AppAlert from '../components/AppAlert';
import { theme } from '../styles/theme';

export default function ContactScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <PageLayout active="Contact">
      <View style={styles.hero}>
        <Text style={styles.kicker}>LET&apos;S TALK</Text>
        <Text style={styles.title}>We&apos;d love to hear from you.</Text>
        <Text style={styles.copy}>Questions about finding an artist, your profile, or a booking? Send us a note and we&apos;ll be in touch.</Text>
      </View>
      <View style={styles.layout}>
        <View style={styles.details}>
          <Text style={styles.detailsTitle}>Get in touch</Text>
          <View style={styles.detailItem}><Text style={styles.detailLabel}>EMAIL</Text><Text style={styles.detailValue}>hello@gigmatch.ph</Text></View>
          <View style={styles.detailItem}><Text style={styles.detailLabel}>BASED IN</Text><Text style={styles.detailValue}>The Philippines</Text></View>
          <View style={styles.detailItem}><Text style={styles.detailLabel}>RESPONSE TIME</Text><Text style={styles.detailValue}>Usually within 1–2 business days</Text></View>
          <View style={styles.note}><Text style={styles.noteTitle}>Planning an event?</Text><Text style={styles.noteCopy}>Browse artists and open a booking request right from their profile.</Text></View>
        </View>
        <View style={styles.form}>
          {submitted ? (
            <View style={styles.success}>
              <Text style={styles.successMark}>✓</Text>
              <Text style={styles.successTitle}>Thank you for reaching out.</Text>
              <Text style={styles.copy}>Your message has been recorded in this prototype.</Text>
              <Pressable onPress={() => setSubmitted(false)}><Text style={styles.sendAnother}>SEND ANOTHER MESSAGE</Text></Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.formTitle}>Send us a message</Text>
              <Text style={styles.label}>Your name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={theme.muted} accessibilityLabel="Your name" style={styles.input} />
              <Text style={styles.label}>Email address</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={theme.muted} accessibilityLabel="Email address" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
              <Text style={styles.label}>How can we help?</Text>
              <TextInput value={message} onChangeText={setMessage} placeholder="Write your message..." placeholderTextColor={theme.muted} accessibilityLabel="How can we help?" multiline style={[styles.input, styles.messageInput]} />
              <Pressable onPress={submit} style={styles.button}><Text style={styles.buttonText}>Send message</Text></Pressable>
              <Text style={styles.privacy}>Your details are only used to respond to your enquiry.</Text>
            </>
          )}
        </View>
      </View>
      <AppAlert
        visible={Boolean(error)}
        title="A little more information"
        message={error}
        onDismiss={() => setError('')}
      />
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  kicker: { color: theme.muted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 12 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 36, textAlign: 'center' },
  copy: { color: theme.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 550, marginTop: 12 },
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, maxWidth: 980, width: '90%', alignSelf: 'center' },
  details: { flexGrow: 1, flexBasis: 260, backgroundColor: theme.accent, padding: 26, minHeight: 360 },
  detailsTitle: { color: '#fff', fontFamily: 'Georgia', fontSize: 25, marginBottom: 22 },
  detailItem: { marginBottom: 20 },
  detailLabel: { color: '#E0C5AA', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 5 },
  detailValue: { color: '#F8F1E9', fontSize: 14, lineHeight: 20 },
  note: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', paddingTop: 18, marginTop: 8 },
  noteTitle: { color: '#fff', fontFamily: 'Georgia', fontSize: 18, marginBottom: 6 },
  noteCopy: { color: '#E9DCCF', fontSize: 12, lineHeight: 19 },
  form: { flexGrow: 1, flexBasis: 320, padding: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.panelSoft },
  formTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 24, marginBottom: 22 },
  label: { color: theme.accent, fontSize: 12, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingHorizontal: 13, paddingVertical: 12, color: theme.text, minHeight: 48 },
  messageInput: { minHeight: 120, textAlignVertical: 'top' },
  button: { backgroundColor: theme.accent, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '700', letterSpacing: 0.6 },
  privacy: { color: theme.muted, fontSize: 10, textAlign: 'center', marginTop: 11 },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  successMark: { color: '#fff', backgroundColor: theme.accent, width: 48, height: 48, borderRadius: 24, textAlign: 'center', textAlignVertical: 'center', fontSize: 26, overflow: 'hidden' },
  successTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 23, textAlign: 'center', marginTop: 16 },
  sendAnother: { color: theme.accent, fontSize: 10, letterSpacing: 1.3, fontWeight: '700', marginTop: 24 },
});
