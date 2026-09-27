import { AI_MODEL, AiError, type AiFailure } from '../ai';
import { ROADMAP_TOOL, buildRoadmapRequest, hasDraftSteps, parseRoadmapResponse, roadmapBudget } from '../roadmap';

const TODAY = new Date(2026, 8, 26, 15, 30);
const input = { title: 'Run a half marathon', why: 'Prove I can finish things', targetDate: '2026-12-19', hoursPerWeek: 5 };

const userText = (req: ReturnType<typeof buildRoadmapRequest>) => req.messages[0].content;

const toolReply = (toolInput: unknown, extra: Record<string, unknown> = {}) => ({
  content: [{ type: 'tool_use', id: 'toolu_1', name: ROADMAP_TOOL, input: toolInput }],
  stop_reason: 'tool_use',
  ...extra,
});

const failure = (fn: () => unknown): AiFailure | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof AiError ? e.failure : null;
  }
};

describe('roadmapBudget', () => {
  it('counts whole days to the target and the hours they hold', () =>
    expect(roadmapBudget(input, TODAY)).toEqual({ days: 84, totalHours: 60 }));

  it('treats a target of today or earlier as one day', () =>
    expect(roadmapBudget({ ...input, targetDate: '2026-09-20', hoursPerWeek: 7 }, TODAY)).toEqual({ days: 1, totalHours: 1 }));
});

describe('buildRoadmapRequest', () => {
  it('asks the roadmap model and forces the roadmap tool', () => {
    const req = buildRoadmapRequest(input, TODAY);
    expect(req.model).toBe(AI_MODEL);
    expect(req.tool_choice).toEqual({ type: 'tool', name: ROADMAP_TOOL });
    expect(req.tools.map((t) => t.name)).toEqual([ROADMAP_TOOL]);
  });

  it('gives the model the goal, the why, both dates and the time budget', () => {
    const text = userText(buildRoadmapRequest(input, TODAY));
    for (const fact of ['Run a half marathon', 'Prove I can finish things', '2026-09-26', '2026-12-19', '84 days', '5 hours a week', '60 hours']) {
      expect(text).toContain(fact);
    }
  });

  it('leaves out the why when there is none', () =>
    expect(userText(buildRoadmapRequest({ ...input, why: '  ' }, TODAY))).not.toMatch(/why/i));
});

describe('parseRoadmapResponse', () => {
  it('turns the tool call into draft milestones and a note', () =>
    expect(
      parseRoadmapResponse(
        toolReply({
          milestones: [{ title: 'Base', tasks: [{ title: 'Run 3 km easy', minutes: 30 }] }],
          note: 'Tight but doable.',
        }),
      ),
    ).toEqual({ milestones: [{ title: 'Base', tasks: [{ title: 'Run 3 km easy', minutes: 30 }] }], note: 'Tight but doable.' }));

  it('trims titles and drops blank tasks and milestones left without tasks', () =>
    expect(
      parseRoadmapResponse(
        toolReply({
          milestones: [
            { title: '  Base  ', tasks: [{ title: ' Run ', minutes: 30 }, { title: '   ', minutes: 10 }] },
            { title: 'Empty', tasks: [{ title: '', minutes: 5 }] },
            { title: '   ', tasks: [{ title: 'Orphan', minutes: 5 }] },
          ],
          note: '  ',
        }),
      ),
    ).toEqual({ milestones: [{ title: 'Base', tasks: [{ title: 'Run', minutes: 30 }] }], note: null }));

  it('rounds minutes into 5 to 600 and nulls anything that is not a number', () => {
    const { milestones } = parseRoadmapResponse(
      toolReply({
        milestones: [
          {
            title: 'M',
            tasks: [
              { title: 'a', minutes: 44.6 },
              { title: 'b', minutes: 1 },
              { title: 'c', minutes: 5000 },
              { title: 'd', minutes: '30' },
              { title: 'e' },
            ],
          },
        ],
      }),
    );
    expect(milestones[0].tasks.map((t) => t.minutes)).toEqual([45, 5, 600, null, null]);
  });

  it('caps a runaway plan at 8 milestones of 8 tasks and long titles at 120 characters', () => {
    const tasks = Array.from({ length: 12 }, (_, i) => ({ title: `Task ${i}`, minutes: 30 }));
    const { milestones } = parseRoadmapResponse(
      toolReply({ milestones: Array.from({ length: 12 }, () => ({ title: 'x'.repeat(300), tasks })) }),
    );
    expect(milestones).toHaveLength(8);
    expect(milestones[0].tasks).toHaveLength(8);
    expect(milestones[0].title).toHaveLength(120);
  });

  it.each([
    ['no tool call', { content: [{ type: 'text', text: 'Here is a plan...' }], stop_reason: 'end_turn' }],
    ['no usable milestone', toolReply({ milestones: [{ title: 'M', tasks: [] }] })],
    ['a missing milestones list', toolReply({ note: 'hi' })],
    ['not an object at all', null],
  ])('rejects a reply with %s', (_, body) => expect(failure(() => parseRoadmapResponse(body))).toBe('bad-response'));
});

describe('hasDraftSteps', () => {
  it('is false for the untouched blank milestone', () =>
    expect(hasDraftSteps([{ title: ' ', tasks: [{ title: '', minutes: null }] }])).toBe(false));

  it('is true once any milestone or task has a name', () => {
    expect(hasDraftSteps([{ title: 'Base', tasks: [{ title: '', minutes: null }] }])).toBe(true);
    expect(hasDraftSteps([{ title: '', tasks: [{ title: 'Run', minutes: null }] }])).toBe(true);
  });
});
