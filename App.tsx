import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GoalScreen } from './src/screens/GoalScreen';
import { WatcherScreen } from './src/screens/WatcherScreen';
import { colors } from './src/theme';

type Tab = 'goal' | 'watcher';

export default function App() {
  const [tab, setTab] = useState<Tab>('watcher');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style='light' />
      <View style={styles.header}>
        <Text style={styles.brand}>Later Me</Text>
        <Text style={styles.tagline}>your future self is watching</Text>
      </View>

      <View style={styles.tabs}>
        <TabButton label='🎯 Goal' active={tab === 'goal'} onPress={() => setTab('goal')} />
        <TabButton label='👀 Watcher' active={tab === 'watcher'} onPress={() => setTab('watcher')} />
      </View>

      {tab === 'goal' ? <GoalScreen /> : <WatcherScreen />}
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 40 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  brand: { color: colors.text, fontSize: 26, fontWeight: '800' },
  tagline: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.accentDark },
});
