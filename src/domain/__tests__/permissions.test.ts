import { missingPermissions, permissionNudge } from '../permissions';

const all = { usage: true, overlay: true, notifications: true, battery: true };

it('needs nothing when everything is granted', () => {
  expect(missingPermissions('gentle', all)).toEqual([]);
  expect(missingPermissions('savage', all)).toEqual([]);
});

it('always needs usage access', () =>
  expect(missingPermissions('normal', { ...all, usage: false })).toEqual(['usage']));

it('gentle needs notifications but not the overlay', () =>
  expect(missingPermissions('gentle', { ...all, overlay: false, notifications: false })).toEqual(['notifications']));

it('normal and savage need the overlay but only recommend notifications', () => {
  const perms = { ...all, overlay: false, notifications: false };
  expect(missingPermissions('normal', perms)).toEqual(['overlay']);
  expect(missingPermissions('savage', perms)).toEqual(['overlay']);
});

it('never requires unrestricted battery', () =>
  expect(missingPermissions('savage', { ...all, battery: false })).toEqual([]));

describe('permissionNudge', () => {
  it('is quiet when everything is granted', () => expect(permissionNudge('normal', true, all)).toBeNull());

  it('points at what callouts cannot work without', () =>
    expect(permissionNudge('normal', true, { ...all, overlay: false })).toEqual({ kind: 'missing', keys: ['overlay'] }));

  it('reports missing permissions before battery restrictions', () =>
    expect(permissionNudge('gentle', true, { ...all, notifications: false, battery: false })).toEqual({
      kind: 'missing',
      keys: ['notifications'],
    }));

  it('suggests unrestricted battery once callouts can otherwise work', () =>
    expect(permissionNudge('savage', true, { ...all, battery: false })).toEqual({ kind: 'battery' }));

  it('does not nag about battery while alerts are off', () =>
    expect(permissionNudge('savage', false, { ...all, battery: false })).toBeNull());
});
