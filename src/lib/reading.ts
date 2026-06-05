export type ReaderTheme = "system" | "light" | "dark";

export type ReaderPreferences = {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
};

export const defaultReaderPreferences: ReaderPreferences = {
  theme: "system",
  fontSize: 18,
  lineHeight: 1.8
};

export function sanitizeReaderPreferences(
  input: Partial<ReaderPreferences> | null | undefined
): ReaderPreferences {
  const theme = input?.theme;
  const fontSize = input?.fontSize;
  const lineHeight = input?.lineHeight;

  return {
    theme:
      theme === "system" || theme === "light" || theme === "dark"
        ? theme
        : defaultReaderPreferences.theme,
    fontSize:
      typeof fontSize === "number" && fontSize >= 14 && fontSize <= 24
        ? fontSize
        : defaultReaderPreferences.fontSize,
    lineHeight:
      typeof lineHeight === "number" && lineHeight >= 1.5 && lineHeight <= 2.2
        ? lineHeight
        : defaultReaderPreferences.lineHeight
  };
}

export function mergeReaderPreferences(
  input: Partial<ReaderPreferences> | null | undefined
): ReaderPreferences {
  return sanitizeReaderPreferences({
    ...defaultReaderPreferences,
    ...input
  });
}
