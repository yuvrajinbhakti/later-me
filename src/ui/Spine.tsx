import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

export interface SpineNode {
  id: string;
  title: string;
  meta: string;
  state: 'done' | 'current' | 'upcoming';
}

/** Questify's one decorative motif: a 2px rail with nodes. Done rail is mint, you-are-here is violet. */
export function Spine({ nodes, onPress }: { nodes: SpineNode[]; onPress: (id: string) => void }) {
  return (
    <View style={styles.spine}>
      {nodes.map((n, i) => {
        const last = i === nodes.length - 1;
        const label = `${n.title}. ${n.meta}. ${n.state === 'current' ? 'You are here' : n.state}`;
        return (
          <Pressable
            key={n.id}
            onPress={() => onPress(n.id)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={[styles.node, last && styles.nodeLast]}
          >
            {!last ? <View style={[styles.segment, n.state === 'done' && styles.segmentDone]} /> : null}
            <View
              style={[
                styles.dot,
                n.state === 'done' && styles.dotDone,
                n.state === 'current' && styles.dotCurrent,
              ]}
            >
              {n.state === 'done' ? <Icon name="check" size={12} color={colors.bg} strokeWidth={3} /> : null}
            </View>
            {n.state === 'current' ? (
              <View style={styles.card}>
                <Text style={styles.flag}>You are here</Text>
                <Text style={styles.name}>{n.title}</Text>
                <Text variant="meta" style={styles.meta}>{n.meta}</Text>
              </View>
            ) : (
              <View>
                <Text style={[styles.name, n.state === 'upcoming' && styles.nameTodo]}>{n.title}</Text>
                <Text variant="meta" style={styles.meta}>{n.meta}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const DOT = 22;
const LEFT = 34;

const styles = StyleSheet.create({
  spine: { paddingLeft: LEFT },
  node: { paddingBottom: 22, minHeight: 48 },
  nodeLast: { paddingBottom: 0 },
  segment: {
    position: 'absolute',
    left: -LEFT + 10,
    top: DOT + 2,
    bottom: -2,
    width: 2,
    backgroundColor: colors.rail,
    borderRadius: 2,
  },
  segmentDone: { backgroundColor: colors.mint },
  dot: {
    position: 'absolute',
    left: -LEFT,
    top: 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: colors.rail,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.mint, borderColor: colors.mint },
  dotCurrent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  card: {
    marginTop: -2,
    padding: 14,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.elevated,
  },
  flag: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 6,
  },
  name: { fontFamily: fonts.semibold, fontSize: 15.5, lineHeight: 21, letterSpacing: -0.15, color: colors.text },
  nameTodo: { color: colors.text2 },
  meta: { marginTop: 3, fontSize: 12.5 },
});
