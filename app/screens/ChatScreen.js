import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

const SERVER_URL = 'http://192.168.1.202:5000';

function ChatScreen() {
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const socketRef = useRef(null);
  const readRef = useRef(new Set());
  const messagesRef = useRef(messages);
  const {
    recipientId,
    recipientImage,
    recipientName,
    isDeleted, // <--- passed from ChatsScreen
  } = useRoute().params;


  const navigation = useNavigation();

  const storageKey = useMemo(
    () => (userId ? `chat_${userId}_${recipientId}` : null),
    [userId, recipientId]
  );

  const mergeMessages = (incoming) => {
    setMessages((prev) => {
      const merged = [...prev, ...incoming].filter(
        (m, i, arr) =>
          i ===
          arr.findIndex((x) =>
            m._id && x._id ? m._id === x._id : m.timestamp === x.timestamp
          )
      );
      messagesRef.current = merged;
      if (storageKey) {
        AsyncStorage.setItem(storageKey, JSON.stringify(merged)).catch(() => {});
      }
      if (incoming.length > 0) {
        updateChatList(merged[merged.length - 1], true);
      }
      return merged;
    });
  };

  const updateChatList = async (latestMsg, insideChat = false) => {
    try {
      if (!userId) return;
      const key = `chat_list_${userId}`;
      const existing = await AsyncStorage.getItem(key);
      let chats = existing ? JSON.parse(existing) : [];

      const chatIndex = chats.findIndex((c) => c.recipientId === recipientId);

      if (chatIndex !== -1) {
        chats[chatIndex].latestMessage = latestMsg.message;
        chats[chatIndex].latestTimestamp = latestMsg.timestamp;

        if (!insideChat && latestMsg.from === recipientId && latestMsg.status !== 'read') {
          chats[chatIndex].unreadCount = (chats[chatIndex].unreadCount || 0) + 1;
        }

        if (insideChat) {
          chats[chatIndex].unreadCount = 0;
        }
      } else {
        chats.push({
          recipientId,
          recipientName,
          recipientImage,
          latestMessage: latestMsg.message,
          latestTimestamp: latestMsg.timestamp,
          unreadCount: insideChat ? 0 : (latestMsg.from === recipientId ? 1 : 0),
        });
      }

      chats.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
      await AsyncStorage.setItem(key, JSON.stringify(chats));
    } catch (err) {
      console.log('Failed to update chat list', err);
    }
  };

  const resetUnreadCount = async () => {
    try {
      const existing = await AsyncStorage.getItem(`chat_list_${userId}`);
      if (!existing) return;
      let chats = JSON.parse(existing);
      if (chats[recipientId]) {
        chats[recipientId].unreadCount = 0;
        await AsyncStorage.setItem(`chat_list_${userId}`, JSON.stringify(chats));
      }
    } catch (err) {
      console.log('Failed to reset unread', err);
    }
  };


  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem('user_id');
      const curr_user = await AsyncStorage.getItem('curr_user');
      setUserId(id);
      setUser(curr_user ? JSON.parse(curr_user) : null);
    })();
  }, []);

  useEffect(() => {
    if (recipientName) {
      navigation.setOptions({ title: recipientName }); // Set the dynamic title after data is loaded
    }
  }, [navigation, recipientName]);

  useEffect(() => {
    if (!storageKey) return;
    (async () => {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        messagesRef.current = parsed;
        setMessages(parsed);
      }
    })();
  }, [storageKey]);

  useEffect(() => {
    if (!userId || !storageKey) return;

    socketRef.current = io(SERVER_URL);
    socketRef.current.emit('register', userId);

    socketRef.current.on('receiveMessage', (msg) => mergeMessages([msg]));
    socketRef.current.on('messageRead', ({ messageId }) => {
      mergeMessages(
        messagesRef.current.map((m) =>
          m._id === messageId ? { ...m, status: 'read' } : m
        )
      );
    });

    fetch(`${SERVER_URL}/api/messages/fetchAndDelete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, recipientId }),
    })
      .then((r) => r.json())
      .then((queued) => queued.length && mergeMessages(queued))
      .catch(() => {});

    return () => socketRef.current?.disconnect();
  }, [userId, storageKey]);

  useEffect(() => {
    if (!socketRef.current || !userId) return;

    messages.forEach((m) => {
      if (m.to === userId && m.status !== 'read' && !readRef.current.has(m._id)) {
        socketRef.current.emit('markAsRead', { messageId: m._id });
        readRef.current.add(m._id);
        mergeMessages(
          messagesRef.current.map((x) =>
            x._id === m._id ? { ...x, status: 'read' } : x
          )
        );
      }
    });
  }, [messages, userId]);

  useFocusEffect(
    useCallback(() => {
      resetUnreadCount();
      return () => resetUnreadCount();
    }, [userId, recipientId])
  );

  const handleSend = () => {
    if (isDeleted || !msgInput.trim()) return;
    const newMsg = {
      from: userId,
      to: recipientId,
      message: msgInput.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    socketRef.current.emit('sendMessage', newMsg);
    mergeMessages([newMsg]);
    updateChatList(newMsg, true);
    setMsgInput('');
  };

  const renderItem = ({ item }) => {
    const own = item.from === userId;
    const avatar = own ? user?.profileImage : recipientImage;
    const statusTxt = own ? (item.status === 'read' ? 'read' : 'sent') : '';

    return (
      <View style={[styles.row, own && styles.rowRev]}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text>{item.message}</Text>
          <View style={styles.meta}>
            <Text style={styles.time}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
            {!!statusTxt && <Text style={styles.status}>{statusTxt}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {isDeleted && (
            <View style={styles.deletedBanner}>
              <Text style={styles.deletedText}>
                This user has deleted their account.
              </Text>
            </View>
          )}

          <FlatList
            data={messages}
            keyExtractor={(i) => i._id?.toString() ?? i.timestamp}
            renderItem={renderItem}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'flex-end',
              paddingBottom: 10,
            }}
            keyboardShouldPersistTaps="handled"
            inverted={false}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={msgInput}
              onChangeText={setMsgInput}
              placeholder="Type a message..."
              editable={!isDeleted}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                isDeleted && { backgroundColor: '#aaa' },
              ]}
              onPress={handleSend}
              disabled={isDeleted}
            >
              <Text style={{ color: '#fff' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#2e3b32',
  },
  row: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  rowRev: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleOwn: {
    backgroundColor: '#d0ebff',
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: {
    fontSize: 10,
    color: '#999',
  },
  status: {
    fontSize: 10,
    color: '#4a90e2',
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 25,
    backgroundColor: '#cddc39',
    borderTopWidth: 1,
    borderColor: '#cddc39',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#388e3c',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  deletedBanner: {
    backgroundColor: '#ffebee',
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  deletedText: {
    color: '#b71c1c',
    fontWeight: 'bold',
  },
});

export default ChatScreen;

