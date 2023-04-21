import fs from "node:fs";

const faceDir = "./plugins/paimon-plugin/resources/paimon/";
const info = JSON.parse(fs.readFileSync(faceDir + "info.json", "utf-8"));

function sendPm(content) {
    if (info[content]) {
        return faceDir + content + Math.floor(Math.random() * info[content]) + ".jpg";
    }
    return 'error';
}
export default sendPm;