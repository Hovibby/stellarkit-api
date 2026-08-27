const STROOPS_PER_XLM = 10_000_000;

function parseStellarAmount(stroops) {
  const num = typeof stroops === "string" ? parseInt(stroops, 10) : stroops;
  if (!Number.isFinite(num)) return "0.0000000";
  return (num / STROOPS_PER_XLM).toFixed(7);
}

module.exports = { parseStellarAmount };
