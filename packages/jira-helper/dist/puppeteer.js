"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForVisible = exports.isVisible = exports.main = exports.launch = exports.login = void 0;
const tslib_1 = require("tslib");
// tslint:disable: no-console
const path_1 = tslib_1.__importDefault(require("path"));
const puppeteer_core_1 = tslib_1.__importDefault(require("puppeteer-core"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('jira-helper');
// import os from 'os';
function login() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield launch();
        const pages = yield browser.pages();
        yield pages[0].goto('https://trello.com', { timeout: 0, waitUntil: 'domcontentloaded' });
    });
}
exports.login = login;
function launch(headless = false) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let executablePath;
        switch (process.platform) {
            // Refer to https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md#Mac-OS-X
            case 'darwin':
                executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
                break;
            case 'win32':
                executablePath = path_1.default.resolve(process.env['ProgramFiles(x86)'] || 'c:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe');
                break;
            default:
                const msg = 'jira-helper does not support this platform ' + process.platform;
                log.error(msg);
                throw new Error(msg);
        }
        if (__api_1.default.argv.headless === true) {
            log.info('Enable headless mode');
            headless = true;
        }
        const browser = yield puppeteer_core_1.default.launch({
            headless,
            executablePath: executablePath,
            userDataDir: process.cwd() + '/dist/puppeteer-temp',
            ignoreHTTPSErrors: true,
            defaultViewport: { width: 1236, height: 768 }
        });
        return browser;
    });
}
exports.launch = launch;
function main() {
    console.log(__api_1.default.argv);
}
exports.main = main;
function isVisible(el) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (el == null)
            return false;
        const box = yield el.boundingBox();
        if (box == null || box.height < 5 || box.width < 5)
            return false;
        return true;
    });
}
exports.isVisible = isVisible;
function waitForVisible(el, visible = true, timeout = 30000) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const begin = new Date().getTime();
        while (true) {
            yield new Promise(resolve => setTimeout(resolve, 150));
            if ((yield isVisible(el)) === visible)
                break;
            if (new Date().getTime() - begin > timeout) {
                throw new Error('timeout');
            }
        }
    });
}
exports.waitForVisible = waitForVisible;

//# sourceMappingURL=puppeteer.js.map
