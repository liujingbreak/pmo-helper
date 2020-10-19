"use strict";
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
exports.assignIssues = exports.moveIssues = exports.checkTask = exports.testDate = exports.listParent = exports.sync = exports.listStory = exports.domToIssues = exports.login = void 0;
// tslint:disable no-console
const fs_1 = __importDefault(require("fs"));
const jsYaml = __importStar(require("js-yaml"));
const lodash_1 = __importDefault(require("lodash"));
const moment_1 = __importDefault(require("moment"));
const __api_1 = __importDefault(require("__api"));
const puppeteer_1 = require("./puppeteer");
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = __importDefault(require("log4js"));
moment_1.default.locale('zh-cn');
const log = log4js_1.default.getLogger('jira-helper');
const DEFAULT_TASK_MODULE_VALUE = '大C线-研发';
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const pages = yield browser.pages();
        yield pages[0].goto('https://issue.bkjk-inc.com', { timeout: 0, waitUntil: 'domcontentloaded' });
    });
}
exports.login = login;
// export await function waitForCondition()
function domToIssues(page, onEachPage) {
    return __awaiter(this, void 0, void 0, function* () {
        let issues = [];
        let pageIdx = 1;
        while (true) {
            log.info('Page %s: %s', pageIdx++, page.url());
            const currPageIssues = yield fetchPage();
            issues = issues.concat(currPageIssues);
            const nextPageLink = yield page.$('.pagination > a.nav-next');
            if (nextPageLink == null)
                break;
            yield nextPageLink.click();
            // check first cell, wait for its DOM mutation
            const lastFirstRowId = currPageIssues[0].id;
            yield page.waitForFunction((originIssueId) => {
                const td = document.querySelector('#issuetable > tbody > tr > td');
                return td && td.innerText.length > 0 && td.innerText.trim() !== originIssueId;
            }, { polling: 'mutation' }, lastFirstRowId);
            yield page.waitFor(500);
        }
        function fetchPage() {
            return __awaiter(this, void 0, void 0, function* () {
                const trPairs = [];
                const table = yield page.$('#issuetable');
                if (table == null)
                    return [];
                const cellTitles = yield getCellTitles(table);
                log.info('List headers:', cellTitles.join(', '));
                const done = yield Promise.all((yield table.$$(':scope > tbody > tr')).map((row) => __awaiter(this, void 0, void 0, function* () {
                    // Fill title2ValueMap and clsMap
                    const clsMap = yield row.$$eval(':scope > td', els => {
                        const colMap = {};
                        for (let i = 0, l = els.length; i < l; i++) {
                            const el = els[i];
                            const value = el.innerText;
                            colMap[el.className] = value;
                        }
                        return colMap;
                    });
                    const title2ValueMap = {};
                    (yield Promise.all((yield row.$$(':scope > td')).map((td) => __awaiter(this, void 0, void 0, function* () {
                        return (yield td.getProperty('innerText')).jsonValue();
                    })))).forEach((value, i) => title2ValueMap[cellTitles[i++]] = value);
                    // log.info(util.inspect(title2ValueMap));
                    // log.info(clsMap);
                    const trimedMap = {};
                    for (const key of Object.keys(clsMap)) {
                        trimedMap[key.trimLeft().split(/[\n\r]+/)[0]] = clsMap[key].trim();
                    }
                    // create Issue object
                    const issue = {
                        name: '',
                        ver: [trimedMap.fixVersions],
                        status: trimedMap.status,
                        assignee: trimedMap.assignee,
                        id: trimedMap.issuekey,
                        endDate: title2ValueMap['End date']
                    };
                    if (onEachPage)
                        trPairs.push([issue, row]);
                    // assign issue name and issue parent id
                    const links = yield row.$$(':scope > td.summary a.issue-link');
                    if (links.length > 1) {
                        const parentId = yield (yield links[0].getProperty('innerText')).jsonValue();
                        issue.parentId = parentId;
                        issue.name = (yield (yield links[1].getProperty('innerText')).jsonValue());
                    }
                    else {
                        issue.name = (yield (yield links[0].getProperty('innerText')).jsonValue());
                    }
                    issue.ver = yield Promise.all((yield row.$$(':scope > td.fixVersions > *'))
                        .map((a) => __awaiter(this, void 0, void 0, function* () { return (yield a.getProperty('innerText')).jsonValue(); })));
                    if (trimedMap.aggregatetimeestimate) {
                        issue.est = estimationToNum(trimedMap.aggregatetimeestimate.trim());
                    }
                    return issue;
                })));
                if (onEachPage)
                    yield onEachPage(trPairs);
                return done;
            });
        }
        return issues;
    });
}
exports.domToIssues = domToIssues;
function listStory(
// tslint:disable-next-line: max-line-length
url = 'https://issue.bkjk-inc.com/issues/?filter=14118') {
    return __awaiter(this, void 0, void 0, function* () {
        const includeProj = __api_1.default.argv.include ?
            new Set(__api_1.default.argv.include.split(',').map(el => el.trim())) :
            null;
        if (includeProj)
            console.log('include project prfiex: ', includeProj);
        const includeVer = __api_1.default.argv.includeVersion ?
            (__api_1.default.argv.includeVersion + '').split(',').map(el => el.trim().toLocaleLowerCase()) : null;
        const browser = yield puppeteer_1.launch(false);
        const pages = yield browser.pages();
        yield pages[0].goto(url, { timeout: 0, waitUntil: 'networkidle2' });
        yield pages[0].waitFor('#issuetable > tbody', { visible: true });
        // tslint:disable-next-line: no-console
        log.info('fetching page done');
        const page = pages[0];
        let issues = yield domToIssues(page, forStorys);
        if (includeProj) {
            issues = issues.filter(issue => {
                const prefix = issue.id.slice(0, issue.id.indexOf('-'));
                return includeProj.has(prefix);
            });
        }
        if (includeVer) {
            issues = issues.filter(issue => {
                // console.log(issue.ver, includeVer);
                return issue.ver.map(ver => ver.toLowerCase())
                    .some(version => includeVer.some(include => version.indexOf(include) >= 0));
            });
        }
        log.info('Num of stories:', issues.length);
        // for (const issue of issues) {
        function forStorys(trPairs) {
            return __awaiter(this, void 0, void 0, function* () {
                for (const [issue, tr] of trPairs) {
                    const prefix = issue.id.slice(0, issue.id.indexOf('-'));
                    if (includeProj && !includeProj.has(prefix) ||
                        includeVer && !issue.ver.map(ver => ver.toLowerCase())
                            .some(version => includeVer.some(include => version.indexOf(include) >= 0))) {
                        continue;
                    }
                    const anchors = yield tr.$$(`:scope > .issuekey > a.issue-link[data-issue-key=${issue.id}]`);
                    let linkClicked = false;
                    for (const anchor of anchors) {
                        const bx = yield anchor.boundingBox();
                        if (bx && bx.height > 10 && bx.width > 10) {
                            log.info('Go issue details: ', issue.id);
                            yield anchor.click();
                            yield page.waitForSelector('.list-view', { hidden: true });
                            issue.tasks = yield listSubtasks(page, issue);
                            yield page.goBack({ waitUntil: 'networkidle0' });
                            linkClicked = true;
                            break;
                        }
                    }
                    if (!linkClicked) {
                        throw new Error(`Can not find link for ${issue.id}`);
                    }
                }
            });
        }
        // const grouped = _.groupBy(issues, issue => issue.id.slice(0, issue.id.indexOf('-')));
        const grouped = lodash_1.default.groupBy(issues, issue => issue.ver && issue.ver.length > 0 ? issue.ver[0] : 'No version');
        fs_1.default.writeFileSync(__api_1.default.config.resolve('rootPath', 'dist/list-story.yaml'), jsYaml.safeDump(grouped));
        log.info('Result has been written to dist/list-story.yaml');
        yield browser.close();
        // tslint:disable-next-line: no-console
        console.log('Have a nice day');
    });
}
exports.listStory = listStory;
function sync(opt, sourceYamlFile) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const pages = yield browser.pages();
        const issueByProj = jsYaml.load(fs_1.default.readFileSync(sourceYamlFile ? sourceYamlFile : __api_1.default.config.resolve('rootPath', 'dist/list-story.yaml'), 'utf8'));
        for (const proj of Object.keys(issueByProj)) {
            const issues = issueByProj[proj];
            log.info(issues.length);
            for (const issue of issues) {
                if (issue.tasks) {
                    log.info('Check issue', issue.id);
                    const tasksWithoutId = issue.tasks
                        .filter(task => task.id == null);
                    // log.info(tasksWithoutId);
                    if (tasksWithoutId.length > 0)
                        yield createTasks(issue, tasksWithoutId, pages[0]);
                }
                const toAdd = issue['+'];
                if (toAdd) {
                    const tasks = [];
                    for (const assignee of Object.keys(toAdd)) {
                        for (const line of toAdd[assignee]) {
                            const [name] = line.split(/[\r\n]+/);
                            const desc = line;
                            const item = {
                                name,
                                desc,
                                assignee
                            };
                            tasks.push(item);
                        }
                    }
                    yield createTasks(issue, tasks, pages[0]);
                }
            }
        }
        yield browser.close();
    });
}
exports.sync = sync;
function createTasks(parentIssue, tasks, page) {
    return __awaiter(this, void 0, void 0, function* () {
        yield page.goto('https://issue.bkjk-inc.com/browse/' + parentIssue.id, { timeout: 0, waitUntil: 'networkidle2' });
        const remoteTasks = yield listSubtasks(page, parentIssue);
        parentIssue.ver = yield Promise.all((yield page.$$('#fixfor-val a'))
            .map(a => a.getProperty('innerText').then(jh => jh.jsonValue())));
        const isHdecor = parentIssue.id.startsWith('HDECOR');
        const prefix = isHdecor ? '装贝-FE-' : 'FE - ';
        tasks.forEach(task => {
            if (!task.name.startsWith(prefix))
                task.name = prefix + task.name;
        });
        const toAdd = lodash_1.default.differenceBy(tasks, remoteTasks, issue => issue.name);
        log.info('Creating new issue\n', toAdd);
        for (const item of toAdd) {
            item.ver = parentIssue.ver;
            yield _addSubTask(page, item);
        }
    });
}
function _addSubTask(page, task) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info('adding', task);
        yield clickMoreButton(page, '创建子任务');
        yield page.waitFor('#create-subtask-dialog', { visible: true });
        const dialog = yield page.$('#create-subtask-dialog');
        if (!dialog)
            throw new Error('Adding issue dialog not found');
        yield dialog.$('input[name=summary]')
            .then(input => input.type(task.name));
        // const input = await dialog.$('#fixVersions-textarea');
        // await input!.click();
        // log.info('version:', task.ver![0]);
        // await input!.type(task.ver![0], {delay: 100});
        // await page.keyboard.press('Enter');
        yield dialog.$('#description-wiki-edit').then(el => el.click());
        yield page.keyboard.type(task.desc ? task.desc : task.name);
        const labels = yield dialog.$$('.field-group > label');
        const texts = yield Promise.all(labels.map(label => label.getProperty('innerText').then(v => v.jsonValue())));
        const labelMap = {};
        texts.forEach((text, idx) => labelMap[text.split(/[\n\r\t]+/)[0]] = labels[idx]);
        // log.info(Object.keys(labelMap));
        const matchName = /[(（]([0-9.]+[dhDH]?)[)）]\s*$/.exec(task.name);
        let duration = matchName ? matchName[1] : '0.5d';
        if (!duration.endsWith('d') && !duration.endsWith('h')) {
            duration = duration + 'd';
        }
        const dates = date();
        const formValues = {
            任务提出日期: dates[0],
            Deadline日期: endDateBaseOnVersion(task.ver[0]) || dates[1],
            // tslint:disable-next-line: object-literal-key-quotes
            '初始预估': duration,
            剩余的估算: duration,
            经办人: task.assignee || '刘晶'
        };
        for (const name of Object.keys(labelMap)) {
            if (name.indexOf('模块') >= 0 && !lodash_1.default.has(formValues, name)) {
                const id = (yield labelMap[name].evaluate(el => el.getAttribute('for')));
                const inputEl = yield page.$('#' + id);
                const value = yield inputEl.evaluate(el => el.value);
                if (value.trim().length === 0) {
                    yield inputEl.click();
                    yield page.keyboard.type(DEFAULT_TASK_MODULE_VALUE, { delay: 50 });
                }
                continue;
            }
            if (!lodash_1.default.has(formValues, name))
                continue;
            yield labelMap[name].click({ delay: 50 });
            yield new Promise(resolve => setTimeout(resolve, 200));
            yield page.keyboard.type(formValues[name], { delay: 50 });
            if (name === '经办人') {
                yield new Promise(resolve => setTimeout(resolve, 500)); // wait for JIRA searching user
                yield page.keyboard.press('Enter', { delay: 50 });
            }
        }
        yield dialog.$('#create-issue-submit').then(btn => btn.click());
        yield page.waitFor('#create-subtask-dialog', { hidden: true });
        yield new Promise(resolve => setTimeout(resolve, 1000));
    });
}
function listSubtasks(page, { ver }) {
    return __awaiter(this, void 0, void 0, function* () {
        const tasks = yield page.$$eval('#view-subtasks #issuetable > tbody > tr', (els, ver) => {
            return els.map(el => {
                const name = el.querySelector(':scope > .stsummary > a');
                const subtask = {
                    name: name ? name.innerText.trim() : '',
                    id: el.getAttribute('data-issuekey'),
                    status: el.querySelector('.status').innerText.trim(),
                    ver,
                    // assignee: ''
                    assignee: el.querySelector('.assignee').innerText.trim()
                };
                return subtask;
            });
        }, ver);
        return tasks;
    });
}
function listParent() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const page = (yield browser.pages())[0];
        const storyMap = new Map();
        // tslint:disable-next-line: max-line-length
        yield page.goto('https://issue.bkjk-inc.com/issues/?filter=14109', { waitUntil: 'networkidle2' });
        yield domToIssues(page, (rows) => __awaiter(this, void 0, void 0, function* () {
            for (const [issue, tr] of rows) {
                if (issue.parentId) {
                    const link = yield tr.$(':scope > td.summary a.issue-link');
                    const pname = yield page
                        .evaluate(el => el.getAttribute('title'), link);
                    let pIssue;
                    if (!storyMap.has(issue.parentId)) {
                        pIssue = {
                            brief: pname,
                            name: pname,
                            id: issue.parentId,
                            status: '',
                            assignee: '',
                            ver: [],
                            est: 0,
                            tasks: []
                        };
                        storyMap.set(issue.parentId, pIssue);
                    }
                    else {
                        pIssue = storyMap.get(issue.parentId);
                    }
                    if (/API\s*联调/i.test(issue.name)) {
                        pIssue.intEst = issue.est;
                    }
                    else {
                        pIssue.est += issue.est;
                    }
                    pIssue.tasks.push(issue);
                }
            }
        }));
        console.log('Writted to dist/parent-story.yaml');
        const stories = Array.from(storyMap.values());
        fs_1.default.writeFileSync('dist/parent-story.yaml', jsYaml.safeDump(stories));
        console.log(stories.map(story => displayIssue(story)).join('\n'));
        browser.close();
    });
}
exports.listParent = listParent;
function date() {
    const time = moment_1.default();
    // console.log(time.format('D/MMMM/YY'), time.add(21, 'days').format('D/MMMM/YY'));
    return [time.format('D/MMMM/YY'), time.add(30, 'days').format('D/MMMM/YY')];
}
function estimationToNum(estimationStr) {
    const match = /([0-9.]+)(日|小时|分)/.exec(estimationStr);
    if (!match) {
        throw new Error(`Invalide estimation format: ${estimationStr}`);
    }
    if (match[2] === '小时') {
        return parseFloat(match[1]) / 8;
    }
    else if (match[2] === '分') {
        return parseInt(match[1], 10) / 8 / 60;
    }
    return parseFloat(match[1]);
}
function displayIssue(issue) {
    return chalk_1.default.cyan(issue.id) + ` ${chalk_1.default.gray(issue.name)} (${issue.est}) | API int:${issue.intEst || '0'}`;
}
function endDateBaseOnVersion(ver) {
    const verMatch = /(\d{1,2})(\d\d)$/.exec(ver);
    if (verMatch == null || verMatch[1] == null) {
        return null;
    }
    const time = moment_1.default();
    time.month(parseInt(verMatch[1], 10) - 1);
    time.date(parseInt(verMatch[2], 10));
    // time.subtract(5, 'days');
    if (time.isBefore(new Date())) {
        time.add(1, 'years');
    }
    return time.format('DD/MMMM/YY');
}
function testDate() {
    console.log(endDateBaseOnVersion('feafa/903'));
    console.log(moment_1.default('15/十月/19', 'DD/MMMM/YY').toDate());
}
exports.testDate = testDate;
/**
 * Check README.md for command line arguments
 */
