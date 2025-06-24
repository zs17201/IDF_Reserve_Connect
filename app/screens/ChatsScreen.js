import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Swipeable } from 'react-native-gesture-handler';

const SERVER_URL = 'http://192.168.1.202:5000';

function ChatsScreen() {
  const [chats, setChats] = useState([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    const getCurrentUserInfo = async () => {
      const storedUserId = await AsyncStorage.getItem('user_id');
      if (storedUserId) setUserId(storedUserId);
    };
    getCurrentUserInfo();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadChatsLocally = async () => {
      try {
        const storedChats = await AsyncStorage.getItem(`chat_list_${userId}`);
        if (storedChats) {
          const parsedChats = JSON.parse(storedChats);
          setChats(parsedChats);
          await updateRecipientProfiles(parsedChats);
        }
      } catch (err) {
        console.log('Failed to load chats locally', err);
      }
    };

    loadChatsLocally();
    fetchChatsFromServer();
    const focusListener = navigation.addListener('focus', fetchChatsFromServer);
    return focusListener;
  }, [navigation, userId]);

  const fetchChatsFromServer = async () => {
    setLoading(true);
    let sortedChats = [];

    try {
      const response = await axios.get(`${SERVER_URL}/api/messages/chats/${userId}`);
      if (response.data && Array.isArray(response.data)) {
        const newChats = response.data.map(chat => ({
          recipientId: chat.recipientId,
          recipientName: chat.recipientName,
          recipientImage: chat.recipientImage,
          latestMessage: chat.latestMessage,
          latestTimestamp: chat.latestTimestamp,
          unreadCount: chat.unreadCount,
        }));

        const existingChatsJSON = await AsyncStorage.getItem(`chat_list_${userId}`);
        let existingChats = [];
        if (existingChatsJSON) {
          existingChats = JSON.parse(existingChatsJSON);
        }

        const chatMap = {};
        existingChats.forEach(chat => {
          chatMap[chat.recipientId] = chat;
        });

        newChats.forEach(newChat => {
          const existingChat = chatMap[newChat.recipientId];
          if (existingChat) {
            chatMap[newChat.recipientId] = {
              ...existingChat,
              recipientImage: newChat.recipientImage,
              latestMessage: newChat.latestMessage,
              latestTimestamp: newChat.latestTimestamp,
              unreadCount: newChat.unreadCount,
            };
          } else {
            chatMap[newChat.recipientId] = newChat;
          }
        });

        const mergedChats = Object.values(chatMap);

        sortedChats = mergedChats.sort(
          (a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp)
        );

        if (sortedChats.length > 0) {
          setChats(sortedChats);
          await AsyncStorage.setItem(`chat_list_${userId}`, JSON.stringify(sortedChats));
          await updateRecipientProfiles(sortedChats);
        } else {
          setChats([]);
          await AsyncStorage.removeItem(`chat_list_${userId}`);
        }
      }
    } catch (err) {
      console.log('Failed to fetch chats from server', err);
    }

    setLoading(false);
  };

  const updateRecipientProfiles = async (currentChats) => {
    try {
      const recipientIds = currentChats.map(chat => chat.recipientId);
      const response = await axios.post(`${SERVER_URL}/api/auth/get-profile-images`, { recipientIds });
  
      if (response.data && Array.isArray(response.data)) {
        const profileMap = {};
        response.data.forEach(profile => {
          profileMap[profile._id] = {
            recipientImage: profile.profileImage,
            recipientName: profile.fullName,
          };
        });
  
        const updatedChats = currentChats.map(chat => {
          const profile = profileMap[chat.recipientId];
          const isDeleted = !profile;
  
          return {
            ...chat,
            recipientImage: isDeleted
              ? 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
              : profile.recipientImage,
            recipientName: isDeleted ? 'Deleted Account' : profile.recipientName,
            isDeleted: isDeleted,
          };
        });
  
        setChats(updatedChats);
        await AsyncStorage.setItem(`chat_list_${userId}`, JSON.stringify(updatedChats));
      }
    } catch (err) {
      console.log('Failed to update recipient profiles', err);
    }
  };
  

  const handleOpenChat = (chat) => {
    navigation.navigate('ChatScreen', {
      recipientId: chat.recipientId,
      recipientName: chat.recipientName,
      recipientImage: chat.recipientImage,
      isDeleted: chat.isDeleted || false,
    });
  };
  

  const handleDeleteChat = async (chat) => {
    Alert.alert(
      `Delete Chat with ${chat.recipientName}?`,
      'Are you sure you want to delete this conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              // Remove the specific chat from `chat_${userId}_${recipientId}`
              await AsyncStorage.removeItem(`chat_${userId}_${chat.recipientId}`);

              // Remove the chat from `chat_list_${userId}`
              const existingChatsJSON = await AsyncStorage.getItem(`chat_list_${userId}`);
              if (existingChatsJSON) {
                let chats = JSON.parse(existingChatsJSON);
                chats = chats.filter(c => c.recipientId !== chat.recipientId);
                await AsyncStorage.setItem(`chat_list_${userId}`, JSON.stringify(chats));
              }

              // Refresh the chats screen
              fetchChatsFromServer();  // This will reload the data from the server and update the local storage

              alert('Chat deleted successfully');
            } catch (err) {
              console.log('Failed to delete chat', err);
              alert('Failed to delete chat');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const renderRightActions = () => (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteChat(item)}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );

    return (
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity onPress={() => handleOpenChat(item)} style={styles.chatRow}>
          <Image source={{ uri: item.recipientImage }} style={styles.avatar} />
          <View style={styles.textContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.recipientName}</Text>
              <Text style={styles.time}>
              {new Date(item.latestTimestamp).toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </Text>
            </View>
            <View style={styles.messageRow}>
              <Text style={styles.message} numberOfLines={1}>
                {item.latestMessage}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const filteredChats = chats.filter(chat =>
  chat.recipientName && chat.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search by name..."
        value={searchQuery}
        onChangeText={handleSearchChange}
      />
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.recipientId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchChatsFromServer} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#2e3b32',
    },
    searchBar: {
      height: 44,
      margin: 16,
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 24,
      paddingLeft: 16,
      fontSize: 16,
      backgroundColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    chatRow: {
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#444',
      alignItems: 'center',
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 15,
     
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    time: {
      fontSize: 12,
      color: '#bbb',
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    message: {
      flex: 1,
      color: '#dcdcdc',
      fontSize: 15,
    },
    unreadBadge: {
      backgroundColor: '#2196f3',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginLeft: 6,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    deleteButton: {
      backgroundColor: '#e53935',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: 45,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    deleteText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
  });
  

export default ChatsScreen;






// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import { Swipeable } from 'react-native-gesture-handler';

// const SERVER_URL = 'http://192.168.1.16:5000';

// function ChatsScreen() {
//   const [chats, setChats] = useState([]);
//   const [userId, setUserId] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const navigation = useNavigation();

//   useEffect(() => {
//     const getCurrentUserInfo = async () => {
//       const storedUserId = await AsyncStorage.getItem('user_id');
//       if (storedUserId) setUserId(storedUserId);
//     };
//     getCurrentUserInfo();
//   }, []);

//   useEffect(() => {
//     if (!userId) return;

//     const loadChatsLocally = async () => {
//       try {
//         const storedChats = await AsyncStorage.getItem(`chat_list_${userId}`);
//         if (storedChats) {
//           const parsedChats = JSON.parse(storedChats);
//           setChats(parsedChats);
//           await updateRecipientProfiles(parsedChats);
//         }
//       } catch (err) {
//         console.log('Failed to load chats locally', err);
//       }
//     };

//     loadChatsLocally();

//     const focusListener = navigation.addListener('focus', fetchChatsFromServer);
//     return focusListener;
//   }, [navigation, userId]);

//   const fetchChatsFromServer = async () => {
//     setLoading(true);
//     let sortedChats = [];

//     try {
//       const response = await axios.get(`${SERVER_URL}/api/messages/chats/${userId}`);
//       if (response.data && Array.isArray(response.data)) {
//         const newChats = response.data.map(chat => ({
//           recipientId: chat.recipientId,
//           recipientName: chat.recipientName,
//           recipientImage: chat.recipientImage,
//           latestMessage: chat.latestMessage,
//           latestTimestamp: chat.latestTimestamp,
//           unreadCount: chat.unreadCount,
//         }));

//         const existingChatsJSON = await AsyncStorage.getItem(`chat_list_${userId}`);
//         let existingChats = [];
//         if (existingChatsJSON) {
//           existingChats = JSON.parse(existingChatsJSON);
//         }

//         const chatMap = {};
//         existingChats.forEach(chat => {
//           chatMap[chat.recipientId] = chat;
//         });

//         newChats.forEach(newChat => {
//           const existingChat = chatMap[newChat.recipientId];
//           if (existingChat) {
//             chatMap[newChat.recipientId] = {
//               ...existingChat,
//               recipientImage: newChat.recipientImage,
//               latestMessage: newChat.latestMessage,
//               latestTimestamp: newChat.latestTimestamp,
//               unreadCount: newChat.unreadCount,
//             };
//           } else {
//             chatMap[newChat.recipientId] = newChat;
//           }
//         });

//         const mergedChats = Object.values(chatMap);

//         sortedChats = mergedChats.sort(
//           (a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp)
//         );

//         if (sortedChats.length > 0) {
//           setChats(sortedChats);
//           await AsyncStorage.setItem(`chat_list_${userId}`, JSON.stringify(sortedChats));
//           await updateRecipientProfiles(sortedChats);
//         } else {
//           setChats([]);
//           await AsyncStorage.removeItem(`chat_list_${userId}`);
//         }
//       }
//     } catch (err) {
//       console.log('Failed to fetch chats from server', err);
//     }

//     setLoading(false);
//   };

//   const updateRecipientProfiles = async (currentChats) => {
//     try {
//       const recipientIds = currentChats.map(chat => chat.recipientId);
//       const response = await axios.post(`${SERVER_URL}/api/auth/get-profile-images`, { recipientIds });
//       if (response.data && Array.isArray(response.data)) {
//         const profileMap = {};
//         response.data.forEach(profile => {
//           profileMap[profile._id] = {
//             recipientImage: profile.profileImage,
//             recipientName: profile.fullName,
//           };
//         });

//         const updatedChats = currentChats.map(chat => ({
//           ...chat,
//           recipientImage: profileMap[chat.recipientId]?.recipientImage || chat.recipientImage,
//           recipientName: profileMap[chat.recipientId]?.recipientName || chat.recipientName,
//         }));

//         setChats(updatedChats);
//         await AsyncStorage.setItem(`chat_list_${userId}`, JSON.stringify(updatedChats));
//       }
//     } catch (err) {
//       console.log('Failed to update recipient profiles', err);
//     }
//   };

//   const handleOpenChat = (chat) => {
//     navigation.navigate('ChatScreen', {
//       recipientId: chat.recipientId,
//       recipientName: chat.recipientName,
//       recipientImage: chat.recipientImage,
//     });
//   };

//   const handleDeleteChat = async (chat) => {
//     Alert.alert(
//       `Delete Chat with ${chat.recipientName}?`,
//       'Are you sure you want to delete this conversation?',
//       [
//         {
//           text: 'Cancel',
//           style: 'cancel',
//         },
//         {
//           text: 'Delete',
//           onPress: async () => {
//             try {
//               // Remove the specific chat from `chat_${userId}_${recipientId}`
//               await AsyncStorage.removeItem(`chat_${userId}_${chat.recipientId}`);

//               // Remove the chat from `chat_list_${userId}`
//               const existingChatsJSON = await AsyncStorage.getItem(`chat_list_${userId}`);
//               if (existingChatsJSON) {
//                 let chats = JSON.parse(existingChatsJSON);
//                 chats = chats.filter(c => c.recipientId !== chat.recipientId);
//                 await AsyncStorage.setItem(`chat_list_${userId}`, JSON.stringify(chats));
//               }

//               // Refresh the chats screen
//               fetchChatsFromServer();  // This will reload the data from the server and update the local storage

//               alert('Chat deleted successfully');
//             } catch (err) {
//               console.log('Failed to delete chat', err);
//               alert('Failed to delete chat');
//             }
//           },
//         },
//       ]
//     );
//   };

//   const renderItem = ({ item }) => {
//     const renderRightActions = () => (
//       <TouchableOpacity
//         style={styles.deleteButton}
//         onPress={() => handleDeleteChat(item)}
//       >
//         <Text style={styles.deleteText}>Delete</Text>
//       </TouchableOpacity>
//     );

//     return (
//       <Swipeable renderRightActions={renderRightActions}>
//         <TouchableOpacity onPress={() => handleOpenChat(item)} style={styles.chatRow}>
//           <Image source={{ uri: item.recipientImage }} style={styles.avatar} />
//           <View style={styles.textContainer}>
//             <View style={styles.nameRow}>
//               <Text style={styles.name}>{item.recipientName}</Text>
//               <Text style={styles.time}>
//                 {new Date(item.latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//               </Text>
//             </View>
//             <View style={styles.messageRow}>
//               <Text style={styles.message} numberOfLines={1}>
//                 {item.latestMessage}
//               </Text>
//               {item.unreadCount > 0 && (
//                 <View style={styles.unreadBadge}>
//                   <Text style={styles.unreadText}>{item.unreadCount}</Text>
//                 </View>
//               )}
//             </View>
//           </View>
//         </TouchableOpacity>
//       </Swipeable>
//     );
//   };

//   const handleSearchChange = (text) => {
//     setSearchQuery(text);
//   };

//   const filteredChats = chats.filter(chat =>
//   chat.recipientName && chat.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
// );

//   return (
//     <View style={styles.container}>
//       {/* Search bar */}
//       <TextInput
//         style={styles.searchBar}
//         placeholder="Search by name..."
//         value={searchQuery}
//         onChangeText={handleSearchChange}
//       />
//       <FlatList
//         data={filteredChats}
//         keyExtractor={(item) => item.recipientId}
//         renderItem={renderItem}
//         contentContainerStyle={{ paddingBottom: 20 }}
//         refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchChatsFromServer} />}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#2e3b32',
//     },
//     searchBar: {
//       height: 44,
//       margin: 16,
//       borderColor: '#ccc',
//       borderWidth: 1,
//       borderRadius: 24,
//       paddingLeft: 16,
//       fontSize: 16,
//       backgroundColor: '#fff',
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 3,
//     },
//     chatRow: {
//       flexDirection: 'row',
//       paddingVertical: 16,
//       paddingHorizontal: 20,
//       borderBottomWidth: 1,
//       borderBottomColor: '#444',
//       alignItems: 'center',
//     },
//     avatar: {
//       width: 60,
//       height: 60,
//       borderRadius: 30,
//       marginRight: 15,
     
//     },
//     textContainer: {
//       flex: 1,
//       justifyContent: 'center',
//     },
//     nameRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 4,
//     },
//     name: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#ffffff',
//     },
//     time: {
//       fontSize: 12,
//       color: '#bbb',
//     },
//     messageRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     message: {
//       flex: 1,
//       color: '#dcdcdc',
//       fontSize: 15,
//     },
//     unreadBadge: {
//       backgroundColor: '#2196f3',
//       borderRadius: 12,
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       marginLeft: 6,
//       minWidth: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     unreadText: {
//       color: '#fff',
//       fontSize: 12,
//       fontWeight: 'bold',
//     },
//     deleteButton: {
//       backgroundColor: '#e53935',
//       justifyContent: 'center',
//       alignItems: 'center',
//       width: 80,
//       height: 45,
//       borderRadius: 12,
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 6,
//       elevation: 4,
//     },
//     deleteText: {
//       color: '#fff',
//       fontWeight: '600',
//       fontSize: 14,
//     },
//   });
  

// export default ChatsScreen;

