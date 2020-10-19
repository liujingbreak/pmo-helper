"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForVisible = exports.isVisible = exports.main = exports.launch = exports.login = exports.setUseHeadless = void 0;
// tslint:disable: no-console
const path_1 = __importDefault(require("path"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const __api_1 = __importDefault(require("__api"));
const log = require('log4js').getLogger('jira-helper');
let useHeadless = false;
function setUseHeadless(yes) {
    useHeadless = yes;
}
exports.setUseHeadless = setUseHeadless;
// import os from 'os';
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield launch();
        const pages = yield browser.pages();
        yield pages[0].goto('https://trello.com', { timeout: 0, waitUntil: 'domcontentloaded' });
    });
}
exports.login = login;
function launch(headless = false) {
    return __awaiter(this, void 0, void 0, function* () {
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
        if (useHeadless === true) {
            log.info('Enable headless mode');
            headless = true;
        }
        const browser = yield puppeteer_core_1.default.launch({
            headless,
            executablePath: executablePath,
            userDataDir: __api_1.default.config.resolve('destDir', 'puppeteer-temp'),
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
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
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
