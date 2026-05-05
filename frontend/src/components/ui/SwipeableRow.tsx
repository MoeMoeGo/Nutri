import React, { useRef } from "react";
import { Animated, Text, TouchableOpacity, View, PanResponder, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = -80;
const DELETE_WIDTH = 80;

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
}

export function SwipeableRow({ children, onDelete, disabled }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowOpen = useRef(false);

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    rowOpen.current = false;
  };

  const open = () => {
    Animated.spring(translateX, {
      toValue: -DELETE_WIDTH,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    rowOpen.current = true;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, g) => !disabled && Math.abs(g.dx) > 5,
      onPanResponderMove: (_, g) => {
        const base = rowOpen.current ? -DELETE_WIDTH : 0;
        const newX = Math.min(0, Math.max(-DELETE_WIDTH * 1.5, base + g.dx));
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, g) => {
        const base = rowOpen.current ? -DELETE_WIDTH : 0;
        const total = base + g.dx;
        if (total < SWIPE_THRESHOLD) {
          open();
        } else {
          close();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    close();
    onDelete();
  };

  return (
    <View className="overflow-hidden">
      <View
        className="absolute right-0 top-0 bottom-0 items-center justify-center bg-red-500"
        style={{ width: DELETE_WIDTH }}
      >
        <TouchableOpacity onPress={handleDelete} className="items-center justify-center w-full h-full">
          <Text className="text-white text-xs font-semibold mt-1">Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}
