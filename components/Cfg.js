import fs from "node:fs"

let cfg = {}

function getCfg(type) {
    if (fs.existsSync(`./plugins/paimon-plugin/config/config/${type}Cfg.json`)) {
        let transCfg = fs.readFileSync(`./plugins/paimon-plugin/config/config/${type}Cfg.json`);
        cfg[type] = JSON.parse(transCfg);
        return cfg[type];
    }
}

let Cfg = {
    get(type) {
        if (cfg[type]) {
            return cfg[type];
        } else return getCfg(type)
    },
    set(type, config) {
        let typeCfg = JSON.stringify(config, null, "\t");
        fs.writeFileSync(`./plugins/paimon-plugin/config/config/${type}Cfg.json`, typeCfg, "utf-8")
        cfg[type] = config;
    },
    del(type) {
        delete cfg[type];
        fs.unlinkSync(`./plugins/paimon-plugin/config/config/${type}Cfg.json`);
    }
}
export default Cfg;