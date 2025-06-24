import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IDFLogo from '../Images/IDF_logo.png';


const SERVER_URL = 'http://192.168.1.202:5000'

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Login Success', `Welcome ${data.user.fullName}`);
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('curr_user', JSON.stringify(data.user));
        await AsyncStorage.setItem('user_id', data.user._id);

        navigation.replace('Main');
      } else {
        Alert.alert('Login Failed', data.message || 'Something went wrong');
      }
    } catch (error) {
      console.log('Login error:', error.message);
      Alert.alert('Login Error', 'Unable to login. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
      <Image
        source={IDFLogo}
        style={styles.logo}
      />
        <Text style={styles.title}>Military Connect</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
        >
          Login
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('SignUp')}
          style={styles.signUpButton}
          labelStyle={{ color: '#cddc39' }}
        >
          Don't have an account? Sign up
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#2e3b32',
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
    borderRadius: 40,
  },
  button: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#4caf50',
  },
  signUpButton: {
    marginTop: 16,
  },
});


export default LoginScreen;
