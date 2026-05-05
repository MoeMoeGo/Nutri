import React, { useState, useEffect, useCallback } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RulerPicker } from "react-native-ruler-picker";

const SCREEN_WIDTH = Dimensions.get("window").width;

type Unit = "kg" | "lbs";

interface WeightModalProps {
    visible: boolean;
    onClose: () => void;
    onLogged: () => void;
    logWeight: (kg: number) => Promise<any>;
    isLogging: boolean;
    lastWeightKg?: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function kgToLb(kg: number) {
    return Math.round(kg * 2.20462 * 10) / 10;
}

function lbToKg(lb: number) {
    return Math.round((lb / 2.20462) * 100) / 100;
}

export function WeightModal({
    visible,
    onClose,
    onLogged,
    logWeight,
    isLogging,
    lastWeightKg,
}: WeightModalProps) {
    const [unit, setUnit] = useState<Unit>("lbs");
    const [valueKg, setValueKg] = useState(lastWeightKg ?? 75);


    useEffect(() => {
        if (visible && lastWeightKg) {
            setValueKg(lastWeightKg);
        }
    }, [visible, lastWeightKg]);

    const displayValue = unit === "kg"
        ? Math.round(valueKg * 10) / 10
        : kgToLb(valueKg);

    const handleRulerChange = useCallback((v: string) => {
        const numericValue = parseFloat(v);
        if (!isNaN(numericValue)) {
            setValueKg(unit === "kg" ? numericValue : lbToKg(numericValue));
        }
    }, [unit]);

    const handleLog = async () => {
        await logWeight(Math.round(valueKg * 100) / 100);
        onLogged();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 bg-white">
                    <TouchableOpacity
                        onPress={() => {
                            onClose();
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <Text className="text-primary-600 text-base font-semibold">Cancel</Text>
                    </TouchableOpacity>

                    <Text className="text-lg font-bold text-gray-900">Log Weight</Text>

                    <View className="w-12" />
                </View>

                {/* Value Display */}
                <View className="items-center pt-10 pb-6">
                    <View className="flex-row items-baseline">
                        <Text className="text-7xl font-extrabold text-gray-900">
                            {displayValue.toFixed(1)}
                        </Text>
                        <Text className="text-2xl font-bold text-gray-400 ml-2 uppercase">
                            {unit}
                        </Text>
                    </View>

                    {/* Unit Toggle */}
                    <View className="flex-row mt-6 bg-gray-100 rounded-full p-1">
                        {(["kg", "lbs"] as Unit[]).map((u) => (
                            <TouchableOpacity
                                key={u}
                                onPress={() => setUnit(u)}
                                className={`px-8 py-2 rounded-full ${unit === u ? "bg-white" : ""}`}
                                style={unit === u ? {
                                    shadowColor: "#000",
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    shadowOffset: { width: 0, height: 2 },
                                    elevation: 3,
                                } : {}}
                            >
                                <Text className={`text-sm font-bold uppercase tracking-widest ${unit === u ? "text-primary-600" : "text-gray-400"}`}>
                                    {u}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Ruler Section */}
                <View className="bg-gray-50 py-8 border-t border-b border-gray-100">
                    <RulerPicker
                        key={`ruler-${unit}`}
                        width={SCREEN_WIDTH}
                        height={120}
                        min={unit === "kg" ? 30 : 66}
                        max={unit === "kg" ? 250 : 550}
                        step={0.5}
                        fractionDigits={1}
                        initialValue={displayValue}
                        onValueChange={handleRulerChange}
                        unit={unit}
                        indicatorHeight={60}
                        indicatorColor="#16a34a"
                        shortStepColor="#d1d5db"
                        longStepColor="#374151"
                        longStepHeight={40}
                        shortStepHeight={20}
                    />
                </View>

                {/* Submit Button */}
                <View className="px-6 pt-10">
                    <TouchableOpacity
                        onPress={handleLog}
                        disabled={isLogging}
                        className="bg-primary-600 rounded-2xl py-4 items-center shadow-sm active:bg-primary-700"
                        style={{ opacity: isLogging ? 0.6 : 1 }}
                    >
                        {isLogging ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">
                                Confirm {displayValue.toFixed(1)} {unit}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </Modal>
    );
}