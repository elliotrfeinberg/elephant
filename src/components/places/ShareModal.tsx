import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSharePlace, useUnsharePlace, usePlaceShares } from "@/hooks/useSharing";
import type { ShareInvite } from "@/types";

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
  isOwner: boolean;
}

export function ShareModal({
  visible,
  onClose,
  placeId,
  placeName,
  isOwner,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const shareMutation = useSharePlace(placeId, placeName);
  const unshareMutation = useUnsharePlace(placeId);
  const { data: shares, isLoading } = usePlaceShares(placeId);

  async function handleShare() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    try {
      await shareMutation.mutateAsync(trimmed);
      setEmail("");
      Alert.alert("Shared!", `${placeName} has been shared with ${trimmed}.`);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to share place.");
    }
  }

  function handleUnshare(invite: ShareInvite) {
    if (!invite.toUserId) return;
    Alert.alert(
      "Remove Access",
      `Remove ${invite.toEmail}'s access to this place?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => unshareMutation.mutate(invite.toUserId!),
        },
      ]
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10 max-h-[70%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Share Place
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-400 text-base">Done</Text>
            </TouchableOpacity>
          </View>

          {isOwner && (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2">
                Invite someone by email
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50"
                  placeholder="friend@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <TouchableOpacity
                  onPress={handleShare}
                  disabled={shareMutation.isPending}
                  className="bg-primary-600 rounded-xl px-4 items-center justify-center"
                >
                  {shareMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-medium text-sm">
                      Share
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Shared with
          </Text>

          {isLoading ? (
            <ActivityIndicator className="mt-4" color="#2563eb" />
          ) : !shares || shares.length === 0 ? (
            <View className="items-center py-6">
              <Text className="text-sm text-gray-400">
                Not shared with anyone yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={shares}
              keyExtractor={(item) => item.inviteId}
              renderItem={({ item }) => (
                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-900">
                      {item.toEmail}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      Shared by {item.fromDisplayName}
                    </Text>
                  </View>
                  {isOwner && item.toUserId && (
                    <TouchableOpacity onPress={() => handleUnshare(item)}>
                      <Text className="text-red-500 text-xs">Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
