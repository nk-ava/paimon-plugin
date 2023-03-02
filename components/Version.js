import cfs from "../../../lib/config/config.js";

let currentVersion = '1.0.7';

let Version = {
    get version() {
        return currentVersion;
    },
    get masterQQ() {
        return cfs.masterQQ;
    },
    get toText() {
        return `Created By Yunzai-Bot<span class="version">3.0.0</span> & Paimon-Plugin<span class="version">${currentVersion}</span>`
    }
}
export default Version;