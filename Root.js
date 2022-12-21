import React from 'react';
import { LogBox } from 'react-native';
import App from './src/App';
import { AppDetailModalProvider } from './src/Component/AppDetailModal';
import { GlobalAppStateProvider } from './src/Component/GlobalContext';
import { AppVersionSelectModalProvider } from './src/Component/AppVersionSelectModal';
import { MenuProvider } from 'react-native-popup-menu';

LogBox.ignoreLogs(['VirtualizedLists should never be nested inside plain ScrollViews with the same orientation']);

const Root = () => (
  <GlobalAppStateProvider>
    <AppDetailModalProvider>
      <AppVersionSelectModalProvider>
        <MenuProvider backHandler={true}>
          <App />
        </MenuProvider>
      </AppVersionSelectModalProvider>
    </AppDetailModalProvider>
  </GlobalAppStateProvider>
);
  

export default Root;