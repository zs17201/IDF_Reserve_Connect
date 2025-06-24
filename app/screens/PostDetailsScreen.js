import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Divider
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';

const SERVER_URL = 'http://192.168.1.202:5000';

const PostDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { postId } = route.params;

  const [post, setPost] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoaded, setUserLoaded] = useState(false);
  const [userId, setUserId] = useState('');
  const [commentImage, setCommentImage] = useState(null);

  useEffect(() => {
    const getCurrentUserInfo = async () => {
      const storedUserId = await AsyncStorage.getItem('user_id');
      if (storedUserId) setUserId(storedUserId);
      setUserLoaded(true);
    };
    getCurrentUserInfo();
  }, []);

  const fetchPostDetails = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/posts/${postId}/details`);
      const data = await res.json();
      setPost(data.post);
      setComments(data.comments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, []);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`${SERVER_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          userId,
          text: newComment,
          image: commentImage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [
          ...prev,
          {
            _id: data.comment?._id || Date.now().toString(),
            userName: 'You',
            userImage: null,
            userId,
            text: newComment,
            image: commentImage,
          },
        ]);
        setNewComment('');
        setCommentImage(null);
        fetchPostDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const base64 = result.assets[0].base64;
      setCommentImage(`data:image/jpeg;base64,${base64}`);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await fetch(`${SERVER_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      setComments((prev) => prev.filter((comment) => comment._id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  const renderCommentItem = ({ item }) => {
    const isMyComment = item.userId === userId;

    return (
      <View style={styles.commentItem}>
        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}>
          <Image source={{ uri: item.userImage }} style={styles.commentAvatar} />
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.commentAuthor}>
              {isMyComment ? 'You' : item.userName}
            </Text>
            {isMyComment && (
              <TouchableOpacity onPress={() => handleDeleteComment(item._id)}>
                <Feather name="trash-2" size={20} color="red" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.commentImage} />
          )}
        </View>
      </View>
    );
  };

  if (loading || !post || !userLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[{ flex: 1 }, styles.container]}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Post Card */}
            <Card style={styles.postCard}>
              <Card.Content>
                <View style={styles.postHeader}>
                  {post.authorImage && (
                    <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: post.user_id })}>
                      <Image source={{ uri: post.authorImage }} style={styles.avatarLarge} />
                    </TouchableOpacity>
                  )}
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.authorName}>{post.authorName}</Text>
                    <Text style={styles.authorEmail}>{post.authorEmail}</Text>
                  </View>
                </View>
  
                <Divider style={{ marginVertical: 10 }} />
  
                <View style={styles.postMeta}>
                  <Text style={styles.metaLabel}>Looking For:</Text>
                  <Text style={styles.metaValue}>{post.proficiency}</Text>
                </View>
  
                <View style={styles.postMeta}>
                  <Text style={styles.metaLabel}>Unit:</Text>
                  <Text style={styles.metaValue}>{post.unit}</Text>
                </View>
  
                <View style={styles.postDetails}>
                  <Text style={styles.postText}>{post.text}</Text>
                </View>
  
                <Text style={styles.postDate}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </Text>
              </Card.Content>
            </Card>
  
            {/* Comments Section */}
            <Text style={styles.commentsHeader}>Comments</Text>
            {comments.map((item) => (
              <React.Fragment key={item._id}>{renderCommentItem({ item })}</React.Fragment>
            ))}
          </ScrollView>
  
          {/* Comment Input Section */}
          <View style={styles.commentInputWrapper}>
            <View style={styles.commentRow}>
              <TextInput
                style={styles.input}
                placeholder="Write a comment..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
                <Feather name="image" size={24} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={handlePostComment}>
                <Text style={{ color: '#fff' }}>Send</Text>
              </TouchableOpacity>
            </View>
  
            {commentImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: commentImage }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setCommentImage(null)}
                >
                  <Text style={{ color: 'white', fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
  
  
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e3b32',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    elevation: 5,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ccc',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1b5e20',
  },
  authorEmail: {
    fontSize: 14,
    color: '#4e4e4e',
    marginTop: 2,
  },
  postMeta: {
    flexDirection: 'row',
    marginTop: 8,
  },
  metaLabel: {
    fontWeight: '600',
    color: '#2e7d32',
    width: 100,
    marginBottom: 2,
  },
  metaValue: {
    flex: 1,
    color: '#37474f',
    fontSize: 15,
  },
  postDetails: {
    marginTop: 10,
  },
  postText: {
    fontSize: 17,
    marginTop: 10,
    lineHeight: 24,
    color: '#37474f',
  },
  postDate: {
    fontSize: 13,
    color: '#757575',
    marginTop: 12,
    alignSelf: 'flex-end',
    fontStyle: 'italic',
  },
  commentsHeader: {
    marginTop: 16,
    marginLeft: 18,
    fontWeight: '600',
    fontSize: 20,
    color: '#2e7d32',
  },
  commentItem: {
    backgroundColor: '#e8f5e9',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    elevation: 3,
  },
  commentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    marginTop: 5,
    backgroundColor: '#d9d9d9',
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 15,
    color: '#2e7d32',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#37474f',
    marginBottom: 5,
  },
  commentImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 5,
  },
  commentInputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#cddc39',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#cfd8dc',
    elevation: 10,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f8e9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c5e1a5',
  },
  attachButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sendButton: {
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
  imagePreviewContainer: {
    marginTop: 8,
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
});

export default PostDetailsScreen;



// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   StyleSheet,
//   Image,
//   TextInput,
//   FlatList,
//   KeyboardAvoidingView,
//   Platform,
//   Keyboard,
//   TouchableWithoutFeedback
// } from 'react-native';
// import {
//   Text,
//   Button,
//   Card,
//   ActivityIndicator,
//   Divider
// } from 'react-native-paper';
// import { useRoute, useNavigation } from '@react-navigation/native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as ImagePicker from 'expo-image-picker';
// import { TouchableOpacity } from 'react-native-gesture-handler';
// import { Feather } from '@expo/vector-icons';

// const SERVER_URL = 'http://192.168.1.16:5000';

// const PostDetailsScreen = () => {
//   const route = useRoute();
//   const navigation = useNavigation();
//   const { postId } = route.params;

//   const [post, setPost] = useState(null);
//   const [newComment, setNewComment] = useState('');
//   const [comments, setComments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [userLoaded, setUserLoaded] = useState(false);
//   const [userId, setUserId] = useState('');
//   const [commentImage, setCommentImage] = useState(null);

//   useEffect(() => {
//     const getCurrentUserInfo = async () => {
//       const storedUserId = await AsyncStorage.getItem('user_id');
//       if (storedUserId) setUserId(storedUserId);
//       setUserLoaded(true);
//     };
//     getCurrentUserInfo();
//   }, []);

//   const fetchPostDetails = async () => {
//     try {
//       const res = await fetch(`${SERVER_URL}/api/posts/${postId}/details`);
//       const data = await res.json();
//       setPost(data.post);
//       setComments(data.comments);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchPostDetails();
//   }, []);

//   const handlePostComment = async () => {
//     if (!newComment.trim()) return;

//     try {
//       const res = await fetch(`${SERVER_URL}/api/comments`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           postId,
//           userId,
//           text: newComment,
//           image: commentImage,
//         }),
//       });

//       if (res.ok) {
//         const data = await res.json();
//         setComments((prev) => [
//           ...prev,
//           {
//             _id: data.comment?._id || Date.now().toString(),
//             userName: 'You',
//             userImage: null,
//             userId,
//             text: newComment,
//             image: commentImage,
//           },
//         ]);
//         setNewComment('');
//         setCommentImage(null);
//         fetchPostDetails();
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const pickImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       base64: true,
//       quality: 0.7,
//     });

//     if (!result.canceled) {
//       const base64 = result.assets[0].base64;
//       setCommentImage(`data:image/jpeg;base64,${base64}`);
//     }
//   };

//   const handleDeleteComment = async (commentId) => {
//     try {
//       await fetch(`${SERVER_URL}/api/comments/${commentId}`, {
//         method: 'DELETE',
//       });

//       setComments((prev) => prev.filter((comment) => comment._id !== commentId));
//     } catch (err) {
//       console.error('Failed to delete comment', err);
//     }
//   };

//   const renderCommentItem = ({ item }) => {
//     const isMyComment = item.userId === userId;

//     return (
//       <View style={styles.commentItem}>
//         <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}>
//           <Image source={{ uri: item.userImage }} style={styles.commentAvatar} />
//         </TouchableOpacity>
//         <View style={styles.commentContent}>
//           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
//             <Text style={styles.commentAuthor}>
//               {isMyComment ? 'You' : item.userName}
//             </Text>
//             {isMyComment && (
//               <TouchableOpacity onPress={() => handleDeleteComment(item._id)}>
//                 <Feather name="trash-2" size={20} color="red" />
//               </TouchableOpacity>
//             )}
//           </View>
//           <Text style={styles.commentText}>{item.text}</Text>
//           {item.image && (
//             <Image source={{ uri: item.image }} style={styles.commentImage} />
//           )}
//         </View>
//       </View>
//     );
//   };

//   if (loading || !post || !userLoaded) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//       keyboardVerticalOffset={90}
//     >
//       <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//         <View style={styles.container}>
//           <FlatList
//             ListHeaderComponent={
//               <>
//                 <Card style={styles.postCard}>
//                   <Card.Content>
//                     <View style={styles.postHeader}>
//                       {post.authorImage && (
//                         <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: post.user_id })}>
//                           <Image source={{ uri: post.authorImage }} style={styles.avatarLarge} />
//                         </TouchableOpacity>
//                       )}
//                       <View style={{ marginLeft: 10, flex: 1 }}>
//                         <Text style={styles.authorName}>{post.authorName}</Text>
//                         <Text style={styles.authorEmail}>{post.authorEmail}</Text>
//                       </View>
//                     </View>

//                     <Divider style={{ marginVertical: 10 }} />

//                     <View style={styles.postMeta}>
//                       <Text style={styles.metaLabel}>Looking For:</Text>
//                       <Text style={styles.metaValue}>{post.proficiency}</Text>
//                     </View>

//                     <View style={styles.postMeta}>
//                       <Text style={styles.metaLabel}>Unit:</Text>
//                       <Text style={styles.metaValue}>{post.unit}</Text>
//                     </View>

//                     <View style={styles.postDetails}>
//                       <Text style={styles.postText}>{post.text}</Text>
//                     </View>

//                     <Text style={styles.postDate}>
//                       {new Date(post.createdAt).toLocaleDateString()}
//                     </Text>
//                   </Card.Content>
//                 </Card>

//                 <Text style={styles.commentsHeader}>Comments</Text>
//               </>
//             }
//             data={comments}
//             keyExtractor={(item) => item._id}
//             renderItem={renderCommentItem}
//             contentContainerStyle={{ paddingBottom: 180 }}
//             keyboardShouldPersistTaps="handled"
//           />

//           <View style={styles.commentInputWrapper}>
//             <View style={styles.commentRow}>
//               <TextInput
//                 style={styles.input}
//                 placeholder="Write a comment..."
//                 value={newComment}
//                 onChangeText={setNewComment}
//                 multiline
//               />
//               <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
//                 <Feather name="image" size={24} color="#555" />
//               </TouchableOpacity>
//               <TouchableOpacity style={styles.sendButton} onPress={handlePostComment}>
//                 <Text style={{ color: '#fff' }}>Send</Text>
//               </TouchableOpacity>
//             </View>

//             {commentImage && (
//               <View style={styles.imagePreviewContainer}>
//                 <Image source={{ uri: commentImage }} style={styles.imagePreview} />
//                 <TouchableOpacity
//                   style={styles.removeImageButton}
//                   onPress={() => setCommentImage(null)}
//                 >
//                   <Text style={{ color: 'white', fontSize: 12 }}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         </View>
//       </TouchableWithoutFeedback>
//     </KeyboardAvoidingView>
//   );
// };

// const styles = StyleSheet.create({
//   // Same as your existing styles...
//   container: {
//     flex: 1,
//     backgroundColor: '#2e3b32',
//     padding: 16,
//   },
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   postCard: {
//     marginBottom: 18,
//     borderRadius: 20,
//     backgroundColor: '#e8f5e9',
//     elevation: 5,
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//   },
//   avatarLarge: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#ccc',
//   },
//   postHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   authorName: {
//     fontSize: 17,
//     fontWeight: '600',
//     color: '#1b5e20',
//   },
//   authorEmail: {
//     fontSize: 14,
//     color: '#4e4e4e',
//     marginTop: 2,
//   },
//   postMeta: {
//     flexDirection: 'row',
//     marginTop: 8,
//   },
//   metaLabel: {
//     fontWeight: '600',
//     color: '#2e7d32',
//     width: 100,
//     marginBottom: 2,
//   },
//   metaValue: {
//     flex: 1,
//     color: '#37474f',
//     fontSize: 15,
//   },
//   postDetails: {
//     marginTop: 10,
//   },
//   postText: {
//     fontSize: 17,
//     marginTop: 10,
//     lineHeight: 24,
//     color: '#37474f',
//   },
//   postDate: {
//     fontSize: 13,
//     color: '#757575',
//     marginTop: 12,
//     alignSelf: 'flex-end',
//     fontStyle: 'italic',
//   },
//   commentsHeader: {
//     marginTop: 16,
//     marginLeft: 18,
//     fontWeight: '600',
//     fontSize: 20,
//     color: '#2e7d32',
//   },
//   commentItem: {
//     backgroundColor: '#e8f5e9',
//     marginHorizontal: 16,
//     marginVertical: 8,
//     borderRadius: 16,
//     padding: 12,
//     flexDirection: 'row',
//     elevation: 3,
//   },
//   commentAvatar: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     marginRight: 12,
//     marginTop: 5,
//     backgroundColor: '#d9d9d9',
//   },
//   commentContent: {
//     flex: 1,
//   },
//   commentAuthor: {
//     fontWeight: '600',
//     fontSize: 15,
//     color: '#2e7d32',
//     marginBottom: 2,
//   },
//   commentText: {
//     fontSize: 14,
//     color: '#37474f',
//     marginBottom: 5,
//   },
//   commentImage: {
//     width: '100%',
//     height: 180,
//     borderRadius: 10,
//     marginTop: 5,
//   },
//   commentInputWrapper: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     backgroundColor: '#cddc39',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderTopWidth: 1,
//     borderColor: '#cfd8dc',
//     elevation: 10,
//   },
//   commentRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     justifyContent: 'space-between',
//   },
//   input: {
//     flex: 1,
//     backgroundColor: '#f1f8e9',
//     borderRadius: 14,
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//     fontSize: 14,
//     maxHeight: 100,
//     marginRight: 8,
//     borderWidth: 1,
//     borderColor: '#c5e1a5',
//   },
//   attachButton: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 8,
//   },
//   sendButton: {
//     backgroundColor: '#388e3c',
//     borderRadius: 25,
//     paddingVertical: 10,
//     paddingHorizontal: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   imagePreviewContainer: {
//     marginTop: 8,
//     position: 'relative',
//     width: 120,
//     height: 120,
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   imagePreview: {
//     width: '100%',
//     height: '100%',
//     borderRadius: 12,
//   },
//   removeImageButton: {
//     position: 'absolute',
//     bottom: 6,
//     right: 6,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     paddingVertical: 3,
//     paddingHorizontal: 7,
//     borderRadius: 8,
//   },
// });

// export default PostDetailsScreen;

