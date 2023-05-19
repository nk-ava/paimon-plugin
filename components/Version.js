import lodash from "lodash";
import cfs from "../../../lib/config/config.js";
import fs from "node:fs";

const _path = process.cwd();
const logPath = `${_path}/plugins/paimon-plugin/CHANGELOG.md`;

let currentVersion = '1.2.9';
let changeLogs = [];
let versionCnt = 4;

function getLine(line) {
    line = line.replace(/(^\s*\*|\r)/g, '')
    line = line.replace(/\s*`([^`]+`)/g, '<span class="cmd">$1')
    line = line.replace(/`\s*/g, '</span>')
    line = line.replace(/\s*\*\*([^\*]+\*\*)/g, '<span class="strong">$1')
    line = line.replace(/\*\*\s*/g, '</span>')
    line = line.replace(/ⁿᵉʷ/g, '<span class="new"></span>')
    return line
}

try {
    if (fs.existsSync(logPath)) {
        let logs = fs.readFileSync(logPath, 'utf8') || ''
        logs = logs.split('\n')
        let temp = {}
        let lastLine = {}
        lodash.forEach(logs, (line) => {
            if (versionCnt <= -1) {
                return false
            }
            let versionRet = /^#\s*([0-9a-zA-Z\\.~\s]+?)\s*$/.exec(line)
            if (versionRet && versionRet[1]) {
                let v = versionRet[1].trim()
                if (!currentVersion) {
                    currentVersion = v
                } else {
                    temp = {
                        version: v,
                        logs: []
                    }
                    changeLogs.push(temp)
                    versionCnt--
                }
            } else {
                if (!line.trim()) {
                    return
                }
                if (/^\*/.test(line)) {
                    lastLine = {
                        title: getLine(line),
                        logs: []
                    }
                    temp.logs.push(lastLine)
                } else if (/^\s{2,}\*/.test(line)) {
                    lastLine.logs.push(getLine(line))
                }
            }
        })
    }
} catch (e) {
    // do nth
}

let Version = {
    get version() {
        return currentVersion;
    },
    get masterQQ() {
        return cfs.masterQQ;
    },
    get toText() {
        return `Created By Yunzai-Bot<span class="version">3.0.0</span> & Paimon-Plugin<span class="version">${currentVersion}</span>`
    },
    get changelogs() {
        return changeLogs
    }
}
export default Version;