import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Quest } from '../../domain/types';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../../ui/Button';
import { Row } from '../../ui/Row';
import { Sheet } from '../../ui/Sheet';
import { Text } from '../../ui/Text';
import { colors } from '../../ui/theme';

export interface QuestOptionsSheetProps {
  quest: Quest | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function QuestOptionsSheet({ quest, onClose, onDeleted }: QuestOptionsSheetProps) {
  const { state, dispatch } = useAppStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setConfirmDelete(false), [quest?.id]);
  if (!quest) return null;

  const isFocus = state.focusQuestId === quest.id;
  const act = (action: Parameters<typeof dispatch>[0]) => {
    dispatch(action);
    onClose();
  };

  return (
    <Sheet visible={!!quest} onClose={onClose} title={confirmDelete ? 'Delete this quest?' : quest.title}>
      {confirmDelete ? (
        <View>
          <Text variant="body">Its milestones and ticked tasks go with it. This can't be undone.</Text>
          <View style={styles.confirm}>
            <Button kind="secondary" label="Keep it" onPress={() => setConfirmDelete(false)} style={styles.grow} />
            <Button
              kind="danger"
              label="Delete"
              onPress={() => {
                dispatch({ type: 'deleteQuest', questId: quest.id });
                onClose();
                onDeleted?.();
              }}
              style={styles.grow}
            />
          </View>
        </View>
      ) : (
        <View>
          {quest.status === 'active' && !isFocus ? (
            <Row
              icon="flag"
              iconColor={colors.accent}
              iconBackground={colors.accentWash}
              label="Set as focus"
              sublabel="Callouts will name this quest"
              onPress={() => act({ type: 'setFocus', questId: quest.id })}
            />
          ) : null}
          {quest.status === 'active' ? (
            <Row icon="pause" label="Pause" onPress={() => act({ type: 'setStatus', questId: quest.id, status: 'paused' })} />
          ) : (
            <Row
              icon="play"
              label={quest.status === 'completed' ? 'Reopen' : 'Resume'}
              onPress={() => act({ type: 'setStatus', questId: quest.id, status: 'active' })}
            />
          )}
          {quest.status !== 'completed' ? (
            <Row
              icon="check"
              iconColor={colors.mint}
              label="Mark complete"
              onPress={() => act({ type: 'setStatus', questId: quest.id, status: 'completed' })}
            />
          ) : null}
          <Row icon="trash" iconColor={colors.danger} label="Delete" onPress={() => setConfirmDelete(true)} last />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  confirm: { flexDirection: 'row', gap: 10, marginTop: 20 },
  grow: { flex: 1 },
});
