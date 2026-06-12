import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useMyProfileId } from '@/hooks/useMyProfileId';
import { fetchMessages, markMatchRead, sendMessage, type Message } from '@/lib/matches';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const profileId = useMyProfileId();

  const [otherName, setOtherName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Load other person's name
  useEffect(() => {
    if (!matchId || !profileId) return;
    (async () => {
      const { data: match } = await supabase
        .from('matches')
        .select('user_a_id, user_b_id')
        .eq('id', matchId)
        .single();
      if (!match) return;
      const otherProfileId = (match as any).user_a_id === profileId
        ? (match as any).user_b_id
        : (match as any).user_a_id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', otherProfileId)
        .single();
      if (profile) setOtherName((profile as any).display_name ?? '');
    })().catch(err => console.error('load match name error:', err));
  }, [matchId, profileId]);

  // Mark this match as read when the chat opens
  useEffect(() => {
    if (!matchId || !profileId) return;
    markMatchRead(matchId, profileId).catch(err =>
      console.warn('markMatchRead error:', err),
    );
  }, [matchId, profileId]);

  // Load initial messages
  useEffect(() => {
    if (!matchId) { setLoading(false); return; }
    fetchMessages(matchId)
      .then(setMessages)
      .catch(err => console.error('fetchMessages error:', err))
      .finally(() => setLoading(false));
  }, [matchId]);

  // Realtime subscription
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        payload => {
          const m = payload.new as any;
          const newMsg: Message = {
            id: m.id,
            matchId: m.match_id,
            senderId: m.sender_id,
            body: m.body,
            messageType: m.message_type,
            sentAt: m.sent_at,
          };
          setMessages(prev => {
            if (prev.some(existing => existing.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  async function handleSend() {
    if (!inputText.trim() || !profileId || !matchId) return;
    const body = inputText.trim();
    setInputText('');
    setSending(true);

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      matchId,
      senderId: profileId,
      body,
      messageType: 'text',
      sentAt: new Date().toISOString(),
    };
    setMessages(prev => [optimistic, ...prev]);

    try {
      const saved = await sendMessage({ matchId, senderId: profileId, body });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } catch (err) {
      console.error('sendMessage error:', err);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: otherName || '...', headerBackTitle: 'matches' }} />
        <ActivityIndicator color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{
        title: otherName,
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { color: Colors.textPrimary },
        headerBackTitle: 'matches',
      }} />

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isViewer = item.senderId === profileId;
          return (
            <View style={[styles.bubbleRow, isViewer ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
              <View style={[styles.bubble, isViewer ? styles.bubbleViewer : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isViewer ? styles.bubbleTextViewer : styles.bubbleTextOther]}>
                  {item.body ?? '(unsupported message)'}
                </Text>
                <Text style={[styles.bubbleTime, isViewer ? styles.bubbleTimeViewer : styles.bubbleTimeOther]}>
                  {formatTime(item.sentAt)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>no messages yet. say something terrible.</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="say something terrible"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color={Colors.accentFg} />
            : <Text style={styles.sendButtonText}>send</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12 },
  bubbleRow: { marginBottom: 8, flexDirection: 'row' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleViewer: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextViewer: { color: Colors.accentFg },
  bubbleTextOther: { color: Colors.textPrimary },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  bubbleTimeViewer: { color: Colors.accentFg, opacity: 0.6, textAlign: 'right' },
  bubbleTimeOther: { color: Colors.textMuted },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: Colors.accentFg, fontWeight: '600', fontSize: 14 },
});
