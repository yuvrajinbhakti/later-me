import { describeFailure, failureForStatus, isPlausibleApiKey, maskApiKey, toolInput } from '../ai';

describe('failures', () => {
  it.each([
    [401, 'bad-key'],
    [403, 'bad-key'],
    [429, 'rate-limit'],
    [500, 'overloaded'],
    [529, 'overloaded'],
    [400, 'rejected'],
    [404, 'rejected'],
  ] as const)('HTTP %i is %s', (status, expected) => expect(failureForStatus(status)).toBe(expected));

  it('passes the API reason through for rejected requests', () =>
    expect(describeFailure('rejected', 'Your credit balance is too low.')).toContain('Your credit balance is too low.'));

  it.each(['bad-key', 'rate-limit', 'overloaded', 'network', 'timeout', 'bad-response', 'rejected'] as const)(
    'has a message for %s',
    (f) => expect(describeFailure(f).length).toBeGreaterThan(10),
  );
});

describe('API keys', () => {
  it('accepts Anthropic keys, ignoring pasted whitespace', () =>
    expect(isPlausibleApiKey('  sk-ant-api03-abcdefghijklmnopqrstuvwxyz \n')).toBe(true));

  it.each(['', 'sk-abc', 'sk-ant-', 'hello world'])('rejects %p', (key) => expect(isPlausibleApiKey(key)).toBe(false));

  it('masks all but the prefix and last four characters', () =>
    expect(maskApiKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz')).toBe('sk-ant-…wxyz'));
});

describe('toolInput', () => {
  const reply = { content: [{ type: 'text', text: 'hi' }, { type: 'tool_use', name: 'the_tool', input: { a: 1 } }] };

  it('finds the named tool call among the content blocks', () => expect(toolInput(reply, 'the_tool')).toEqual({ a: 1 }));

  it('is null for another tool or a malformed body', () => {
    expect(toolInput(reply, 'other_tool')).toBeNull();
    expect(toolInput(undefined, 'the_tool')).toBeNull();
    expect(toolInput({ content: 'nope' }, 'the_tool')).toBeNull();
  });
});
