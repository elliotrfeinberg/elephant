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
import { signIn } from "@/services/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Auth gate in _layout.tsx will redirect to tabs
    } catch (error: any) {
      Alert.alert("Login Failed", error.message ?? "Something went wrong.");
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
          Never forget a place
        </Text>

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
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base bg-gray-50"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mb-4"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-500">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-primary-600 font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
