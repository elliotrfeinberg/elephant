import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import { signUp } from "@/services/auth";

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
      // Auth gate in _layout.tsx will redirect to tabs
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-center mb-2 text-gray-900">
          🐘 Elephant
        </Text>
        <Text className="text-base text-center text-gray-500 mb-10">
          Create your account
        </Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base bg-gray-50"
          placeholder="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base bg-gray-50"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base bg-gray-50"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base bg-gray-50"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mb-4"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-500">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-primary-600 font-semibold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
