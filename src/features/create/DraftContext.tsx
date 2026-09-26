import { createContext, useContext, useState, type ReactNode } from 'react';
import { monthsFromNow } from '../../domain/format';
import type { QuestDraft } from '../../domain/types';

export type DraftMilestone = QuestDraft['milestones'][number];

interface DraftStore {
  draft: QuestDraft;
  update: (patch: Partial<QuestDraft>) => void;
  setMilestones: (milestones: DraftMilestone[]) => void;
}

const DraftContext = createContext<DraftStore | null>(null);

export const blankMilestone = (): DraftMilestone => ({ title: '', tasks: [{ title: '', minutes: null }] });

function freshDraft(): QuestDraft {
  return {
    title: '',
    why: '',
    targetDate: monthsFromNow(new Date(), 3),
    hoursPerWeek: 5,
    milestones: [blankMilestone()],
  };
}

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<QuestDraft>(freshDraft);
  const update = (patch: Partial<QuestDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setMilestones = (milestones: DraftMilestone[]) => setDraft((d) => ({ ...d, milestones }));
  return <DraftContext.Provider value={{ draft, update, setMilestones }}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftStore {
  const store = useContext(DraftContext);
  if (!store) throw new Error('useDraft must be used inside DraftProvider');
  return store;
}
