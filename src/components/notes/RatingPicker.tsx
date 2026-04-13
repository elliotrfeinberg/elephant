import { View, TouchableOpacity, Text } from "react-native";

interface RatingPickerProps {
  value: number | null;
  onChange: (rating: number | null) => void;
}

export function RatingPicker({ value, onChange }: RatingPickerProps) {
  return (
    <View className="flex-row items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(value === star ? null : star)}
          className="p-1"
        >
          <Text className="text-2xl">
            {value !== null && star <= value ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
