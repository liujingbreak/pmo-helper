"use strict";
// tslint:disable no-console
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.apiGetList = exports.apiTest = exports.test = exports.listTrello = void 0;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const jsYaml = __importStar(require("js-yaml"));
const puppeteer_1 = require("./puppeteer");
const axios_1 = __importDefault(require("axios"));
const log = require('log4js').getLogger('jira-helper');
const API_TOKEN = '38cfe637eacbbcf7bbd90b9ee83f31113d04b4d34fd79f13a5fe51608ba88028';
const API_KEY = '1846faaab21515d5bab05dec2fbda8bc';
function listTrello() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const pages = yield browser.pages();
        // const page = await browser.newPage();
        console.time('get page');
        // tslint:disable-next-line: max-line-length
        const url = 'https://trello.com/b/i6yaHbFX';
        log.info('GET ' + url);
        yield pages[0].goto(url, { timeout: 0, waitUntil: 'networkidle2' });
        console.log('fetching trello done');
        console.timeEnd('get page');
        const columns = yield listColumn(pages[0]);
        console.log(jsYaml.safeDump(columns));
        yield browser.close();
        console.log('Have a nice day');
    });
}
exports.listTrello = listTrello;
function listColumn(page) {
    return __awaiter(this, void 0, void 0, function* () {
        yield page.waitFor('#board', { visible: true });
        const columns = yield page.$$('#board > .list-wrapper > .list');
        return rxjs_1.of(...columns).pipe(operators_1.mergeMap(columnEl => {
            return rxjs_1.forkJoin(rxjs_1.from(columnEl.$('.list-header h2')).pipe(operators_1.mergeMap(bdTitle => rxjs_1.from(bdTitle.getProperty('innerText'))), operators_1.mergeMap(value => rxjs_1.from(value.jsonValue()))), rxjs_1.from(columnEl.$$('.list-card .list-card-title')).pipe(operators_1.mergeMap(cards => rxjs_1.from(cards)), operators_1.mergeMap(card => {
                return rxjs_1.forkJoin(rxjs_1.from(card.$('.card-short-id')).pipe(operators_1.mergeMap(id => id.getProperty('innerText')), operators_1.mergeMap(jh => rxjs_1.from(jh.jsonValue()))), rxjs_1.from(card.getProperty('innerText')).pipe(operators_1.mergeMap(jh => rxjs_1.from(jh.jsonValue()))));
            }), operators_1.map(([shortId, title]) => ({ title, shortId })), operators_1.reduce((cards, card) => {
                cards.push(card);
                return cards;
            }, [])));
        }), operators_1.map(([name, cards]) => {
            // log.info(` [ ${name} ] `);
            // log.info(cards.map(card => `  - ${card.shortId}: ${card.title}`).join('\n'));
            return { name, cards };
        }), operators_1.reduce((columns, bd) => {
            columns.push(bd);
            return columns;
        }, [])).toPromise();
    });
}
function syncFromJira(page, issues) {
    return __awaiter(this, void 0, void 0, function* () {
        const columns = yield page.$$('#board > .list-wrapper > .list');
        const colNames = (yield Promise.all(columns.map((col) => __awaiter(this, void 0, void 0, function* () {
            return (yield (yield col.$('.list-header h2')).getProperty('innerText')).jsonValue();
        }))));
        const colNameSet = new Set(colNames.map(name => /^([\S]+)/.exec(name)[1])); // get space separated prefix
        console.log('existing column for projects:\n', Array.from(colNameSet.values()).join('\n'));
        for (const issue of issues) {
            const colName = issue.id.slice(0, issue.id.indexOf('-'));
            if (!colNameSet.has(colName)) {
                yield createColumn(page, colName);
            }
        }
    });
}
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const page = (yield browser.pages())[0];
        yield page.goto(
        // tslint:disable-next-line: max-line-length
        'https://trello.com/b/i6yaHbFX', { waitUntil: 'networkidle2', timeout: 120000 });
        // await createColumn(page);
        yield syncFromJira(page, [{
                id: 'BCL-TEST',
                name: 'test issue',
                status: '',
                ver: ['abc'],
                assignee: 'superman'
            }]);
    });
}
exports.test = test;
function createColumn(page, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const column = yield page.$('#board > .js-add-list');
        if (column == null)
            throw new Error('Add column button is not found');
        yield page.waitForSelector('#board > .js-add-list a.open-add-list', { visible: true });
        yield (yield column.$('a.open-add-list')).click();
        yield page.waitFor(400);
        yield (yield column.$('input[type=text]')).type(name, { delay: 150 });
        const button = yield column.$('input.js-save-edit');
        yield button.click();
        yield puppeteer_1.waitForVisible(button, false);
        console.log('Column %s added', name);
    });
}
function apiTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.get('https://api.trello.com/1/members/me/boards', {
            params: {
                key: API_KEY,
                token: API_TOKEN
            }
        });
        console.log(res.data);
    });
}
exports.apiTest = apiTest;
function apiGetList(boardId = '5acdbf6678087812e8838ec4') {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.get(`https://api.trello.com/1/boards/${boardId}/lists`, { params: {
                key: API_KEY,
                token: API_TOKEN
            } });
        const list = res.data;
        const obs = list
            .map(list => rxjs_1.from(axios_1.default.get(`https://api.trello.com/1/lists/${list.id}/cards`)));
        yield rxjs_1.forkJoin(...obs).pipe(operators_1.map(responses => {
            for (let i = 0, l = responses.length; i < l; i++) {
                // console.log(responses[i].data);
                // res.data[i].cards = responses[i].data;
                log.info('%s Number of cards', list[i].name, l);
            }
            console.log(responses[0].data[0]);
        })).toPromise();
    });
}
exports.apiGetList = apiGetList;

//# sourceMappingURL=trello.js.map
