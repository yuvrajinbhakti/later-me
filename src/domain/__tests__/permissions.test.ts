import { missingPermissions } from '../permissions';

const all = { usage: true, overlay: true, notifications: true };

it('needs nothing when everything is granted', () => {
  expect(missingPermissions('gentle', all)).toEqual([]);
  expect(missingPermissions('savage', all)).toEqual([]);
});

it('always needs usage access', () =>
  expect(missingPermissions('normal', { ...all, usage: false })).toEqual(['usage']));

it('gentle needs notifications but not the overlay', () =>
  expect(missingPermissions('gentle', { usage: true, overlay: false, notifications: false })).toEqual(['notifications']));

it('normal and savage need the overlay but only recommend notifications', () => {
  const perms = { usage: true, overlay: false, notifications: false };
  expect(missingPermissions('normal', perms)).toEqual(['overlay']);
  expect(missingPermissions('savage', perms)).toEqual(['overlay']);
});
