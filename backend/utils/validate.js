function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

module.exports = { isNonEmptyString };

