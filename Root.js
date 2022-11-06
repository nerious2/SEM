import React from 'react';
import { LogBox } from 'react-native';
import App from './src/App';
import { AppDetailModalProvider } from './src/Component/AppDetailModal';
import { GlobalAppStateProvider } from './src/Component/GlobalContext';

LogBox.ignoreLogs(['VirtualizedLists should never be nested inside plain ScrollViews with the same orientation']);

const Root = () => (
  <GlobalAppStateProvider>
    <AppDetailModalProvider>
      <App />
    </AppDetailModalProvider>
  </GlobalAppStateProvider>
);
  

export default Root;