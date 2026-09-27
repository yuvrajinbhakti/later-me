import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAiCalloutStatus } from '../../ai/AiCalloutRefresher';
import { removeApiKey, saveApiKey, useApiKey } from '../../ai/apiKey';
import { isPlausibleApiKey, maskApiKey } from '../../domain/ai';
import { aiCalloutSummary, calloutBasis } from '../../domain/aiCallouts';
import { focusQuest } from '../../domain/quests';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Field } from '../../ui/Field';
import { Row } from '../../ui/Row';
import { Section } from '../../ui/Section';
import { Text } from '../../ui/Text';
import { Toggle } from '../../ui/Toggle';
import { colors } from '../../ui/theme';

/** The user's own Anthropic key, and the features it switches on. */
export function AiSection() {
  const { key, loaded } = useApiKey();
  const { state, dispatch } = useAppStore();
  const status = useAiCalloutStatus();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!isPlausibleApiKey(input)) {
      setError("That doesn't look like an Anthropic key. They start with sk-ant-.");
      return;
    }
    setSaving(true);
    try {
      await saveApiKey(input);
      setInput('');
      setError(null);
    } catch {
      setError("Couldn't save the key on this phone.");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;
  const s = state.settings;
  const focus = focusQuest(state);
  const summary = aiCalloutSummary({
    on: s.aiCallouts,
    alertsEnabled: s.alertsEnabled,
    basis: focus ? calloutBasis(s.sarcasmLevel, focus) : null,
    set: state.aiCallouts,
    writing: status.writing,
  });

  return (
    <Section title="AI">
      <Card>
        {key ? (
          <>
            <Row
              label="AI-written callouts"
              sublabel={summary}
              right={
                <Toggle
                  value={s.aiCallouts}
                  onChange={(aiCallouts) => dispatch({ type: 'updateSettings', patch: { aiCallouts } })}
                  accessibilityLabel="AI-written callouts"
                />
              }
            />
            {s.aiCallouts && status.error ? (
              <Text variant="cap" color={colors.danger} style={styles.error} accessibilityLiveRegion="polite">
                {status.error}
              </Text>
            ) : null}
            <Row
              label="Anthropic API key"
              sublabel={maskApiKey(key)}
              right={<Button small kind="tertiary" label="Remove" onPress={() => void removeApiKey()} />}
              last
            />
          </>
        ) : (
          <View style={styles.addRow}>
            <View style={styles.grow}>
              <Field
                value={input}
                onChangeText={(text) => {
                  setInput(text);
                  setError(null);
                }}
                placeholder="sk-ant-…"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Anthropic API key"
                error={error}
                onSubmitEditing={save}
              />
            </View>
            <Button small kind="secondary" label="Save" loading={saving} onPress={save} style={styles.saveBtn} />
          </View>
        )}
      </Card>
      <Text variant="meta" style={styles.hint}>
        {key
          ? "Drafting and callouts send the quest's name, why, target date, hours, current milestone and next task to Anthropic. The key stays on this phone, encrypted by Android's Keystore."
          : "Add your Anthropic API key to draft quest steps and get callouts written for your focus quest. It stays on this phone, encrypted by Android's Keystore."}
      </Text>
    </Section>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: -12 },
  grow: { flex: 1 },
  saveBtn: { marginTop: 4 },
  error: { marginTop: -4, marginBottom: 8 },
  hint: { marginTop: 8, fontSize: 12.5 },
});
