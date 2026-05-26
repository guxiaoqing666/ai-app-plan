const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("data/routes.js", "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const routes = context.window.CITYWALK_ROUTES;
if (!Array.isArray(routes)) {
  throw new Error("CITYWALK_ROUTES must be an array");
}

if (routes.length < 10) {
  throw new Error(`Expected at least 10 routes, got ${routes.length}`);
}

const ids = new Set();
for (const route of routes) {
  const required = ["id", "city", "title", "duration", "budgetMin", "budgetMax", "stops", "xhs"];
  for (const key of required) {
    if (!route[key]) {
      throw new Error(`Route ${route.id || "(missing id)"} is missing ${key}`);
    }
  }

  if (ids.has(route.id)) {
    throw new Error(`Duplicate route id: ${route.id}`);
  }
  ids.add(route.id);

  if (!Array.isArray(route.stops) || route.stops.length < 3) {
    throw new Error(`Route ${route.id} needs at least 3 stops`);
  }

  if (!route.xhs.title || !route.xhs.body || !Array.isArray(route.xhs.tags)) {
    throw new Error(`Route ${route.id} has invalid xhs copy`);
  }
}

console.log(`Validated ${routes.length} routes.`);
