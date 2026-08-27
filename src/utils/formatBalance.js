function formatBalance(value) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return "0.0000000";
  return num.toFixed(7);
}

module.exports = { formatBalance };
