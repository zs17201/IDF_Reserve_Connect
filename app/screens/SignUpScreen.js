import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import IDFLogo from '../Images/IDF_logo.png';
import userImage from '../Images/profile_image.jpg';

const SERVER_URL = 'http://192.168.1.202:5000';

const getBase64Image = async (uri) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
};

const SignUpScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    proficiency: '',
    unit: '',
    rank: '',
    age: '',
    militaryId: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState(null);

  useEffect(() => {
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const base64Image = result.assets[0].base64;
      setImage(`data:image/jpeg;base64,${base64Image}`);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const base64Image = await getBase64Image(result.assets[0].uri);
      setImage(base64Image);
    }
  };

  const handleSignUp = async () => {
    const { email, password, confirmPassword, fullName, proficiency, unit, rank, age, militaryId } = formData;

    if (!isValidEmail(email)){
      Alert.alert('Email is invalid');
      return;
    }

    if (!password || !confirmPassword || !fullName || !proficiency || !unit || !rank || !age || !militaryId) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if(! image){
      Alert.alert('image profile is required');
      return;
    }

  
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          proficiency,
          unit,
          rank,
          age,
          militaryId,
          profileImage: image,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Account created successfully!');
        navigation.replace('Login');
      } else {
        throw new Error(data.message || 'Signup failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={IDFLogo}
          style={styles.logo}
        />
        <Text style={styles.title}>Military Connect</Text>
      </View>

      <View style={styles.formContainer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          label="Email"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Password"
          value={formData.password}
          onChangeText={(value) => updateFormData('password', value)}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormData('confirmPassword', value)}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Full Name"
          value={formData.fullName}
          onChangeText={(value) => updateFormData('fullName', value)}
          mode="outlined"
          style={styles.input}
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Proficiency"
          value={formData.proficiency}
          onChangeText={(value) => updateFormData('proficiency', value)}
          mode="outlined"
          style={styles.input}
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Unit"
          value={formData.unit}
          onChangeText={(value) => updateFormData('unit', value)}
          mode="outlined"
          style={styles.input}
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Rank"
          value={formData.rank}
          onChangeText={(value) => updateFormData('rank', value)}
          mode="outlined"
          style={styles.input}
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Age"
          value={formData.age}
          onChangeText={(value) => updateFormData('age', value)}
          mode="outlined"
          style={styles.input}
          keyboardType="numeric"
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <TextInput
          label="Military ID Number"
          value={formData.militaryId}
          onChangeText={(value) => updateFormData('militaryId', value)}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          theme={{ colors: { primary: '#cddc39' } }}
        />

        <View style={styles.photoContainer}>
          <Image
            source={{ uri: image || 'https://via.placeholder.com/150' }}
            style={styles.photo}
          />
          <Button mode="outlined" onPress={pickImage} style={styles.photoButton}
          labelStyle={{ color: 'white' }}
          >
            Choose from Gallery
          </Button>
          <Button mode="outlined" onPress={takePhoto} style={styles.photoButton}
          labelStyle={{ color: 'white' }}
          >
            Take Photo
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={handleSignUp}
          style={styles.button}
          labelStyle={{ color: 'white' }}
          disabled={loading}
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginButton}
          labelStyle={{ color: '#cddc39' }}
        >
          Already have an account? Login
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#2e3b32', // Match Login screen background
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#cddc39',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#cddc39',
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#4caf50',
  },
  loginButton: {
    marginTop: 16,
    marginBottom : 50,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  photo: {
    width: 150,
    height: 150,
    marginBottom: 10,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#cddc39',
  },
  photoButton: {
    marginTop: 8,
    width: '80%',
    alignSelf: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default SignUpScreen;
