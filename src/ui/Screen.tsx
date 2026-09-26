import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, navHeight, pad } from './theme';

export interface ScreenProps {
  children: ReactNode;
  header?: ReactNode;
  /** Pinned below the scroll area, e.g. the primary action of a form step. */
  footer?: ReactNode;
  /** Leaves room for the floating tab bar. */
  inTabs?: boolean;
  overlay?: ReactNode;
}

export function Screen({ children, header, footer, inTabs, overlay }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = inTabs ? navHeight + insets.bottom + 28 : footer ? 16 : insets.bottom + 24;
  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>{footer}</View> : null}
      {overlay}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: pad, paddingTop: 4 },
  footer: { paddingHorizontal: pad, paddingTop: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
