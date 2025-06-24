import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import AppNavigator from '../app/navigation/AppNavigator';

const theme = {
  ...DefaultTheme,
  roundness: 25, 
  colors: {
    ...DefaultTheme.colors,
    primary: '#cddc39',
    outline: '#cddc39',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AppNavigator />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
