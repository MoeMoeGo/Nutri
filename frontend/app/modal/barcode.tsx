import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

import { QUERY_KEYS } from "@/constants";
import nutritionService from "@/services/nutrition.service";

export default function BarcodeScannerModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Text className="text-white text-center text-lg font-medium mb-4">
          Camera access required
        </Text>
        <Text className="text-gray-400 text-center mb-6">
          Allow camera access to scan food barcodes.
        </Text>
        <TouchableOpacity
          className="bg-green-600 px-6 py-3 rounded-xl mb-3"
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold">Grant permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-400">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (scanned || isLooking) return;
    setScanned(true);
    setIsLooking(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const foods = await nutritionService.searchByBarcode(data);
      if (foods.length === 0) {
        Alert.alert(
          "Not found",
          "No nutrition data found for this barcode.",
          [
            { text: "Try again", onPress: () => { setScanned(false); setIsLooking(false); } },
            { text: "Search manually", onPress: () => router.replace("/modal/add-food") },
          ]
        );
        return;
      }
      queryClient.setQueryData(QUERY_KEYS.foodSearch(data), foods);
      router.replace("/modal/add-food");
    } catch {
      Alert.alert("Error", "Could not fetch barcode data.", [
        { text: "OK", onPress: () => { setScanned(false); setIsLooking(false); } },
      ]);
    } finally {
      setIsLooking(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View className="flex-1 items-center justify-center">
        <View style={{ width: 260, height: 260, position: "relative" }}>
          {[
            { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
            { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
            { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
            { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
          ].map((style, i) => (
            <View
              key={i}
              style={[{ position: "absolute", width: 32, height: 32, borderColor: "white" }, style]}
            />
          ))}
          {!scanned && (
            <View style={{
              position: "absolute",
              top: "50%",
              left: 8,
              right: 8,
              height: 2,
              backgroundColor: "#16a34a",
              opacity: 0.9,
            }} />
          )}
        </View>
        <Text className="text-white text-base mt-6 text-center px-8">
          {isLooking ? "Looking up barcode..." : "Point at a food barcode"}
        </Text>
      </View>

      <TouchableOpacity
        className="absolute top-14 left-5 bg-black/50 rounded-full px-4 py-2"
        onPress={() => router.back()}
      >
        <Text className="text-white font-medium">✕ Close</Text>
      </TouchableOpacity>

      {scanned && !isLooking && (
        <TouchableOpacity
          className="absolute bottom-14 self-center bg-white px-8 py-3 rounded-full"
          onPress={() => setScanned(false)}
        >
          <Text className="text-gray-900 font-semibold">Scan again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}