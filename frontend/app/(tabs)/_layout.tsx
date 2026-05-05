import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TabIconProps {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  focusedName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  focused: boolean;
}

function TabIcon({ name, focusedName, label, focused }: TabIconProps) {
  return (
    <View className="items-center justify-center pt-2" style={{ width: 80 }}>
      <MaterialCommunityIcons 
        name={focused ? (focusedName || name) : name} 
        size={24} 
        color={focused ? "#16a34a" : "#9ca3af"} 
      />
      <Text
        numberOfLines={1}
        className={`text-[10px] mt-1 tracking-tight ${
          focused ? "text-primary-600 font-bold" : "text-gray-400 font-medium"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 85, 
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopColor: "#f3f4f6",
          borderTopWidth: 1,
          elevation: 0, 
          shadowOpacity: 0, 
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name="home-variant-outline" 
              focusedName="home-variant"
              label="Home" 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name="notebook-outline" 
              focusedName="notebook"
              label="Log" 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name="account-outline" 
              focusedName="account"
              label="Profile" 
              focused={focused} 
            />
          ),
        }}
      />
    </Tabs>
  );
}