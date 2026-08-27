const routeCounts = new Map();

function routeCounter(req, res, next) {
  const method = req.method;
  const path = req.route?.path || req.path;
  const key = `${method} ${path}`;
  routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
  next();
}

function getRouteCounts() {
  const counts = {};
  for (const [key, value] of routeCounts) {
    counts[key] = value;
  }
  return counts;
}

function resetRouteCounts() {
  routeCounts.clear();
}

module.exports = routeCounter;
module.exports.routeCounter = routeCounter;
module.exports.getRouteCounts = getRouteCounts;
module.exports.resetRouteCounts = resetRouteCounts;
