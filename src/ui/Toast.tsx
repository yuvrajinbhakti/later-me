import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Text } from './Text';
import { colors, pad, radius } from './theme';

export function useToast(durationMs = 2600) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return { message, show };
}

export function Toast({ message, aboveTabs }: { message: string | null; aboveTabs?: boolean }) {
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View
      style={[styles.toast, { bottom: insets.bottom + (aboveTabs ? 90 : 24) }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Icon name="check" size={16} color={colors.mint} strokeWidth={2.4} />
      <Text variant="label" style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: pad,
    right: pad,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radius.m,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { flex: 1 },
});
