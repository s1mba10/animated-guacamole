import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from './types';
import ReminderEdit from '../screens/ReminderEdit';
import ReminderAdd from '../screens/ReminderAdd';
import Main from '../screens/Main';
import Profile from '../screens/Profile';
import Medications from '../screens/Medications';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main" component={Main} />
    <Stack.Screen name="ReminderEdit" component={ReminderEdit} />
    <Stack.Screen name="ReminderAdd" component={ReminderAdd} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={Profile} />
    <Stack.Screen name="Medications" component={Medications} />
  </Stack.Navigator>
);

const MedicationsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Medications" component={Medications} />
  </Stack.Navigator>
);

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Главная"
          component={MainStack}
          options={{ tabBarIcon: ({ color }) => <Icon name="home" size={30} color={color} /> }}
        />
        <Tab.Screen
          name="Препараты"
          component={MedicationsStack}
          options={{ tabBarIcon: ({ color }) => <Icon name="medical-bag" size={30} color={color} /> }}
        />
        <Tab.Screen
          name="Статистика"
          component={ProfileStack}
          options={{ tabBarIcon: ({ color }) => <Icon name="equalizer" size={30} color={color} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;