import React from "react";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 bg-white justify-center items-center">
      <View className="flex-row items-center">
        <Text className="text-5xl font-black text-primary-600 tracking-tighter">
          Nutri
        </Text>

        <View
          className="ml-1 w-3 h-3 rounded-full bg-orange-400"
          style={{ marginTop: 20 }}
        />
      </View>

      <View className="absolute bottom-12">
        <Text className="text-gray-300 font-bold uppercase tracking-[4px] text-[10px]">
          Loading Your Progress
        </Text>
      </View>
    </View>
  );
}