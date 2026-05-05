import React, { useState } from "react";
import { View, Text } from "react-native";
import { CartesianChart, Line, Area, useChartPressState } from "victory-native";
import { WeightEntry } from "@/types";
import { COLORS } from "@/constants";
import { format, parseISO } from "date-fns";

interface WeightLineChartProps {
  entries: WeightEntry[];
}

export function WeightLineChart({ entries }: WeightLineChartProps) {
  const { state, isActive } = useChartPressState({ x: "", y: { weight: 0 } });

  if (entries.length < 2) {
    return (
      <View className="h-40 items-center justify-center">
        <Text className="text-gray-400 text-sm">Log at least 2 weight entries to see your trend</Text>
      </View>
    );
  }

  const data = entries.map((e) => {
    const rawDate = e.logDate || (e as any).log_date;
    const weight = Number(e.weightKg || (e as any).weight_kg);
    
    return {
      date: rawDate ? format(parseISO(String(rawDate)), "MMM d") : "Unknown",
      weight: isNaN(weight) ? 0 : weight,
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;

  return (
    <View style={{ height: 200 }}>
      {isActive && (
        <View className="absolute top-0 left-0 right-0 items-center z-10">
          <View className="bg-gray-900 rounded-xl px-3 py-1.5">
            <Text className="text-white text-xs font-semibold">
              {state.y.weight.value.value.toFixed(1)} kg
            </Text>
          </View>
        </View>
      )}

      <CartesianChart
        data={data}
        xKey="date"
        yKeys={["weight"]}
        domain={{ y: [minW, maxW] }}
        chartPressState={state}
        axisOptions={{
          labelColor: COLORS.muted,
          lineColor: COLORS.border,
          tickCount: { x: data.length, y: 4 }, 
        }}
      >
        {({ points, chartBounds }) => (
          <>
            <Area
              points={points.weight}
              y0={chartBounds.bottom}
              color={COLORS.primary}
              opacity={0.1}
            />
            <Line
              points={points.weight}
              color={COLORS.primary}
              strokeWidth={3}
              curveType="natural"
            />
          </>
        )}
      </CartesianChart>
    </View>
  );
}