import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, fonts, navHeight } from './theme';

const ICON_FOR_ROUTE: Record<string, IconName> = { index: 'home', quests: 'quests', attention: 'eye' };

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: navHeight + insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        const color = focused ? colors.accent : colors.muted;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.item}
          >
            {focused ? <View style={styles.indicator} /> : null}
            <Icon name={ICON_FOR_ROUTE[route.name] ?? 'home'} size={22} color={color} />
            <Text style={styles.label} color={color}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(11,13,18,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
  indicator: { position: 'absolute', top: 0, width: 22, height: 2, borderRadius: 2, backgroundColor: colors.accent },
  label: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 13 },
});
