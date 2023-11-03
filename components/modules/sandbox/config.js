const fs = require("node:fs")
const YAML = require("yaml")

let master = YAML.parse(fs.readFileSync("./config/config/other.yaml", "utf8")).masterQQ;
module.exports.master = master

let modules = YAML.parse(fs.readFileSync("./plugins/paimon-plugin/config/config/startCfg.yaml","utf8")).modules;
module.exports.modules = modules;
