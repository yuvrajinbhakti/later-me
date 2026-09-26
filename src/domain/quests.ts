import { DEFAULT_SETTINGS, type AppState, type Milestone, type Quest, type QuestDraft, type QuestStatus, type Task } from './types';

export function emptyState(): AppState {
  return { version: 2, quests: [], focusQuestId: null, settings: DEFAULT_SETTINGS };
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createQuest(draft: QuestDraft, now: Date, makeIdFn: () => string): Quest {
  const milestones: Milestone[] = draft.milestones
    .map((m) => ({
      id: makeIdFn(),
      title: m.title.trim(),
      tasks: m.tasks
        .filter((t) => t.title.trim() !== '')
        .map<Task>((t) => ({ id: makeIdFn(), title: t.title.trim(), minutes: t.minutes, done: false, doneAt: null })),
    }))
    .filter((m) => m.title !== '' && m.tasks.length > 0);

  return {
    id: makeIdFn(),
    title: draft.title.trim(),
    why: draft.why.trim(),
    targetDate: draft.targetDate,
    hoursPerWeek: draft.hoursPerWeek,
    status: 'active',
    createdAt: now.toISOString(),
    completedAt: null,
    milestones,
  };
}

export function validateDraft(draft: QuestDraft): string | null {
  if (draft.title.trim() === '') return 'Name the goal first.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.targetDate) || Number.isNaN(new Date(draft.targetDate).getTime())) {
    return 'Pick a target date.';
  }
  const hasTask = draft.milestones.some(
    (m) => m.title.trim() !== '' && m.tasks.some((t) => t.title.trim() !== ''),
  );
  if (!hasTask) return 'Add at least one milestone with one task.';
  return null;
}

const allTasks = (q: Quest): Task[] => q.milestones.flatMap((m) => m.tasks);

export function questProgress(q: Quest): number {
  const tasks = allTasks(q);
  return tasks.length === 0 ? 0 : tasks.filter((t) => t.done).length / tasks.length;
}

export function milestoneProgress(m: Milestone): number {
  return m.tasks.length === 0 ? 0 : m.tasks.filter((t) => t.done).length / m.tasks.length;
}

export function currentMilestone(q: Quest): Milestone | null {
  return q.milestones.find((m) => m.tasks.some((t) => !t.done)) ?? null;
}

export function milestoneState(q: Quest, m: Milestone): 'done' | 'current' | 'upcoming' {
  if (m.tasks.every((t) => t.done)) return 'done';
  return currentMilestone(q)?.id === m.id ? 'current' : 'upcoming';
}

export function todayTasks(q: Quest, limit = 3): Task[] {
  return (currentMilestone(q)?.tasks ?? []).filter((t) => !t.done).slice(0, limit);
}

export function nextTask(q: Quest): Task | null {
  return todayTasks(q, 1)[0] ?? null;
}

export function toggleTask(q: Quest, taskId: string, now: Date): Quest {
  return {
    ...q,
    milestones: q.milestones.map((m) => ({
      ...m,
      tasks: m.tasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done, doneAt: t.done ? null : now.toISOString() } : t,
      ),
    })),
  };
}

/** The milestone that ticking this task would finish, and the one that becomes current after it. */
export function milestoneFinishedBy(q: Quest, taskId: string): { finished: Milestone; next: Milestone | null } | null {
  const milestone = q.milestones.find((m) => m.tasks.some((t) => t.id === taskId));
  if (!milestone) return null;
  const finishes = milestone.tasks.every((t) => (t.id === taskId ? !t.done : t.done));
  if (!finishes) return null;
  return { finished: milestone, next: currentMilestone(toggleTask(q, taskId, new Date(0))) };
}

export function focusQuest(s: AppState): Quest | null {
  return s.quests.find((q) => q.id === s.focusQuestId) ?? null;
}

function newestActiveId(quests: Quest[], excludeId: string | null): string | null {
  const candidates = quests.filter((q) => q.status === 'active' && q.id !== excludeId);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.createdAt > a.createdAt ? b : a)).id;
}

export function addQuest(s: AppState, q: Quest): AppState {
  return { ...s, quests: [...s.quests, q], focusQuestId: s.focusQuestId ?? (q.status === 'active' ? q.id : null) };
}

export function setFocus(s: AppState, id: string): AppState {
  const target = s.quests.find((q) => q.id === id);
  return target?.status === 'active' ? { ...s, focusQuestId: id } : s;
}

export function setQuestStatus(s: AppState, id: string, status: QuestStatus, now: Date): AppState {
  if (!s.quests.some((q) => q.id === id)) return s;
  const quests = s.quests.map((q) =>
    q.id === id ? { ...q, status, completedAt: status === 'completed' ? now.toISOString() : null } : q,
  );
  let focusQuestId = s.focusQuestId;
  if (status !== 'active' && focusQuestId === id) focusQuestId = newestActiveId(quests, id);
  if (status === 'active' && focusQuestId === null) focusQuestId = id;
  return { ...s, quests, focusQuestId };
}

export function deleteQuest(s: AppState, id: string): AppState {
  if (!s.quests.some((q) => q.id === id)) return s;
  const quests = s.quests.filter((q) => q.id !== id);
  const focusQuestId = s.focusQuestId === id ? newestActiveId(quests, id) : s.focusQuestId;
  return { ...s, quests, focusQuestId };
}
