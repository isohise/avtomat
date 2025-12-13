function ensureInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}

module.exports = { ensureInt };

