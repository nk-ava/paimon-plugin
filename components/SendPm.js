import fs from "node:fs";

function sendPm(content) {
    let faceDir = "./plugins/paimon-plugin/resources/paimon/";
    if (typeof inFo == "undefined") {
        let inFo = fs.readFileSync(faceDir + "info.json");
        global.inFo = JSON.parse(inFo);
    }
    if (inFo[content]) {
        return faceDir + content + Math.floor(Math.random() * inFo[content]) + ".jpg";
    }
    return '';
}
export default sendPm;