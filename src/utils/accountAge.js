function buildAccountAgeResponse({ publicKey, createdAtLedger, createdAt }) {
  const created = new Date(createdAt);
  const now = new Date();
  const ageInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  const ageInMonths = Math.floor(ageInDays / 30.4375);
  const ageInYears = Math.floor(ageInDays / 365.25);

  let maturity;
  if (ageInDays < 30) maturity = "new";
  else if (ageInDays < 365) maturity = "established";
  else maturity = "veteran";

  return { publicKey, createdAt, createdAtLedger, ageInDays, ageInMonths, ageInYears, maturity };
}

module.exports = { buildAccountAgeResponse };
