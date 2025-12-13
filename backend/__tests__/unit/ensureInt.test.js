const { ensureInt } = require('../../utils/ensureInt');

test('integer string -> number', () => {
  expect(ensureInt('10')).toBe(10);
});

test('float -> NaN', () => {
  expect(Number.isNaN(ensureInt('10.5'))).toBe(true);
});

test('non-number -> NaN', () => {
  expect(Number.isNaN(ensureInt('abc'))).toBe(true);
});
