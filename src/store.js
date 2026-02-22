// src/store.js
const fs = require("fs");

function createStore(path = "data.json") {
  let db = {};
  if (fs.existsSync(path)) db = JSON.parse(fs.readFileSync(path, "utf8"));

  const save = () => fs.writeFileSync(path, JSON.stringify(db, null, 2));

  return {
    get: (k) => db[k],
    set: (k, v) => { db[k] = v; save(); },
    del: (k) => { delete db[k]; save(); },
    all: () => Object.entries(db).map(([key, value]) => ({ key, value })),
  };
}

module.exports = { createStore };
