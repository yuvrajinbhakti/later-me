import { addQuest, deleteQuest, setFocus, setQuestStatus, toggleTask } from '../domain/quests';
import type { AccountabilitySettings, AiCalloutSet, AppState, Quest, QuestStatus } from '../domain/types';

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'addQuest'; quest: Quest }
  | { type: 'toggleTask'; questId: string; taskId: string }
  | { type: 'setFocus'; questId: string }
  | { type: 'setStatus'; questId: string; status: QuestStatus }
  | { type: 'deleteQuest'; questId: string }
  | { type: 'updateSettings'; patch: Partial<AccountabilitySettings> }
  | { type: 'setAiCallouts'; set: AiCalloutSet };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'addQuest':
      return addQuest(state, action.quest);
    case 'toggleTask': {
      if (!state.quests.some((q) => q.id === action.questId)) return state;
      const now = new Date();
      return {
        ...state,
        quests: state.quests.map((q) => (q.id === action.questId ? toggleTask(q, action.taskId, now) : q)),
      };
    }
    case 'setFocus':
      return setFocus(state, action.questId);
    case 'setStatus':
      return setQuestStatus(state, action.questId, action.status, new Date());
    case 'deleteQuest':
      return deleteQuest(state, action.questId);
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'setAiCallouts':
      return { ...state, aiCallouts: action.set };
  }
}
