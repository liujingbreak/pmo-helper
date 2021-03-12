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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlbGxvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJlbGxvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw0QkFBNEI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFNUIsK0JBQW9EO0FBR3BELDhDQUFxRDtBQUNyRCxnREFBa0M7QUFDbEMsMkNBQW1EO0FBRW5ELGtEQUEyQztBQUUzQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRXZELE1BQU0sU0FBUyxHQUFHLGtFQUFrRSxDQUFDO0FBQ3JGLE1BQU0sT0FBTyxHQUFHLGtDQUFrQyxDQUFDO0FBcUJuRCxTQUFzQixVQUFVOztRQUM5QixNQUFNLE9BQU8sR0FBRyxNQUFNLGtCQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEMsd0NBQXdDO1FBQ3hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekIsNENBQTRDO1FBQzVDLE1BQU0sR0FBRyxHQUFHLCtCQUErQixDQUFDO1FBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUMsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE9BQU8sQ0FBQyxHQUFHLENB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QUFFO1lBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDaEQsa0NBQWtDO2dCQUNsQyx5Q0FBeUM7Z0JBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNqRDtZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUFBO0FBbkJELGdDQW1CQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcblxuaW1wb3J0IHtmcm9tLCBvZiwgZm9ya0pvaW4sIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtQYWdlfSBmcm9tICdwdXBwZXRlZXItY29yZSc7XG5pbXBvcnQgKiBhcyB0ciBmcm9tICcuL3RyZWxsbyc7XG5pbXBvcnQge21lcmdlTWFwLCBtYXAsIHJlZHVjZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMganNZYW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHtsYXVuY2gsIHdhaXRGb3JWaXNpYmxlfSBmcm9tICcuL3B1cHBldGVlcic7XG5pbXBvcnQge0lzc3VlfSBmcm9tICcuL2ppcmEnO1xuaW1wb3J0IGF4aW9zLCB7QXhpb3NSZXNwb25zZX0gZnJvbSAnYXhpb3MnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2ppcmEtaGVscGVyJyk7XG5cbmNvbnN0IEFQSV9UT0tFTiA9ICczOGNmZTYzN2VhY2JiY2Y3YmJkOTBiOWVlODNmMzExMTNkMDRiNGQzNGZkNzlmMTNhNWZlNTE2MDhiYTg4MDI4JztcbmNvbnN0IEFQSV9LRVkgPSAnMTg0NmZhYWFiMjE1MTVkNWJhYjA1ZGVjMmZiZGE4YmMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRyZWxsb0NvbHVtbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgaWQ/OiBzdHJpbmc7XG4gIGNhcmRzOiBUcmVsbG9DYXJkW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJlbGxvQ2FyZCB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHNob3J0SWQ6IHN0cmluZztcbiAgaWQ/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBUcmVsbG9BcGlDYXJkIHtcbiAgaWQ6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBiYWRnZXM/OiBhbnlbXTtcbiAgbGFiZWxzPzogYW55W107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0VHJlbGxvKCkge1xuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKGZhbHNlKTtcblxuICBjb25zdCBwYWdlcyA9IGF3YWl0IGJyb3dzZXIucGFnZXMoKTtcbiAgLy8gY29uc3QgcGFnZSA9IGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpO1xuICBjb25zb2xlLnRpbWUoJ2dldCBwYWdlJyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gIGNvbnN0IHVybCA9ICdodHRwczovL3RyZWxsby5jb20vYi9pNnlhSGJGWCc7XG4gIGxvZy5pbmZvKCdHRVQgJyArIHVybCk7XG5cbiAgYXdhaXQgcGFnZXNbMF0uZ290byh1cmwsIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG4gIGNvbnNvbGUubG9nKCdmZXRjaGluZyB0cmVsbG8gZG9uZScpO1xuICBjb25zb2xlLnRpbWVFbmQoJ2dldCBwYWdlJyk7XG4gIGNvbnN0IGNvbHVtbnMgPSBhd2FpdCBsaXN0Q29sdW1uKHBhZ2VzWzBdKTtcbiAgY29uc29sZS5sb2coanNZYW1sLnNhZmVEdW1wKGNvbHVtbnMpKTtcbiAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xuICBjb25zb2xlLmxvZygnSGF2ZSBhIG5pY2UgZGF5Jyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RDb2x1bW4ocGFnZTogUGFnZSk6IFByb21pc2U8dHIuVHJlbGxvQ29sdW1uW10+IHtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjYm9hcmQnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICBjb25zdCBjb2x1bW5zID0gYXdhaXQgcGFnZS4kJCgnI2JvYXJkID4gLmxpc3Qtd3JhcHBlciA+IC5saXN0Jyk7XG5cbiAgcmV0dXJuIG9mKC4uLmNvbHVtbnMpLnBpcGUoXG4gICAgbWVyZ2VNYXAoY29sdW1uRWwgPT4ge1xuICAgICAgcmV0dXJuIGZvcmtKb2luKFxuICAgICAgICBmcm9tKGNvbHVtbkVsLiQoJy5saXN0LWhlYWRlciBoMicpKS5waXBlKFxuICAgICAgICAgIG1lcmdlTWFwKGJkVGl0bGUgPT4gZnJvbShiZFRpdGxlIS5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykpKSxcbiAgICAgICAgICBtZXJnZU1hcCh2YWx1ZSA9PiBmcm9tKHZhbHVlLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPikpXG4gICAgICAgICksXG4gICAgICAgIGZyb20oY29sdW1uRWwuJCQoJy5saXN0LWNhcmQgLmxpc3QtY2FyZC10aXRsZScpKS5waXBlKFxuICAgICAgICAgIG1lcmdlTWFwKGNhcmRzID0+IGZyb20oY2FyZHMpKSxcbiAgICAgICAgICBtZXJnZU1hcChjYXJkID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmb3JrSm9pbihcbiAgICAgICAgICAgICAgZnJvbShjYXJkLiQoJy5jYXJkLXNob3J0LWlkJykpLnBpcGUoXG4gICAgICAgICAgICAgICAgbWVyZ2VNYXAoaWQgPT4gaWQhLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSksXG4gICAgICAgICAgICAgICAgbWVyZ2VNYXAoamggPT4gZnJvbShqaC5qc29uVmFsdWUoKSkgYXMgT2JzZXJ2YWJsZTxzdHJpbmc+KVxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICBmcm9tKGNhcmQuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5waXBlKFxuICAgICAgICAgICAgICAgIG1lcmdlTWFwKGpoID0+IGZyb20oamguanNvblZhbHVlKCkpIGFzIE9ic2VydmFibGU8c3RyaW5nPilcbiAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgbWFwKChbc2hvcnRJZCwgdGl0bGVdKSA9PiAoe3RpdGxlLCBzaG9ydElkfSBhcyB0ci5UcmVsbG9DYXJkKSksXG4gICAgICAgICAgcmVkdWNlPHRyLlRyZWxsb0NhcmQ+KChjYXJkcywgY2FyZCk9PiB7XG4gICAgICAgICAgICBjYXJkcy5wdXNoKGNhcmQpO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmRzO1xuICAgICAgICAgIH0sIFtdKVxuICAgICAgICApXG4gICAgICApO1xuICAgIH0pLFxuICAgIG1hcCgoW25hbWUsIGNhcmRzXSkgPT4ge1xuICAgICAgLy8gbG9nLmluZm8oYCBbICR7bmFtZX0gXSBgKTtcbiAgICAgIC8vIGxvZy5pbmZvKGNhcmRzLm1hcChjYXJkID0+IGAgIC0gJHtjYXJkLnNob3J0SWR9OiAke2NhcmQudGl0bGV9YCkuam9pbignXFxuJykpO1xuICAgICAgcmV0dXJuIHtuYW1lLCBjYXJkc30gYXMgdHIuVHJlbGxvQ29sdW1uO1xuICAgIH0pLFxuICAgIHJlZHVjZTx0ci5UcmVsbG9Db2x1bW4+KChjb2x1bW5zLCBiZCkgPT4ge1xuICAgICAgY29sdW1ucy5wdXNoKGJkKTtcbiAgICAgIHJldHVybiBjb2x1bW5zO1xuICAgIH0sIFtdKVxuICApLnRvUHJvbWlzZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzeW5jRnJvbUppcmEocGFnZTogUGFnZSwgaXNzdWVzOiBJc3N1ZVtdKSB7XG4gIGNvbnN0IGNvbHVtbnMgPSBhd2FpdCBwYWdlLiQkKCcjYm9hcmQgPiAubGlzdC13cmFwcGVyID4gLmxpc3QnKTtcbiAgY29uc3QgY29sTmFtZXM6IHN0cmluZ1tdID0gKGF3YWl0IFByb21pc2UuYWxsKGNvbHVtbnMubWFwKGFzeW5jIGNvbCA9PiAoYXdhaXRcbiAgICAoYXdhaXQgY29sLiQoJy5saXN0LWhlYWRlciBoMicpKSEuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpXG4gICAgKS5qc29uVmFsdWUoKSkgYXMgYW55W11cbiAgKSk7XG5cbiAgY29uc3QgY29sTmFtZVNldCA9IG5ldyBTZXQoY29sTmFtZXMubWFwKG5hbWUgPT4gL14oW1xcU10rKS8uZXhlYyhuYW1lKSFbMV0pKTsgLy8gZ2V0IHNwYWNlIHNlcGFyYXRlZCBwcmVmaXhcbiAgY29uc29sZS5sb2coJ2V4aXN0aW5nIGNvbHVtbiBmb3IgcHJvamVjdHM6XFxuJywgQXJyYXkuZnJvbShjb2xOYW1lU2V0LnZhbHVlcygpKS5qb2luKCdcXG4nKSk7XG5cbiAgZm9yIChjb25zdCBpc3N1ZSBvZiBpc3N1ZXMpIHtcbiAgICBjb25zdCBjb2xOYW1lID0gaXNzdWUuaWQuc2xpY2UoMCwgaXNzdWUuaWQuaW5kZXhPZignLScpKTtcbiAgICBpZiAoIWNvbE5hbWVTZXQuaGFzKGNvbE5hbWUpKSB7XG4gICAgICBhd2FpdCBjcmVhdGVDb2x1bW4ocGFnZSwgY29sTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0ZXN0KCkge1xuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKGZhbHNlKTtcbiAgY29uc3QgcGFnZSA9IChhd2FpdCBicm93c2VyLnBhZ2VzKCkpWzBdO1xuICBhd2FpdCBwYWdlLmdvdG8oXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAnaHR0cHM6Ly90cmVsbG8uY29tL2IvaTZ5YUhiRlgnLFxuICAgIHt3YWl0VW50aWw6ICduZXR3b3JraWRsZTInLCB0aW1lb3V0OiAxMjAwMDB9KTtcbiAgLy8gYXdhaXQgY3JlYXRlQ29sdW1uKHBhZ2UpO1xuICBhd2FpdCBzeW5jRnJvbUppcmEocGFnZSwgW3tcbiAgICBpZDogJ0JDTC1URVNUJyxcbiAgICBuYW1lOiAndGVzdCBpc3N1ZScsXG4gICAgc3RhdHVzOiAnJyxcbiAgICB2ZXI6IFsnYWJjJ10sXG4gICAgYXNzaWduZWU6ICdzdXBlcm1hbidcbiAgfV0pO1xufVxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29sdW1uKHBhZ2U6IFBhZ2UsIG5hbWU6IHN0cmluZykge1xuICBjb25zdCBjb2x1bW4gPSBhd2FpdCBwYWdlLiQoJyNib2FyZCA+IC5qcy1hZGQtbGlzdCcpO1xuICBpZiAoY29sdW1uID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBZGQgY29sdW1uIGJ1dHRvbiBpcyBub3QgZm91bmQnKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yU2VsZWN0b3IoJyNib2FyZCA+IC5qcy1hZGQtbGlzdCBhLm9wZW4tYWRkLWxpc3QnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICBhd2FpdCAoYXdhaXQgY29sdW1uLiQoJ2Eub3Blbi1hZGQtbGlzdCcpKSEuY2xpY2soKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yKDQwMCk7XG4gIGF3YWl0IChhd2FpdCBjb2x1bW4uJCgnaW5wdXRbdHlwZT10ZXh0XScpKSEudHlwZShuYW1lLCB7ZGVsYXk6IDE1MH0pO1xuICBjb25zdCBidXR0b24gPSBhd2FpdCBjb2x1bW4uJCgnaW5wdXQuanMtc2F2ZS1lZGl0Jyk7XG4gIGF3YWl0IGJ1dHRvbiEuY2xpY2soKTtcbiAgYXdhaXQgd2FpdEZvclZpc2libGUoYnV0dG9uISwgZmFsc2UpO1xuICBjb25zb2xlLmxvZygnQ29sdW1uICVzIGFkZGVkJywgbmFtZSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcGlUZXN0KCkge1xuICBjb25zdCByZXMgPSBhd2FpdCBheGlvcy5nZXQoJ2h0dHBzOi8vYXBpLnRyZWxsby5jb20vMS9tZW1iZXJzL21lL2JvYXJkcycsIHtcbiAgICBwYXJhbXM6IHtcbiAgICAgIGtleTogQVBJX0tFWSxcbiAgICAgIHRva2VuOiBBUElfVE9LRU5cbiAgICB9fSk7XG4gIGNvbnNvbGUubG9nKHJlcy5kYXRhKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwaUdldExpc3QoYm9hcmRJZCA9ICc1YWNkYmY2Njc4MDg3ODEyZTg4MzhlYzQnKSB7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGF4aW9zLmdldDxUcmVsbG9Db2x1bW5bXT4oYGh0dHBzOi8vYXBpLnRyZWxsby5jb20vMS9ib2FyZHMvJHtib2FyZElkfS9saXN0c2AsIHtwYXJhbXM6IHtcbiAgICBrZXk6IEFQSV9LRVksXG4gICAgdG9rZW46IEFQSV9UT0tFTlxuICB9fSk7XG4gIGNvbnN0IGxpc3QgPSByZXMuZGF0YTtcbiAgY29uc3Qgb2JzID0gbGlzdFxuICAubWFwKGxpc3QgPT4gZnJvbShheGlvcy5nZXQ8VHJlbGxvQXBpQ2FyZFtdPihgaHR0cHM6Ly9hcGkudHJlbGxvLmNvbS8xL2xpc3RzLyR7bGlzdC5pZH0vY2FyZHNgKSkpO1xuXG4gIGF3YWl0IGZvcmtKb2luPEF4aW9zUmVzcG9uc2U8VHJlbGxvQXBpQ2FyZFtdPj4oLi4ub2JzKS5waXBlKFxuICAgIG1hcChyZXNwb25zZXMgPT4ge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSByZXNwb25zZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHJlc3BvbnNlc1tpXS5kYXRhKTtcbiAgICAgICAgLy8gcmVzLmRhdGFbaV0uY2FyZHMgPSByZXNwb25zZXNbaV0uZGF0YTtcbiAgICAgICAgbG9nLmluZm8oJyVzIE51bWJlciBvZiBjYXJkcycsIGxpc3RbaV0ubmFtZSwgbCk7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhyZXNwb25zZXNbMF0uZGF0YVswXSk7XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcbn1cblxuIl19