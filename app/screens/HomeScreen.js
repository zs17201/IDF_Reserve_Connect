import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, Alert } from 'react-native';
import { Card, Text, Button, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = () => {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [userLoaded, setUserLoaded] = useState(false);

  const navigation = useNavigation();

  const SERVER_URL = 'http://192.168.1.202:5000'

  useEffect(() => {
    const getCurrentUserInfo = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('user_id');
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (err) {
        console.error('Failed to get user_id:', err);
      } finally {
        setUserLoaded(true);
      }
    };

    getCurrentUserInfo();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
  
      const postsResponse = await fetch(`${SERVER_URL}/api/posts`);
      const postsData = await postsResponse.json();
  
      const userImageCache = {}; // to avoid duplicate fetches
  
      const postsWithProfile = await Promise.all(
        postsData.map(async (post) => {
          let profileImage = null;

          if (userImageCache[post.user_id]) {
            profileImage = userImageCache[post.user_id]; // re-use if already fetched
          } else {
            try {
              const userResponse = await fetch(
                `${SERVER_URL}/api/auth/id/${post.user_id}`
              );
              const userData = await userResponse.json();
              profileImage = userData.profileImage;
              userImageCache[post.user_id] = profileImage;
            } catch (err) {
              console.warn(`Failed to fetch user for ID: ${post.user_id}`);
            }
          }
  
          return {
            ...post,
            profileImage,
          };
        })
      );
  
      setPosts(postsWithProfile.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setFilteredPosts(postsWithProfile.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };
  
  

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredPosts(posts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = posts.filter(
        (post) =>
          post.text.toLowerCase().includes(query) ||
          post.email.toLowerCase().includes(query) ||
          post.unit?.toLowerCase().includes(query) ||
          post.proficiency?.toLowerCase().includes(query)
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  const handleDeletePost = (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const response = await fetch(`${SERVER_URL}/api/posts/${postId}`, {
                method: 'DELETE',
              });
  
              if (response.ok) {
                fetchPosts();
                Alert.alert('Post deleted successfully');
              } else {
                Alert.alert('Failed to delete post');
              }
            } catch (err) {
              console.error('Error deleting post:', err);
              Alert.alert('An error occurred while deleting the post.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };
  

  const renderPost = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('PostDetails', { postId: item._id })}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}>
              <Image
                source={{ uri: item.profileImage }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <Text style={styles.emailTitle}>{item.fullName}</Text>

            {item.user_id === userId && (
              <TouchableOpacity onPress={() => handleDeletePost(item._id)} style={{ marginRight: 12 }}>
                <MaterialIcons name="delete" size={22} color="red" />
              </TouchableOpacity>
            )}
          </View>
  
          <View style={styles.postInfoRow}>
            <Text style={styles.label}>Unit:</Text>
            <Text style={styles.value}>{item.unit}</Text>
          </View>
  
          <View style={styles.postInfoRow}>
            <Text style={styles.label}>Proficiency:</Text>
            <Text style={styles.value}>{item.proficiency}</Text>
          </View>
  
          <View style={styles.postInfoRow}>
            <Text style={styles.label}>Details:</Text>
            <Text style={styles.value}>{item.text}</Text>
          </View>
  
          <Text style={styles.postDate}>
            Posted on {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
  
  
  

  return (
    <View style={{ flex: 1 ,backgroundColor: '#2e3b32',}}>
      <Searchbar
        placeholder="Search posts..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        contentContainerStyle={styles.container}
        refreshing={loading}
        onRefresh={fetchPosts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  searchbar: {
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
      justifyContent: 'center',
  },
  card: {
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    elevation: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#d9d9d9',
  },
  postInfoRow: {
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    fontSize: 15,
    color: '#2e7d32',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: '#37474f',
  },
  postDate: {
    fontSize: 13,
    color: '#757575',
    marginTop: 12,
    alignSelf: 'flex-end',
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emailTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 14,
    color: '#1b5e20',
    flexShrink: 1,
  },
});



export default HomeScreen;
