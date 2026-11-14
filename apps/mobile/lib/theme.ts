import { useColorScheme } from "react-native";
import { tokens } from "./shared";

export function useTheme() {
  return tokens[useColorScheme() === "dark" ? "dark" : "light"];
}
