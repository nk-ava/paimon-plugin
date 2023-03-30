const fs = require("node:fs")
const YAML = require("yaml")

let cfg = YAML.parse(fs.readFileSync("./config/config/other.yaml", "utf8"))
exports.Cfg = cfg