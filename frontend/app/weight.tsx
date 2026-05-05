import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import Svg, { Polyline, Line, Circle, Text as SvgText, Rect } from "react-native-svg";
import { useWeightHistory, useLogWeight } from "@/hooks/useProgress";
import { WeightModal } from "@/components/WeightModal";
import { WeightEntry } from "@/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_H      = 220;
const CHART_PAD_L  = 52;   
const CHART_PAD_R  = 16;
const CHART_PAD_T  = 20;
const CHART_PAD_B  = 36;   

// Chart 

function WeightLineGraph({ entries }: { entries: WeightEntry[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: WeightEntry } | null>(null);

  if (entries.length === 0) {
    return (
      <View className="h-48 items-center justify-center">
        <Text className="text-gray-400 text-sm">No entries yet — log your first weight</Text>
      </View>
    );
  }

  if (entries.length === 1) {
    return (
      <View className="h-48 items-center justify-center">
        <Text className="text-gray-800 font-semibold">{entries[0].weightKg} kg</Text>
        <Text className="text-gray-400 text-sm mt-1">Log more entries to see your trend</Text>
      </View>
    );
  }

  const chartW = SCREEN_WIDTH - 32 - CHART_PAD_L - CHART_PAD_R;
  const plotW  = chartW;
  const plotH  = CHART_H - CHART_PAD_T - CHART_PAD_B;

  const weights = entries.map((e) => Number(e.weightKg));
  const minW = Math.floor(Math.min(...weights)) - 1;
  const maxW = Math.ceil(Math.max(...weights))  + 1;
  const range = maxW - minW || 1;

  const xScale = (i: number) => (i / (entries.length - 1)) * plotW;
  const yScale = (w: number) => plotH - ((w - minW) / range) * plotH;

  const points = entries
    .map((e, i) => `${xScale(i)},${yScale(Number(e.weightKg))}`)
    .join(" ");

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minW + (range / yTicks) * i
  );

  const labelStep = Math.max(1, Math.ceil(entries.length / 5));
  const xLabels = entries
    .map((e, i) => ({ i, e }))
    .filter(({ i }) => i % labelStep === 0 || i === entries.length - 1);

  const svgWidth  = plotW + CHART_PAD_L + CHART_PAD_R;
  const svgHeight = CHART_H;

  return (
    <View>
      <Svg width={svgWidth} height={svgHeight}>
        {yTickValues.map((tick, i) => {
          const cy = CHART_PAD_T + yScale(tick);
          return (
            <React.Fragment key={i}>
              <Line
                x1={CHART_PAD_L} y1={cy}
                x2={CHART_PAD_L + plotW} y2={cy}
                stroke="#f3f4f6" strokeWidth="1"
              />
              <SvgText
                x={CHART_PAD_L - 6} y={cy + 4}
                fontSize="10" fill="#9ca3af"
                textAnchor="end"
              >
                {Math.round(tick)}
              </SvgText>
            </React.Fragment>
          );
        })}

        <Polyline
          points={entries
            .map((e, i) => `${CHART_PAD_L + xScale(i)},${CHART_PAD_T + yScale(Number(e.weightKg))}`)
            .join(" ")}
          fill="none"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {entries.map((entry, i) => {
          const cx = CHART_PAD_L + xScale(i);
          const cy = CHART_PAD_T + yScale(Number(entry.weightKg));
          const isSelected = tooltip?.entry.id === entry.id;
          return (
            <Circle
              key={entry.id}
              cx={cx} cy={cy}
              r={isSelected ? 6 : 4}
              fill={isSelected ? "#16a34a" : "#ffffff"}
              stroke="#16a34a"
              strokeWidth="2"
              onPress={() => setTooltip(isSelected ? null : { x: cx, y: cy, entry })}
            />
          );
        })}

        {tooltip && (() => {
          const label = `${Number(tooltip.entry.weightKg).toFixed(1)} kg`;
          const date  = format(parseISO(String(tooltip.entry.logDate)), "MMM d");
          const boxW  = 72;
          const boxH  = 36;
          const bx    = Math.min(Math.max(tooltip.x - boxW / 2, CHART_PAD_L), CHART_PAD_L + plotW - boxW);
          const by    = tooltip.y - boxH - 10;

          return (
            <>
              <Rect x={bx} y={by} width={boxW} height={boxH} rx="6" fill="#111827" />
              <SvgText x={bx + boxW / 2} y={by + 14} fontSize="11" fill="#fff" fontWeight="600" textAnchor="middle">
                {label}
              </SvgText>
              <SvgText x={bx + boxW / 2} y={by + 27} fontSize="10" fill="#9ca3af" textAnchor="middle">
                {date}
              </SvgText>
            </>
          );
        })()}

        {xLabels.map(({ i, e }) => (
          <SvgText
            key={i}
            x={CHART_PAD_L + xScale(i)}
            y={svgHeight - 6}
            fontSize="10" fill="#9ca3af"
            textAnchor="middle"
          >
            {format(parseISO(String(e.logDate)), "MMM d")}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}


function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl px-4 py-4 mx-1">
      <Text className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</Text>
      <Text className="text-2xl font-black text-gray-900" style={color ? { color } : {}}>
        {value}
      </Text>
      {sub && <Text className="text-xs text-gray-400 mt-0.5">{sub}</Text>}
    </View>
  );
}

//  Main screen 

export default function WeightScreen() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const { data: entries = [], isLoading, refetch } = useWeightHistory();
  const logWeight = useLogWeight();

  const sorted  = [...entries].sort(
    (a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime()
  );

  const first   = sorted[0];
  const current = sorted[sorted.length - 1];
  const change  = first && current
    ? Math.round((Number(current.weightKg) - Number(first.weightKg)) * 10) / 10
    : null;

  const changeColor = change === null
    ? "#6b7280"
    : change < 0 ? "#16a34a" : change > 0 ? "#ef4444" : "#6b7280";

  const handleLogged = () => {
    setShowModal(false);
    refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
          <MaterialCommunityIcons name="chevron-left" size={28} color="#16a34a" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900 flex-1">Weight</Text>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="bg-primary-600 rounded-full px-4 py-2"
        >
          <Text className="text-white font-bold text-sm">+ Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Stats row */}
        <View className="flex-row mb-4 -mx-1">
          <StatCard
            label="Start"
            value={first ? `${Number(first.weightKg).toFixed(1)}` : "—"}
            sub={first ? format(parseISO(String(first.logDate)), "MMM d") : "no entries"}
          />
          <StatCard
            label="Current"
            value={current ? `${Number(current.weightKg).toFixed(1)}` : "—"}
            sub={current ? format(parseISO(String(current.logDate)), "MMM d") : "no entries"}
          />
          <StatCard
            label="Change"
            value={change !== null ? `${change > 0 ? "+" : ""}${change}` : "—"}
            sub="kg total"
            color={changeColor}
          />
        </View>

        {/* Chart card */}
        <View className="bg-white rounded-2xl pt-4 pb-2 mb-4" style={{ paddingLeft: 0, paddingRight: 8 }}>
          <Text className="text-base font-bold text-gray-900 px-4 mb-3">Weight over time</Text>
          {isLoading ? (
            <View className="h-48 items-center justify-center">
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : (
            <WeightLineGraph entries={sorted} />
          )}
          <Text className="text-xs text-gray-400 text-center mt-2 mb-2">
            Tap any dot to see the value
          </Text>
        </View>

        {/* Log history */}
        {sorted.length > 0 && (
          <View className="bg-white rounded-2xl px-4 pt-4 pb-2">
            <Text className="text-base font-bold text-gray-900 mb-3">History</Text>
            {[...sorted].reverse().map((entry, i) => (
              <View
                key={entry.id}
                className={`flex-row items-center justify-between py-3 ${
                  i < sorted.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <Text className="text-gray-500 text-sm">
                  {format(parseISO(String(entry.logDate)), "EEE, MMM d")}
                </Text>
                <Text className="font-semibold text-gray-900">
                  {Number(entry.weightKg).toFixed(1)} kg
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Weight modal */}
      <WeightModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onLogged={handleLogged}
        logWeight={(kg) => logWeight.mutateAsync(kg)}
        isLogging={logWeight.isPending}
        lastWeightKg={current ? Number(current.weightKg) : null}
      />
    </SafeAreaView>
  );
}