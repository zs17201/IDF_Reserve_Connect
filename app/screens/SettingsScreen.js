import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Avatar, Modal, Portal, Provider, Card, Title,ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const SERVER_URL = 'http://192.168.1.202:5000';

const SettingsScreen = () => {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation();

  const fetchUserProfile = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) return;

      const response = await axios.get(`${SERVER_URL}/api/auth/profile/${userId}`);
      setUser(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (field) => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const updatedData = { [field]: formData[field] };
      await axios.put(`${SERVER_URL}/api/auth/${userId}`, updatedData);
      setUser(prevUser => ({ ...prevUser, [field]: formData[field] }));
      Alert.alert('Success', `${field} updated successfully!`);
    } catch (error) {
      console.error('Error saving field:', error);
      Alert.alert('Error', `Failed to save ${field}.`);
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: pickFromCamera },
        { text: 'Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsEditing: true,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData(prev => ({ ...prev, profileImage: base64Image }));
      handleImageUpdate(base64Image);
    }
  };

  const pickFromCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData(prev => ({ ...prev, profileImage: base64Image }));
      handleImageUpdate(base64Image);
    }
  };

  const handleImageUpdate = async (base64Image) => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const response = await axios.put(`${SERVER_URL}/api/auth/${userId}/image`, { profileImage: base64Image });
      setUser(response.data);
      Alert.alert('Success', 'Profile image updated successfully!');
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    try {
      const userId = await AsyncStorage.getItem('user_id');
      const response = await axios.post(`${SERVER_URL}/api/auth/check-password`, {
        userId,
        currentPassword,
      });

      if (!response.data.match) {
        Alert.alert('Validation Error', 'Current password is incorrect.');
        return;
      }

      await axios.put(`${SERVER_URL}/api/auth/password/${userId}`, { password: newPassword });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password updated successfully.');
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', 'Failed to update password.');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_id');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      await axios.delete(`${SERVER_URL}/api/auth/${userId}`);
      await AsyncStorage.removeItem('user_id');
      await AsyncStorage.removeItem(`chat_list_${userId}`);

          // Remove all chat-related entries involving this user
      const allKeys = await AsyncStorage.getAllKeys();
      const chatKeysToDelete = allKeys.filter(key => 
        key.startsWith(`chat_${userId}_`));
        
      await AsyncStorage.multiRemove(chatKeysToDelete);

      setDeleteModalVisible(false);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserProfile();
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>User not found</Text>
      </View>
    );
  }

  return (
    <Provider>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.profileContainer}>
            <Avatar.Image
              size={100}
              source={{ uri: formData.profileImage || 'https://via.placeholder.com/150' }}
              style={styles.avatar}
            />
            <TouchableOpacity onPress={handlePickImage}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
            <Text style={styles.emailText}>{user.email}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Profile Information</Title>
            {['fullName', 'rank', 'unit', 'proficiency', 'age'].map((field, index) => (
              <View key={index} style={styles.fieldContainer}>
                <TextInput
                  label={capitalizeFirstLetter(field)}
                  value={formData[field]?.toString()}
                  onChangeText={(text) => handleChange(field, text)}
                  mode="outlined"
                  style={styles.input}
                  editable={field !== 'email'} // email cannot be edited
                />
                {field !== 'email' && (
                  <Button
                    mode="contained"
                    onPress={() => handleSave(field)}
                    style={styles.saveButton}
                  >
                    Save
                  </Button>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={() => setPasswordModalVisible(true)}
          style={styles.changePasswordButton}
        >
          Change Password
        </Button>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Logout
        </Button>

        <Button
          mode="contained"
          onPress={() => setDeleteModalVisible(true)}
          style={styles.deleteButton}
        >
          Delete Account
        </Button>

        {/* Password Modal */}
        <Portal>
          <Modal visible={passwordModalVisible} onDismiss={() => setPasswordModalVisible(false)} contentContainerStyle={styles.modal}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <Button mode="contained" onPress={handleChangePassword} style={styles.passwordSaveButton}>
              Save Password
            </Button>
          </Modal>
        </Portal>

        {/* Delete Modal */}
        <Portal>
          <Modal visible={deleteModalVisible} onDismiss={() => setDeleteModalVisible(false)} contentContainerStyle={styles.modal_delete}>
            <Text style={styles.modalTitle}>Are you sure you want to delete your account?</Text>
            <Button mode="contained" onPress={handleDeleteAccount} style={styles.deleteAccountButton}>
              Yes, Delete My Account
            </Button>
            <Button mode="text" onPress={() => setDeleteModalVisible(false)} style={styles.cancelButton}>
              Cancel
            </Button>
          </Modal>
        </Portal>
      </ScrollView>
    </Provider>
  );
};

const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const styles = StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      backgroundColor: '#2e3b32',
    },
    card: {
      marginBottom: 20,
      borderRadius: 16,
      elevation: 5,
      backgroundColor: '#fff',
    },
    profileContainer: {
      alignItems: 'center',
      padding: 20,
    },
    avatar: {
      alignSelf: 'center',
      backgroundColor: '#c8e6c9',
    },
    changePhotoText: {
      color: '#2e7d32',
      marginTop: 10,
    },
    emailText: {
      marginTop: 10,
      fontSize: 16,
      color: '#333',
      fontWeight: '500',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 10,
    },
    fieldContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    input: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    saveButton: {
      marginLeft: 10,
      backgroundColor: '#388e3c',
      paddingHorizontal: 12,
    },
    changePasswordButton: {
      marginTop: 30,
      width: '100%',
      backgroundColor: '#2e7d32',
      borderRadius: 12,
    },
    logoutButton: {
      marginTop: 20,
      width: '100%',
      borderColor: '#d32f2f',
      borderWidth: 1,
      backgroundColor: '#ffebee',
      borderRadius: 12,
    },
    deleteButton: {
      marginTop: 30,
      width: '100%',
      backgroundColor: '#c62828',
      borderRadius: 12,
    },
    modal: {
      backgroundColor: '#ffffff',
      padding: 24,
      margin: 20,
      borderRadius: 20,
      elevation: 5,
      minHeight: 300,  // Ensures the modal is big enough to display all content
      justifyContent: 'flex-start',  // Ensures content starts at the top
    },
    modal_delete: {
        backgroundColor: '#ffffff',
        padding: 24,
        margin: 20,
        borderRadius: 20,
        elevation: 5,
        justifyContent: 'flex-start',  // Ensures content starts at the top
      },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
      color: '#1b5e20',
    },
    passwordSaveButton: {
      marginTop: 10,
      backgroundColor: '#388e3c',
    },
    deleteAccountButton: {
      backgroundColor: 'red',
      marginTop: 20,
    },
    cancelButton: {
      marginTop: 10,
    },
  });
  
  export default SettingsScreen;
  




