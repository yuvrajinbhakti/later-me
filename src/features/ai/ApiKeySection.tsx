import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { removeApiKey, saveApiKey, useApiKey } from '../../ai/apiKey';
import { isPlausibleApiKey, maskApiKey } from '../../domain/roadmap';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Field } from '../../ui/Field';
import { Row } from '../../ui/Row';
import { Section } from '../../ui/Section';
import { Text } from '../../ui/Text';

/** Where the user's own Anthropic key is added or removed; it never leaves the phone except to call the API. */
export function ApiKeySection() {
  const { key, loaded } = useApiKey();
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
  return (
    <Section title="AI drafting">
      <Card>
        {key ? (
          <Row
            label="Anthropic API key"
            sublabel={maskApiKey(key)}
            right={<Button small kind="tertiary" label="Remove" onPress={() => void removeApiKey()} />}
            last
          />
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
        Draft with AI sends the quest's name, why, date and hours to Anthropic. The key stays on this phone, encrypted by Android's
        Keystore.
      </Text>
    </Section>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: -12 },
  grow: { flex: 1 },
  saveBtn: { marginTop: 4 },
  hint: { marginTop: 8, fontSize: 12.5 },
});
