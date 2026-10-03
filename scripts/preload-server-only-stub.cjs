/**
 * Preload stub so tsx scripts can import server-only modules for runtime QA.
 * Does not weaken production auth — local Node process only.
 */
const Module = require("module");
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const id = String(request);
  if (
    id === "server-only" ||
    id.endsWith("/server-only") ||
    id.endsWith("/server-only/index.js") ||
    id.includes("node_modules/server-only")
  ) {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

// Also intercept Module.prototype.require for relative resolves.
const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  const name = String(id);
  if (
    name === "server-only" ||
    name.endsWith("/server-only") ||
    name.includes("node_modules/server-only")
  ) {
    return {};
  }
  return originalRequire.apply(this, arguments);
};
