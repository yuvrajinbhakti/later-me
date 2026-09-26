import { milestoneFinishedBy } from '../../domain/quests';
import type { Quest } from '../../domain/types';
import { useAppStore } from '../../store/AppStore';

/** Ticks a task and announces the milestone it finished, if it finished one. */
export function useTaskToggle(onMilestoneDone: (message: string) => void) {
  const { dispatch } = useAppStore();
  return (quest: Quest, taskId: string) => {
    const result = milestoneFinishedBy(quest, taskId);
    dispatch({ type: 'toggleTask', questId: quest.id, taskId });
    if (result) {
      onMilestoneDone(
        result.next
          ? `${result.finished.title} done. Next: ${result.next.title}`
          : `${result.finished.title} done. That was the last one.`,
      );
    }
  };
}
