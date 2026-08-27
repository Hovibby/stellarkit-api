function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.0000000";
  return num.toFixed(7);
}

module.exports = { formatAmount };
