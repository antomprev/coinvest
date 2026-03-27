import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';

// Screens
import LoginScreen from './screens/auth/LoginScreen';
import SignupScreen from './screens/auth/SignupScreen';
import IdeasListScreen from './screens/ideas/IdeasListScreen';
import IdeaDetailScreen from './screens/ideas/IdeaDetailScreen';
import FavoritesScreen from './screens/favorites/FavoritesScreen';
import ChatScreen from './screens/chat/ChatScreen';
import ProfileScreen from './screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// App Stack
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#1D4ED8',
        tabBarInactiveTintColor: '#9CA3AF',
        headerStyle: {
          backgroundColor: '#F3F4F6'
        },
        headerTitleStyle: {
          fontWeight: '600'
        }
      }}
    >
      <Tab.Screen
        name="IdeasTab"
        component={IdeasListScreen}
        options={{
          title: 'Ideas',
          tabBarLabel: 'Ideas'
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          tabBarLabel: 'Favorites'
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat'
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile'
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (from AsyncStorage)
    // For now, start with auth screen
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false
          }}
        >
          {isLoggedIn ? (
            <Stack.Group>
              <Stack.Screen
                name="App"
                component={AppTabs}
                options={{ animationEnabled: false }}
              />
              <Stack.Screen
                name="IdeaDetail"
                component={IdeaDetailScreen}
                options={{
                  headerShown: true,
                  title: 'Idea Details'
                }}
              />
            </Stack.Group>
          ) : (
            <Stack.Group
              screenOptions={{
                animationEnabled: false
              }}
            >
              <Stack.Screen
                name="Auth"
                component={AuthStack}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
