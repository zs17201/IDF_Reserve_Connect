import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';


const SERVER_URL = 'http://192.168.1.202:5000'


const AddPostScreen = ({ navigation }) => {
  const [newPostText, setNewPostText] = useState('');
  const [unit, setUnit] = useState('');
  const [proficiency, setProficiency] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);


  // Get user email from AsyncStorage or your auth context

  useEffect(() => {
    const getCurrentUserInfo = async () => {
      try {
        const userJson = await AsyncStorage.getItem('curr_user');
        const storedUserId = await AsyncStorage.getItem('user_id');

        if (userJson && storedUserId) {
          const user = JSON.parse(userJson);
          setEmail(user.email);
          setUserId(storedUserId);
        }
      } catch (err) {
        console.error('Failed to get user info:', err);
      } finally {
        setUserLoaded(true);
      }
    };

    getCurrentUserInfo();
  }, []);
  
  
  

  const handleAddPost = async () => {
    if (!email || !newPostText.trim() || !userId) {
      setError("Email or post content is missing or user ID is missing.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/api/posts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          text: newPostText,
          unit,
          proficiency,
          user_id: userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewPostText('');
        setUnit('');
        setProficiency('');
        alert('Post added successfully!');
        navigation.goBack();
      } else {
        throw new Error(data.message || 'Failed to add post');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a New Post</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput
        label="What’s on your mind?"
        value={newPostText}
        onChangeText={setNewPostText}
        mode="outlined"
        multiline
        style={styles.input}
      />

      <TextInput
        label="Unit"
        value={unit}
        onChangeText={setUnit}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Proficiency"
        value={proficiency}
        onChangeText={setProficiency}
        mode="outlined"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleAddPost}
        style={styles.button}
        loading={loading}
        disabled={loading}
      >
        Add Post
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
    backgroundColor: '#2e3b32', // dark green background like HomeScreen
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#cddc39', // lime green accent
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#e8f5e9', // light green input background
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#37474f', // dark text
  },
  button: {
    marginTop: 8,
    backgroundColor: '#388e3c', // dark green button
    borderRadius: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#ff5252',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
});


export default AddPostScreen;
