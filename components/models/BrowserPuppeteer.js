import fs from "node:fs";
import lodash from "lodash";
import path from "path";

let puppeteer = {}

class BrowserPuppeteer {
    constructor() {
        this.browser = false;
        this.lock = false;
        this.shoting = [];
        this.path = "./data/browserScreenShot"
        /**截图达到100重启browser**/
        this.restartNum = 100;
        /**截图次数**/
        this.renderNum = 0;
        this.config = {
            headless: true,
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--no-sandbox',
                '--no-zygote',
                '--single-process'
            ]
        }
        if (!fs.existsSync(`${this.path}`)) fs.mkdirSync(`${this.path}`);
    }

    async initPupp() {
        if (!lodash.isEmpty(puppeteer)) return puppeteer
        puppeteer = (await import('puppeteer')).default
        return puppeteer
    }

    /**
     * 初始化chromium
     */
    async browserInit() {
        await this.initPupp()
        if (this.browser) return this.browser
        if (this.lock) return false
        this.lock = true
        logger.mark('browserPuppeteer Chromium 启动中...')
        /** 初始化puppeteer */
        this.browser = await puppeteer.launch(this.config).catch((err) => {
            logger.error(err.toString())
            if (String(err).includes('correct Chromium')) {
                logger.error('没有正确安装Chromium，可以尝试执行安装命令：node ./node_modules/puppeteer/install.js')
            }
        })
        this.lock = false
        if (!this.browser) {
            logger.error('puppeteer Chromium 启动失败')
            return false
        }
        logger.mark('browserPuppeteer Chromium 启动成功')
        /** 监听Chromium实例是否断开 */
        this.browser.on('disconnected', (e) => {
            logger.error('Chromium实例关闭或崩溃！')
            this.browser = false
        })
        return this.browser
    }

    /**
     * 实现访问网站截图
     * @param name 截图模板名称
     * @param data 参数
     * @param data.jumpUrl 跳转的网页
     * @param data.selector 选择截图的部分
     * @param data.saveName 保存的截图名称
     * @param data.pageScript 执行js
     * @returns {Promise<void>}
     */
    async screenshot(name, data = {}) {
        if (!await this.browserInit()) {
            return false
        }
        if (!fs.existsSync(`${this.path}/${name}`)) fs.mkdirSync(`${this.path}/${name}`);
        let buf = "";
        this.shoting.push(name)
        let start = new Date();
        try {
            const page = await this.browser.newPage();
            await page.goto(`${data.jumpUrl}`);
            if (data.pageScript) await page.evaluate(data.pageScript);
            await page.waitForSelector(data.selector);
            let body = await page.$(data.selector) || await page.$("body")
            let shotOption = {
                type: 'png',
                path: `${this.path}/${name}/${data.saveName}.png`
            }
            buf = await body.screenshot(shotOption);
            page.close().catch(err => logger.error(err))
        } catch (error) {
            logger.error(`图片生成失败:${name}:${error}`)
            /** 关闭浏览器 */
            if (this.browser) {
                await this.browser.close().catch((err) => logger.error(err))
            }
            this.browser = false
            buf = ''
        } finally {
            this.shoting.pop()
        }

        if (!buf) {
            logger.error(`图片生成为空:${name}`)
            return false
        }
        this.renderNum++;
        /** 计算图片大小 */
        let kb = (buf.length / 1024).toFixed(2) + 'kb'
        logger.mark(`[puppeteer图片生成][${name}][${this.renderNum}次] ${kb} ${logger.green(`${Date.now() - start}ms`)}`)
        this.restart()
        return segment.image(buf)
    }

    /** 重启 */
    restart() {
        /** 截图超过重启数时，自动关闭重启浏览器，避免生成速度越来越慢 */
        if (this.renderNum >= this.restartNum) {
            if (this.shoting.length <= 0) {
                setTimeout(async () => {
                    if (this.browser) {
                        await this.browser.close().catch((err) => logger.error(err))
                    }
                    this.browser = false
                    logger.mark('browserPuppeteer 关闭重启...')
                }, 100)
            }
        }
    }
}

export default new BrowserPuppeteer();