function checkTask(updateVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        yield browser.newPage();
        const pages = yield browser.pages();
        const url = 'https://issue.bkjk-inc.com/issues/?filter=14109';
        yield pages[1].goto(url, { timeout: 0, waitUntil: 'networkidle2' });
        const parentSet = new Set();
        const compareToDate = moment_1.default().add(__api_1.default.argv.endInDays || 3, 'days');
        log.info('Comparent to end date:', compareToDate.format('YYYY/M/D'));
        yield domToIssues(pages[1], (rows) => __awaiter(this, void 0, void 0, function* () {
            rows = rows.filter(([task]) => task.status === '开放' || task.status === 'DEVELOPING');
            parentSet.clear();
            for (const row of rows) {
                const [task] = row;
                // console.log(task);
                if (task.parentId) {
                    parentSet.add(task.parentId);
                }
            }
            const parentMap = yield listIssueByIds(pages[0], Array.from(parentSet.values()));
            for (const [task, tr] of rows) {
                const endDateObj = moment_1.default(task.endDate, 'DD/MMMM/YY');
                if (task.endDate && endDateObj.isBefore(compareToDate)) {
                    // tslint:disable-next-line:max-line-length
                    log.warn(`End date:${task.endDate} "${displayIssue(task)}"`);
                    if (__api_1.default.argv.addDays) {
                        yield _editTr(pages[1], tr, {
                            endDate: endDateObj.add(parseInt(__api_1.default.argv.addDays, 10), 'days').format('DD/MMMM/YY')
                        });
                    }
                }
                const parent = parentMap.get(task.parentId);
                if (parent) {
                    const parentEndDateMom = moment_1.default(parent.endDate, 'DD/MMMM/YY');
                    const notSameVersion = task.ver[0] !== parent.ver[0];
                    const earlierEndDate = endDateObj.isBefore(parentEndDateMom);
                    const verDate = endDateBaseOnVersion(parent.ver[0]);
                    const updateToTask = {};
                    let needUpdate = false;
                    if (notSameVersion) {
                        needUpdate = true;
                        // tslint:disable-next-line: max-line-length
                        log.warn(`Task "${displayIssue(task)}"\n  version "${task.ver[0]}" doesn't match parent ${parent.id} "${parent.ver[0]}"\n`);
                        updateToTask.ver = parent.ver;
                    }
                    if (verDate && task.endDate !== verDate) {
                        needUpdate = true;
                        updateToTask.endDate = verDate;
                        // tslint:disable-next-line: max-line-length
                        log.warn(`Task "${displayIssue(task)}"\n  end date "${task.endDate}" doesn't match parent version ${parent.id} "${parent.ver[0]} - ${verDate}"`);
                    }
                    else if (earlierEndDate) {
                        needUpdate = true;
                        updateToTask.endDate = parent.endDate;
                        // tslint:disable-next-line: max-line-length
                        log.warn(`Task "${displayIssue(task)}"\n  end date "${task.endDate}" is earlier than parent ${parent.id} "${parent.endDate}"`);
                    }
                    if (needUpdate && updateVersion === true || __api_1.default.argv.updateVersion) {
                        yield _editTr(pages[1], tr, updateToTask);
                    }
                }
            }
        }));
        yield browser.close();
    });
}
exports.checkTask = checkTask;
function _editTr(page, tr, updateTask) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (yield tr.$$(':scope > .summary .issue-link'))[1].click();
        yield editIssue(page, updateTask);
        yield page.goBack();
        yield page.waitFor(800);
    });
}
function editIssue(page, task) {
    return __awaiter(this, void 0, void 0, function* () {
        const editButton = yield page.waitForSelector('#edit-issue', { visible: true });
        yield editButton.click();
        const dialog = yield page.waitForSelector('#edit-issue-dialog', { visible: true });
        if (task.name) {
            console.log('change name to ', task.name);
            yield dialog.$('input[name=summary]')
                .then(input => input.type(task.name));
        }
        if (task.ver && task.ver.length > 0) {
            console.log('  change version to ', task.ver[0]);
            const input = yield dialog.$('#fixVersions-textarea');
            yield input.click();
            for (let i = 0; i < 5; i++)
                yield input.press('Backspace', { delay: 150 });
            // await page.waitFor(1000);
            yield input.type(task.ver[0], { delay: 100 });
            yield page.keyboard.press('Enter');
        }
        if (task.desc != null) {
            console.log('  change description to', task.desc);
            yield dialog.$('#description-wiki-edit').then(el => el.click());
            yield page.keyboard.type(task.desc ? task.desc : task.name);
        }
        const labels = yield dialog.$$('.field-group > label');
        const texts = yield Promise.all(labels.map(label => label.getProperty('innerText').then(v => v.jsonValue())));
        const labelMap = {};
        texts.forEach((text, idx) => labelMap[text.split(/[\n\r\t]+/)[0]] = labels[idx]);
        const dates = date();
        const formValues = {};
        if (task.ver && task.ver.length > 0)
            formValues['End date'] = endDateBaseOnVersion(task.ver[0]) || dates[1];
        if (task.endDate)
            formValues['End date'] = task.endDate;
        for (const name of Object.keys(labelMap)) {
            if (!lodash_1.default.has(formValues, name))
                continue;
            yield labelMap[name].click({ delay: 50 });
            yield new Promise(resolve => setTimeout(resolve, 200));
            const inputId = '#' + (yield page.evaluate(label => label.getAttribute('for'), labelMap[name]));
            // console.log(inputId);
            const value = yield page.$eval(inputId, input => input.value);
            if (value) {
                for (let i = 0, l = value.length + 2; i < l; i++)
                    yield page.keyboard.press('ArrowRight', { delay: 50 });
                for (let i = 0, l = value.length + 5; i < l; i++)
                    yield page.keyboard.press('Backspace', { delay: 50 });
            }
            console.log('%s: %s -> %s', name, value, formValues[name]);
            yield page.keyboard.type(formValues[name], { delay: 50 });
            // if (name === '经办人') {
            //   await new Promise(resolve => setTimeout(resolve, 500)); // wait for JIRA searching user
            //   await page.keyboard.press('Enter', {delay: 50});
            // }
        }
        yield (yield dialog.$('#edit-issue-submit')).click();
        yield page.waitFor('#edit-issue-dialog', { hidden: true });
        yield page.waitFor(1000);
    });
}
function getCellTitles(issueTable) {
    return __awaiter(this, void 0, void 0, function* () {
        if (issueTable == null)
            return [];
        const ths = yield issueTable.$$(':scope > thead th');
        const titles = yield Promise.all(ths.map((th) => __awaiter(this, void 0, void 0, function* () {
            const header = yield th.$(':scope > span[title]');
            if (header) {
                return (yield header.getProperty('innerText')).jsonValue();
            }
            else {
                return (yield th.getProperty('innerText')).jsonValue();
            }
        })));
        return titles.map(title => title.trim());
    });
}
function listIssueByIds(page, ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const jql = 'jql=' + encodeURIComponent(`id in (${ids.join(',')})`);
        yield page.goto('https://issue.bkjk-inc.com/issues/?' + jql);
        const issueMap = (yield domToIssues(page)).reduce((map, issue) => {
            map.set(issue.id, issue);
            return map;
        }, new Map());
        return issueMap;
    });
}
function moveIssues(newParentId, ...movedIssueIds) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch();
        const page = (yield browser.pages())[0];
        const parentIssueMap = yield listIssueByIds(page, [newParentId]);
        const parentIssue = parentIssueMap.values().next().value;
        console.log(parentIssue);
        for (const id of movedIssueIds) {
            const url = 'https://issue.bkjk-inc.com/browse/' + id;
            yield page.goto(url, { timeout: 0, waitUntil: 'networkidle2' });
            yield page.waitFor('#parent_issue_summary', { visible: true });
            const origParentId = yield page.$eval('#parent_issue_summary', el => el.getAttribute('data-issue-key'));
            if (origParentId !== parentIssue.id) {
                yield clickMoreButton(page, '移动');
                yield new Promise(resolve => setTimeout(resolve, 500));
                // const el = await page.$('html');
                // const html = (await el!.$eval(':scope > body', el => el.innerHTML));
                // console.log(html);
                yield page.waitFor('#move\\.subtask\\.parent\\.operation\\.name_id', { visible: true });
                yield page.click('#move\\.subtask\\.parent\\.operation\\.name_id', { delay: 200 });
                yield new Promise(resolve => setTimeout(resolve, 200));
                yield page.click('#next_submit', { delay: 200 });
                yield page.waitFor('input[name=parentIssue]', { visible: true });
                const input = yield page.$('input[name=parentIssue]');
                yield input.click();
                yield page.keyboard.sendCharacter(newParentId);
                yield page.click('#reparent_submit', { delay: 200 });
                while (true) {
                    if (page.url().startsWith(url))
                        break;
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
                console.log(`${id} is moved to ${newParentId}`);
            }
            yield editIssue(page, { endDate: parentIssue.endDate, ver: parentIssue.ver });
            console.log(`${id} is updated`);
        }
        yield browser.close();
    });
}
exports.moveIssues = moveIssues;
function assignIssues(assignee, ...issueIds) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch();
        const page = (yield browser.pages())[0];
        const jql = 'jql=' + encodeURIComponent(`id in (${issueIds.join(',')})`);
        yield page.goto('https://issue.bkjk-inc.com/issues/?' + jql);
        yield domToIssues(page, (pairs) => __awaiter(this, void 0, void 0, function* () {
            for (const [issue, el] of pairs) {
                if (issue.assignee === assignee)
                    continue;
                const links = yield el.$$(':scope > td > .issue-link');
                if (links && links.length > 0) {
                    const link = links[links.length - 1];
                    yield link.click({ delay: 300 });
                    yield page.waitFor('#assign-issue', { visible: true });
                    yield page.click('#assign-issue', { delay: 300 });
                    yield page.waitFor('#assign-dialog', { visible: true });
                    const input = yield page.$('#assignee-field');
                    yield editInputText(page, input, assignee);
                    yield page.waitFor('body > .ajs-layer', { visible: true });
                    yield page.keyboard.press('Enter', { delay: 100 });
                    yield page.click('#assign-issue-submit', { delay: 100 });
                    yield page.waitFor('#assign-dialog', { hidden: true });
                    // await new Promise(resolve => setTimeout(resolve, 500));
                    yield page.goBack({ waitUntil: 'networkidle0' });
                }
            }
        }));
        yield browser.close();
    });
}
exports.assignIssues = assignIssues;
function clickMoreButton(page, button) {
    return __awaiter(this, void 0, void 0, function* () {
        const moreBtn = yield page.$('#opsbar-operations_more');
        if (moreBtn == null)
            throw new Error('#opsbar-operations_more not found in page'); // click 更多
        yield moreBtn.click({ delay: 100 });
        yield page.waitFor('#opsbar-operations_more_drop', { visible: true });
        const menuItems = yield page.$$('#opsbar-operations_more_drop .trigger-label');
        for (const item of menuItems) {
            const text = yield item.getProperty('innerHTML').then(jh => jh.jsonValue());
            if (text === button) {
                yield new Promise(resolve => setTimeout(resolve, 200));
                yield item.click();
                break;
            }
        }
    });
}
function editInputText(page, inputEl, newValue) {
    return __awaiter(this, void 0, void 0, function* () {
        if (inputEl == null)
            return;
        const value = yield inputEl.evaluate((input) => input.value);
        yield inputEl.click({ delay: 300 });
        if (value) {
            for (let i = 0, l = value.length + 2; i < l; i++)
                yield page.keyboard.press('ArrowRight', { delay: 50 });
            for (let i = 0, l = value.length + 3; i < l; i++)
                yield page.keyboard.press('Backspace', { delay: 50 });
        }
        yield page.keyboard.type(newValue, { delay: 50 });
    });
}

//# sourceMappingURL=jira.js.map
