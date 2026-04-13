import { View, Text } from "react-native";
import { Tabs } from "expo-router";
import { OfflineBanner } from "@/components/common/OfflineBanner";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export default function TabLayout() {
  return (
    <View className="flex-1">
      <OfflineBanner />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#9ca3af",
          headerStyle: { backgroundColor: "#fff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="🗺️" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="places"
          options={{
            title: "Places",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="📍" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="🔍" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="👤" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
