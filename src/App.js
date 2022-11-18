import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import MainScreen from './MainScreen';
import OSSLicenseStack from './Component/OSSLicenseStack';

const App = () => {
  const Stack = createStackNavigator();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainScreen"
          component={MainScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="OSSLicenseStack"
          component={OSSLicenseStack}
          options={{
            headerShown: false,
            animationEnabled: false,
          }}
          initialParams={{title: '오픈소스 라이선스', isContentMode: false}}
        />
        <Stack.Screen
          name="OSSLicenseContentStack"
          component={OSSLicenseStack}
          options={{
            headerShown: false,
            animationEnabled: false,
          }}
          initialParams={{isContentMode: true, }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;