const { isNonEmptyString } = require('../../utils/validate');

test('non-empty string -> true', () => {
  expect(isNonEmptyString('abc')).toBe(true);
});

test('spaces -> false', () => {
  expect(isNonEmptyString('   ')).toBe(false);
});

test('non-string -> false', () => {
  expect(isNonEmptyString(123)).toBe(false);
});
