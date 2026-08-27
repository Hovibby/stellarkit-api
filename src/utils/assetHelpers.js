function isNativeAsset(balance) {
  if (!balance) return false;
  const type = balance.asset_type || balance.type;
  return type === "native";
}

function isNonNativeAsset(balance) {
  if (!balance) return false;
  return !isNativeAsset(balance);
}

module.exports = { isNativeAsset, isNonNativeAsset };
