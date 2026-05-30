import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  validateEmail,
  validatePassword,
  validateDateOfBirth,
  formatDateOfBirth,
} from '@/lib/auth';
import { Colors } from '@/constants/Colors';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mm, setMm] = useState('');
  const [dd, setDd] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    dob?: string;
    general?: string;
  }>({});

  const passwordRef = useRef<TextInput>(null);
  const ddRef = useRef<TextInput>(null);
  const yyyyRef = useRef<TextInput>(null);

  function handleMmChange(val: string) {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    setMm(cleaned);
    if (cleaned.length === 2) ddRef.current?.focus();
  }

  function handleDdChange(val: string) {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    setDd(cleaned);
    if (cleaned.length === 2) yyyyRef.current?.focus();
  }

  function handleYyyyChange(val: string) {
    setYyyy(val.replace(/\D/g, '').slice(0, 4));
  }

  async function handleSignUp() {
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    const dobErr = validateDateOfBirth(mm, dd, yyyy);

    if (emailErr || passErr || dobErr) {
      setErrors({
        email: emailErr ?? undefined,
        password: passErr ?? undefined,
        dob: dobErr ?? undefined,
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists')) {
          setErrors({
            general: 'an account with that email already exists. sign in instead?',
          });
        } else {
          setErrors({ general: 'something went wrong. try again.' });
        }
        return;
      }

      const authUser = data.user;
      if (!authUser) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      const dateOfBirth = formatDateOfBirth(mm, dd, yyyy);

      // Insert into users table — get back our internal user id
      const { data: userData, error: usersError } = await supabase
        .from('users')
        .insert({
          auth_id: authUser.id,
          email: email.trim().toLowerCase(),
          date_of_birth: dateOfBirth,
        })
        .select('id')
        .single();

      if (usersError || !userData) {
        console.error('users insert failed:', usersError);
        setErrors({ general: 'something went wrong creating your account. please try again.' });
        return;
      }

      // Root layout's onAuthStateChange fires → routes to /(tabs) automatically
      // Balance rows are seeded by DB trigger on users INSERT (migration: 20260529000001)
      // TODO: race condition — SIGNED_IN event may route before this users insert completes.
      // Mitigation: users INSERT is fast; (tabs) layout will check for profile on arrival.
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wordmark */}
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkTitle}>The Dregs</Text>
          <Text style={styles.wordmarkSub}>create account</Text>
        </View>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
          editable={!loading}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        {/* Password */}
        <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={[styles.input, errors.password ? styles.inputError : null]}
          value={password}
          onChangeText={setPassword}
          placeholder="at least 8 characters"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          returnKeyType="next"
          onSubmitEditing={() => ddRef.current?.focus()}
          blurOnSubmit={false}
          editable={!loading}
        />
        {errors.password ? (
          <Text style={styles.errorText}>{errors.password}</Text>
        ) : null}

        {/* DOB */}
        <Text style={[styles.label, { marginTop: 12 }]}>Your "Age"</Text>
        <View style={[styles.dobRow, errors.dob ? styles.dobRowError : null]}>
          <TextInput
            style={styles.dobInput}
            value={mm}
            onChangeText={handleMmChange}
            placeholder="MM"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            editable={!loading}
          />
          <Text style={styles.dobSeparator}>/</Text>
          <TextInput
            ref={ddRef}
            style={styles.dobInput}
            value={dd}
            onChangeText={handleDdChange}
            placeholder="DD"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            editable={!loading}
          />
          <Text style={styles.dobSeparator}>/</Text>
          <TextInput
            ref={yyyyRef}
            style={[styles.dobInput, styles.dobInputYear]}
            value={yyyy}
            onChangeText={handleYyyyChange}
            placeholder="YYYY"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
            editable={!loading}
          />
        </View>
        <Text style={styles.dobNote}>must be 18 or older. we check.</Text>
        {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}

        {/* General error */}
        {errors.general ? (
          <Text style={[styles.errorText, { marginTop: 8 }]}>{errors.general}</Text>
        ) : null}

        {/* Submit */}
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.accentFg} />
          ) : (
            <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
          )}
        </Pressable>

        {/* Footer */}
        <Text style={styles.footerText}>
          {'already a dreg? '}
          <Link href="/(auth)/sign-in" style={styles.footerLink}>
            sign in
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  wordmark: { alignItems: 'center', marginBottom: 40 },
  wordmarkTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  wordmarkSub: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  inputError: { borderColor: Colors.error },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  dobRowError: { borderColor: Colors.error },
  dobInput: {
    color: Colors.textPrimary,
    fontSize: 15,
    width: 32,
    padding: 0,
    textAlign: 'center',
  },
  dobInputYear: { width: 52 },
  dobSeparator: {
    color: Colors.textMuted,
    fontSize: 15,
    marginHorizontal: 6,
  },
  dobNote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 5,
    marginLeft: 2,
  },
  errorText: {
    color: Colors.error,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: Colors.accentFg,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: Colors.textMuted,
  },
  footerLink: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
