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
function listStory(opts, 
// tslint:disable-next-line: max-line-length
url = 'https://issue.bkjk-inc.com/issues/?filter=14118') {
    return __awaiter(this, void 0, void 0, function* () {
        const includeProj = opts.include ?
            new Set(opts.include.split(',').map(el => el.trim())) :
            null;
        if (includeProj)
            console.log('include project prfiex: ', includeProj);
        const includeVer = opts.includeVersion ?
            (opts.includeVersion + '').split(',').map(el => el.trim().toLocaleLowerCase()) : null;
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
            期望上线时间: endDateBaseOnVersion(task.ver[0]) || dates[1],
            // tslint:disable-next-line: object-literal-key-quotes
            '初始预估': duration,
            剩余的估算: duration,
            经办人: task.assignee || '刘晶'
        };
        for (const name of Object.keys(labelMap)) {
            if (['任务提出日期', 'End date'].includes(name) && lodash_1.default.has(formValues, name)) {
                // If there has been a existing value, skip this field
                const id = (yield labelMap[name].evaluate(el => el.getAttribute('for')));
                const inputEl = yield page.$('#' + id);
                const value = yield inputEl.evaluate(el => el.value);
                if (value.trim().length === 0) {
                    yield inputEl.click();
                    yield page.keyboard.type(formValues[name], { delay: 50 });
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
/**
 * To days
 * @param estimationStr
 */
function estimationToNum(estimationStr) {
    const match = /([0-9.]+)(日|小时|分|d)/.exec(estimationStr);
    if (!match) {
        throw new Error(`Invalide estimation format: ${estimationStr}`);
    }
    if (match[2] === '小时') {
        return parseFloat(match[1]) / 8;
    }
    else if (match[2] === '分') {
        return parseInt(match[1], 10) / 8 / 60;
    }
    else if (match[2] === 'd') {
        return parseFloat(match[1]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamlyYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImppcmEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw0Q0FBb0I7QUFDcEIsZ0RBQWtDO0FBQ2xDLG9EQUF1QjtBQUN2QixvREFBNEI7QUFFNUIsa0RBQXdCO0FBQ3hCLDJDQUFxQztBQUNyQyxrREFBMEI7QUFDMUIsb0RBQTRCO0FBRTVCLGdCQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBMEI1QyxTQUFzQixLQUFLOztRQUN6QixNQUFNLE9BQU8sR0FBRyxNQUFNLGtCQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUM5QyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDO0NBQUE7QUFMRCxzQkFLQztBQUVELDJDQUEyQztBQUUzQyxTQUFzQixXQUFXLENBQUMsSUFBYyxFQUM5QyxVQUFxRTs7UUFFckUsSUFBSSxNQUFNLEdBQVksRUFBRSxDQUFDO1FBQ3pCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixPQUFPLElBQUksRUFBRTtZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sY0FBYyxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUM7WUFDekMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FB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R0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDOUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztTQUN2RDtRQUVELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIGpzWWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgcHVwIGZyb20gJ3B1cHBldGVlci1jb3JlJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgbGF1bmNoIH0gZnJvbSAnLi9wdXBwZXRlZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcblxubW9tZW50LmxvY2FsZSgnemgtY24nKTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2ppcmEtaGVscGVyJyk7XG5cbi8vIGNvbnN0IERFRkFVTFRfVEFTS19NT0RVTEVfVkFMVUUgPSAn5aSnQ+e6vy3noJTlj5EnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICBoZWFkbGVzczogYm9vbGVhbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgSXNzdWUge1xuICBicmllZj86IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICBzdGF0dXM6IHN0cmluZztcbiAgZGVzYz86IHN0cmluZztcbiAgdmVyOiBzdHJpbmdbXTtcbiAgYXNzaWduZWU6IHN0cmluZztcbiAgdGFza3M/OiBJc3N1ZVtdO1xuICBwYXJlbnRJZD86IHN0cmluZztcbiAgZW5kRGF0ZT86IHN0cmluZztcbiAgZXN0PzogbnVtYmVyOyAvLyBlc3RpbWF0aW9uIGR1cmF0aW9uXG4gIGludEVzdD86IG51bWJlcjsgLy8gQVBJIGludGVncmF0aW9uIGVzdGltYXRpb24gZHVyYXRpb25cblxuICAnKyc/OiB7W2Fzc2lnbmVlOiBzdHJpbmddOiBzdHJpbmdbXX07XG59XG5cbnR5cGUgTmV3VGFzayA9IHtba2V5IGluIGtleW9mIElzc3VlXT86IElzc3VlW2tleV19ICYge25hbWU6IHN0cmluZ307XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dpbigpIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaChmYWxzZSk7XG4gIGNvbnN0IHBhZ2VzID0gYXdhaXQgYnJvd3Nlci5wYWdlcygpO1xuICBhd2FpdCBwYWdlc1swXS5nb3RvKCdodHRwczovL2lzc3VlLmJramstaW5jLmNvbScsXG4gICAge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ2RvbWNvbnRlbnRsb2FkZWQnfSk7XG59XG5cbi8vIGV4cG9ydCBhd2FpdCBmdW5jdGlvbiB3YWl0Rm9yQ29uZGl0aW9uKClcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvbVRvSXNzdWVzKHBhZ2U6IHB1cC5QYWdlLFxuICBvbkVhY2hQYWdlPzogKHRyUGFpcnM6IFtJc3N1ZSwgcHVwLkVsZW1lbnRIYW5kbGVdW10pID0+IFByb21pc2U8dm9pZD5cbikge1xuICBsZXQgaXNzdWVzOiBJc3N1ZVtdID0gW107XG4gIGxldCBwYWdlSWR4ID0gMTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBsb2cuaW5mbygnUGFnZSAlczogJXMnLCBwYWdlSWR4KyssIHBhZ2UudXJsKCkpO1xuICAgIGNvbnN0IGN1cnJQYWdlSXNzdWVzID0gYXdhaXQgZmV0Y2hQYWdlKCk7XG4gICAgaXNzdWVzID0gaXNzdWVzLmNvbmNhdChjdXJyUGFnZUlzc3Vlcyk7XG4gICAgY29uc3QgbmV4dFBhZ2VMaW5rID0gYXdhaXQgcGFnZS4kKCcucGFnaW5hdGlvbiA+IGEubmF2LW5leHQnKTtcbiAgICBpZiAobmV4dFBhZ2VMaW5rID09IG51bGwpXG4gICAgICBicmVhaztcbiAgICBhd2FpdCBuZXh0UGFnZUxpbmsuY2xpY2soKTtcbiAgICAvLyBjaGVjayBmaXJzdCBjZWxsLCB3YWl0IGZvciBpdHMgRE9NIG11dGF0aW9uXG5cbiAgICBjb25zdCBsYXN0Rmlyc3RSb3dJZCA9IGN1cnJQYWdlSXNzdWVzWzBdLmlkO1xuXG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yRnVuY3Rpb24oKG9yaWdpbklzc3VlSWQpID0+IHtcbiAgICAgIGNvbnN0IHRkOiBIVE1MRWxlbWVudCB8IG51bGwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaXNzdWV0YWJsZSA+IHRib2R5ID4gdHIgPiB0ZCcpO1xuICAgICAgcmV0dXJuIHRkICYmIHRkLmlubmVyVGV4dC5sZW5ndGggPiAwICYmIHRkLmlubmVyVGV4dC50cmltKCkgIT09IG9yaWdpbklzc3VlSWQ7XG4gICAgfSwge3BvbGxpbmc6ICdtdXRhdGlvbid9LCBsYXN0Rmlyc3RSb3dJZCk7XG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yKDUwMCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmZXRjaFBhZ2UoKSB7XG4gICAgY29uc3QgdHJQYWlyczogW0lzc3VlLCBwdXAuRWxlbWVudEhhbmRsZV1bXSA9IFtdO1xuICAgIGNvbnN0IHRhYmxlID0gYXdhaXQgcGFnZS4kKCcjaXNzdWV0YWJsZScpO1xuICAgIGlmICh0YWJsZSA9PSBudWxsKSByZXR1cm4gW10gYXMgSXNzdWVbXTtcbiAgICBjb25zdCBjZWxsVGl0bGVzID0gYXdhaXQgZ2V0Q2VsbFRpdGxlcyh0YWJsZSk7XG4gICAgbG9nLmluZm8oJ0xpc3QgaGVhZGVyczonLGNlbGxUaXRsZXMuam9pbignLCAnKSk7XG4gICAgY29uc3QgZG9uZSA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgKGF3YWl0IHRhYmxlIS4kJCgnOnNjb3BlID4gdGJvZHkgPiB0cicpKS5tYXAoYXN5bmMgcm93ID0+IHtcblxuICAgICAgICAvLyBGaWxsIHRpdGxlMlZhbHVlTWFwIGFuZCBjbHNNYXBcbiAgICAgICAgY29uc3QgY2xzTWFwID0gYXdhaXQgcm93LiQkZXZhbCgnOnNjb3BlID4gdGQnLCBlbHMgPT4ge1xuICAgICAgICAgIGNvbnN0IGNvbE1hcDoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBlbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGVsc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKGVsIGFzIEhUTUxFbGVtZW50KS5pbm5lclRleHQ7XG4gICAgICAgICAgICBjb2xNYXBbZWwuY2xhc3NOYW1lXSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY29sTWFwO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB0aXRsZTJWYWx1ZU1hcDoge1t0aXRsZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gICAgICAgIChhd2FpdCBQcm9taXNlLmFsbCgoYXdhaXQgcm93LiQkKCc6c2NvcGUgPiB0ZCcpKS5tYXAoYXN5bmMgdGQgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXdhaXQgdGQuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5qc29uVmFsdWUoKTtcbiAgICAgICAgfSkpKS5mb3JFYWNoKCh2YWx1ZSwgaSkgPT4gdGl0bGUyVmFsdWVNYXBbY2VsbFRpdGxlc1tpKytdXSA9IHZhbHVlIGFzIHN0cmluZyk7XG5cbiAgICAgICAgLy8gbG9nLmluZm8odXRpbC5pbnNwZWN0KHRpdGxlMlZhbHVlTWFwKSk7XG4gICAgICAgIC8vIGxvZy5pbmZvKGNsc01hcCk7XG4gICAgICAgIGNvbnN0IHRyaW1lZE1hcDoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNsc01hcCkpIHtcbiAgICAgICAgICB0cmltZWRNYXBba2V5LnRyaW1MZWZ0KCkuc3BsaXQoL1tcXG5cXHJdKy8pWzBdXSA9IGNsc01hcFtrZXldLnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjcmVhdGUgSXNzdWUgb2JqZWN0XG4gICAgICAgIGNvbnN0IGlzc3VlOiBJc3N1ZSA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICB2ZXI6IFt0cmltZWRNYXAuZml4VmVyc2lvbnNdLFxuICAgICAgICAgIHN0YXR1czogdHJpbWVkTWFwLnN0YXR1cyxcbiAgICAgICAgICBhc3NpZ25lZTogdHJpbWVkTWFwLmFzc2lnbmVlLFxuICAgICAgICAgIGlkOiB0cmltZWRNYXAuaXNzdWVrZXksXG4gICAgICAgICAgZW5kRGF0ZTogdGl0bGUyVmFsdWVNYXBbJ0VuZCBkYXRlJ11cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKG9uRWFjaFBhZ2UpXG4gICAgICAgICAgdHJQYWlycy5wdXNoKFtpc3N1ZSwgcm93XSk7XG5cbiAgICAgICAgLy8gYXNzaWduIGlzc3VlIG5hbWUgYW5kIGlzc3VlIHBhcmVudCBpZFxuICAgICAgICBjb25zdCBsaW5rcyA9IGF3YWl0IHJvdy4kJCgnOnNjb3BlID4gdGQuc3VtbWFyeSBhLmlzc3VlLWxpbmsnKTtcbiAgICAgICAgaWYgKGxpbmtzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBjb25zdCBwYXJlbnRJZDogc3RyaW5nID0gYXdhaXQgKGF3YWl0IGxpbmtzWzBdLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgc3RyaW5nO1xuICAgICAgICAgIGlzc3VlLnBhcmVudElkID0gcGFyZW50SWQ7XG4gICAgICAgICAgaXNzdWUubmFtZSA9IGF3YWl0IChhd2FpdCBsaW5rc1sxXS5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykpLmpzb25WYWx1ZSgpIGFzIHN0cmluZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpc3N1ZS5uYW1lID0gYXdhaXQgKGF3YWl0IGxpbmtzWzBdLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgc3RyaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaXNzdWUudmVyID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgKGF3YWl0IHJvdy4kJCgnOnNjb3BlID4gdGQuZml4VmVyc2lvbnMgPiAqJykpXG4gICAgICAgICAgLm1hcChhc3luYyBhID0+IChhd2FpdCBhLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+KVxuICAgICAgICApO1xuXG4gICAgICAgIGlmICh0cmltZWRNYXAuYWdncmVnYXRldGltZWVzdGltYXRlKSB7XG4gICAgICAgICAgaXNzdWUuZXN0ID0gZXN0aW1hdGlvblRvTnVtKHRyaW1lZE1hcC5hZ2dyZWdhdGV0aW1lZXN0aW1hdGUudHJpbSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNzdWU7XG4gICAgICB9KVxuICAgICk7XG4gICAgaWYgKG9uRWFjaFBhZ2UpXG4gICAgICBhd2FpdCBvbkVhY2hQYWdlKHRyUGFpcnMpO1xuXG4gICAgcmV0dXJuIGRvbmU7XG4gIH1cblxuICByZXR1cm4gaXNzdWVzO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFN0b3J5KG9wdHM6IHtpbmNsdWRlPzogc3RyaW5nOyBpbmNsdWRlVmVyc2lvbj86IHN0cmluZ30sXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gIHVybCA9ICdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9pc3N1ZXMvP2ZpbHRlcj0xNDExOCcpIHtcblxuICBjb25zdCBpbmNsdWRlUHJvaiA9IG9wdHMuaW5jbHVkZSA/XG4gICAgbmV3IFNldDxzdHJpbmc+KChvcHRzLmluY2x1ZGUgYXMgc3RyaW5nKS5zcGxpdCgnLCcpLm1hcChlbCA9PiBlbC50cmltKCkpICk6XG4gICAgICBudWxsO1xuICBpZiAoaW5jbHVkZVByb2opXG4gICAgY29uc29sZS5sb2coJ2luY2x1ZGUgcHJvamVjdCBwcmZpZXg6ICcsIGluY2x1ZGVQcm9qKTtcblxuICBjb25zdCBpbmNsdWRlVmVyID0gb3B0cy5pbmNsdWRlVmVyc2lvbiA/XG4gICAgKG9wdHMuaW5jbHVkZVZlcnNpb24gKyAnJykuc3BsaXQoJywnKS5tYXAoZWwgPT4gZWwudHJpbSgpLnRvTG9jYWxlTG93ZXJDYXNlKCkpIDogbnVsbDtcblxuXG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goZmFsc2UpO1xuICBjb25zdCBwYWdlcyA9IGF3YWl0IGJyb3dzZXIucGFnZXMoKTtcbiAgYXdhaXQgcGFnZXNbMF0uZ290byh1cmwsIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG4gIGF3YWl0IHBhZ2VzWzBdLndhaXRGb3IoJyNpc3N1ZXRhYmxlID4gdGJvZHknLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ2ZldGNoaW5nIHBhZ2UgZG9uZScpO1xuICBjb25zdCBwYWdlID0gcGFnZXNbMF07XG5cbiAgbGV0IGlzc3VlcyA9IGF3YWl0IGRvbVRvSXNzdWVzKHBhZ2UsIGZvclN0b3J5cyk7XG5cbiAgaWYgKGluY2x1ZGVQcm9qKSB7XG4gICAgaXNzdWVzID0gaXNzdWVzLmZpbHRlcihpc3N1ZSA9PiB7XG4gICAgICBjb25zdCBwcmVmaXggPSBpc3N1ZS5pZC5zbGljZSgwLCBpc3N1ZS5pZC5pbmRleE9mKCctJykpO1xuICAgICAgcmV0dXJuIGluY2x1ZGVQcm9qLmhhcyhwcmVmaXgpO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKGluY2x1ZGVWZXIpIHtcbiAgICBpc3N1ZXMgPSBpc3N1ZXMuZmlsdGVyKGlzc3VlID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGlzc3VlLnZlciwgaW5jbHVkZVZlcik7XG4gICAgICByZXR1cm4gaXNzdWUudmVyLm1hcCh2ZXIgPT4gdmVyLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgIC5zb21lKHZlcnNpb24gPT4gaW5jbHVkZVZlci5zb21lKGluY2x1ZGUgPT4gdmVyc2lvbi5pbmRleE9mKGluY2x1ZGUpID49IDApKTtcbiAgICB9KTtcbiAgfVxuXG5cbiAgbG9nLmluZm8oJ051bSBvZiBzdG9yaWVzOicsIGlzc3Vlcy5sZW5ndGgpO1xuXG5cbiAgLy8gZm9yIChjb25zdCBpc3N1ZSBvZiBpc3N1ZXMpIHtcbiAgYXN5bmMgZnVuY3Rpb24gZm9yU3RvcnlzKHRyUGFpcnM6IFtJc3N1ZSwgcHVwLkVsZW1lbnRIYW5kbGVdW10pIHtcbiAgICBmb3IgKGNvbnN0IFtpc3N1ZSwgdHJdIG9mIHRyUGFpcnMpIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGlzc3VlLmlkLnNsaWNlKDAsIGlzc3VlLmlkLmluZGV4T2YoJy0nKSk7XG4gICAgICBpZiAoaW5jbHVkZVByb2ogJiYgIWluY2x1ZGVQcm9qLmhhcyhwcmVmaXgpIHx8XG4gICAgICAgIGluY2x1ZGVWZXIgJiYgIWlzc3VlLnZlci5tYXAodmVyID0+IHZlci50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgIC5zb21lKHZlcnNpb24gPT4gaW5jbHVkZVZlci5zb21lKGluY2x1ZGUgPT4gdmVyc2lvbi5pbmRleE9mKGluY2x1ZGUpID49IDApKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYW5jaG9ycyA9IGF3YWl0IHRyLiQkKGA6c2NvcGUgPiAuaXNzdWVrZXkgPiBhLmlzc3VlLWxpbmtbZGF0YS1pc3N1ZS1rZXk9JHtpc3N1ZS5pZH1dYCk7XG5cbiAgICAgIGxldCBsaW5rQ2xpY2tlZCA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCBhbmNob3Igb2YgYW5jaG9ycykge1xuICAgICAgICBjb25zdCBieCA9IGF3YWl0IGFuY2hvci5ib3VuZGluZ0JveCgpO1xuXG4gICAgICAgIGlmIChieCAmJiBieC5oZWlnaHQgPiAxMCAmJiBieC53aWR0aCA+IDEwKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ0dvIGlzc3VlIGRldGFpbHM6ICcsIGlzc3VlLmlkKTtcbiAgICAgICAgICBhd2FpdCBhbmNob3IuY2xpY2soKTtcbiAgICAgICAgICBhd2FpdCBwYWdlLndhaXRGb3JTZWxlY3RvcignLmxpc3QtdmlldycsIHtoaWRkZW46IHRydWV9KTtcbiAgICAgICAgICBpc3N1ZS50YXNrcyA9IGF3YWl0IGxpc3RTdWJ0YXNrcyhwYWdlLCBpc3N1ZSk7XG4gICAgICAgICAgYXdhaXQgcGFnZS5nb0JhY2soe3dhaXRVbnRpbDogJ25ldHdvcmtpZGxlMCd9KTtcbiAgICAgICAgICBsaW5rQ2xpY2tlZCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghbGlua0NsaWNrZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgbGluayBmb3IgJHtpc3N1ZS5pZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBjb25zdCBncm91cGVkID0gXy5ncm91cEJ5KGlzc3VlcywgaXNzdWUgPT4gaXNzdWUuaWQuc2xpY2UoMCwgaXNzdWUuaWQuaW5kZXhPZignLScpKSk7XG4gIGNvbnN0IGdyb3VwZWQgPSBfLmdyb3VwQnkoaXNzdWVzLCBpc3N1ZSA9PiBpc3N1ZS52ZXIgJiYgaXNzdWUudmVyLmxlbmd0aCA+IDAgPyBpc3N1ZS52ZXJbMF0gOiAnTm8gdmVyc2lvbicpO1xuXG4gIGZzLndyaXRlRmlsZVN5bmMoYXBpLmNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcsICdkaXN0L2xpc3Qtc3RvcnkueWFtbCcpLCBqc1lhbWwuc2FmZUR1bXAoZ3JvdXBlZCkpO1xuICBsb2cuaW5mbygnUmVzdWx0IGhhcyBiZWVuIHdyaXR0ZW4gdG8gZGlzdC9saXN0LXN0b3J5LnlhbWwnKTtcblxuICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnSGF2ZSBhIG5pY2UgZGF5Jyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzeW5jKG9wdDogT3B0aW9ucywgc291cmNlWWFtbEZpbGU/OiBzdHJpbmcpIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaChmYWxzZSk7XG4gIGNvbnN0IHBhZ2VzID0gYXdhaXQgYnJvd3Nlci5wYWdlcygpO1xuXG4gIGNvbnN0IGlzc3VlQnlQcm9qOiB7W3Byb2o6IHN0cmluZ106IElzc3VlW119ID0ganNZYW1sLmxvYWQoZnMucmVhZEZpbGVTeW5jKFxuICAgIHNvdXJjZVlhbWxGaWxlID8gc291cmNlWWFtbEZpbGUgOiBhcGkuY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJywgJ2Rpc3QvbGlzdC1zdG9yeS55YW1sJyksICd1dGY4JykpO1xuXG4gIGZvciAoY29uc3QgcHJvaiBvZiBPYmplY3Qua2V5cyhpc3N1ZUJ5UHJvaikpIHtcbiAgICBjb25zdCBpc3N1ZXMgPSBpc3N1ZUJ5UHJvaltwcm9qXTtcbiAgICBsb2cuaW5mbyhpc3N1ZXMubGVuZ3RoKTtcbiAgICBmb3IgKGNvbnN0IGlzc3VlIG9mIGlzc3Vlcykge1xuICAgICAgaWYgKGlzc3VlLnRhc2tzKSB7XG4gICAgICAgIGxvZy5pbmZvKCdDaGVjayBpc3N1ZScsIGlzc3VlLmlkKTtcblxuICAgICAgICBjb25zdCB0YXNrc1dpdGhvdXRJZCA9IGlzc3VlLnRhc2tzXG4gICAgICAgIC5maWx0ZXIodGFzayA9PiB0YXNrLmlkID09IG51bGwpO1xuICAgICAgICAvLyBsb2cuaW5mbyh0YXNrc1dpdGhvdXRJZCk7XG4gICAgICAgIGlmICh0YXNrc1dpdGhvdXRJZC5sZW5ndGggPiAwKVxuICAgICAgICAgIGF3YWl0IGNyZWF0ZVRhc2tzKGlzc3VlLCB0YXNrc1dpdGhvdXRJZCwgcGFnZXNbMF0pO1xuICAgICAgfVxuICAgICAgY29uc3QgdG9BZGQgPSBpc3N1ZVsnKyddO1xuICAgICAgaWYgKHRvQWRkKSB7XG4gICAgICAgIGNvbnN0IHRhc2tzOiBOZXdUYXNrW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBhc3NpZ25lZSBvZiBPYmplY3Qua2V5cyh0b0FkZCkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgdG9BZGRbYXNzaWduZWVdKSB7XG4gICAgICAgICAgICBjb25zdCBbbmFtZV0gPSBsaW5lLnNwbGl0KC9bXFxyXFxuXSsvKTtcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBsaW5lO1xuICAgICAgICAgICAgY29uc3QgaXRlbTogTmV3VGFzayA9IHtcbiAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgZGVzYyxcbiAgICAgICAgICAgICAgYXNzaWduZWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0YXNrcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBjcmVhdGVUYXNrcyhpc3N1ZSwgdGFza3MsIHBhZ2VzWzBdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVUYXNrcyhwYXJlbnRJc3N1ZTogSXNzdWUsIHRhc2tzOiBOZXdUYXNrW10sIHBhZ2U6IHB1cC5QYWdlKSB7XG4gIGF3YWl0IHBhZ2UuZ290bygnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vYnJvd3NlLycgKyBwYXJlbnRJc3N1ZS5pZCxcbiAgICB7dGltZW91dDogMCwgd2FpdFVudGlsOiAnbmV0d29ya2lkbGUyJ30pO1xuICBjb25zdCByZW1vdGVUYXNrcyA9IGF3YWl0IGxpc3RTdWJ0YXNrcyhwYWdlLCBwYXJlbnRJc3N1ZSk7XG4gIHBhcmVudElzc3VlLnZlciA9IGF3YWl0IFByb21pc2UuYWxsKChhd2FpdCBwYWdlLiQkKCcjZml4Zm9yLXZhbCBhJykpXG4gICAgLm1hcChhID0+IGEuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpLnRoZW4oamggPT4gamguanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+KSkpO1xuXG4gIGNvbnN0IGlzSGRlY29yID0gcGFyZW50SXNzdWUuaWQuc3RhcnRzV2l0aCgnSERFQ09SJyk7XG4gIGNvbnN0IHByZWZpeCA9IGlzSGRlY29yID8gJ+ijhei0nS1GRS0nIDogJ0ZFIC0gJztcbiAgdGFza3MuZm9yRWFjaCh0YXNrID0+IHtcbiAgICBpZiAoIXRhc2submFtZS5zdGFydHNXaXRoKHByZWZpeCkpXG4gICAgICB0YXNrLm5hbWUgPSBwcmVmaXggKyB0YXNrLm5hbWU7XG4gIH0pO1xuICBjb25zdCB0b0FkZCA9IF8uZGlmZmVyZW5jZUJ5KHRhc2tzLCByZW1vdGVUYXNrcywgaXNzdWUgPT4gaXNzdWUubmFtZSk7XG4gIGxvZy5pbmZvKCdDcmVhdGluZyBuZXcgaXNzdWVcXG4nLCB0b0FkZCk7XG5cbiAgZm9yIChjb25zdCBpdGVtIG9mIHRvQWRkKSB7XG4gICAgaXRlbS52ZXIgPSBwYXJlbnRJc3N1ZS52ZXI7XG4gICAgYXdhaXQgX2FkZFN1YlRhc2socGFnZSwgaXRlbSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gX2FkZFN1YlRhc2socGFnZTogcHVwLlBhZ2UsIHRhc2s6IE5ld1Rhc2spIHtcbiAgbG9nLmluZm8oJ2FkZGluZycsIHRhc2spO1xuICBhd2FpdCBjbGlja01vcmVCdXR0b24ocGFnZSwgJ+WIm+W7uuWtkOS7u+WKoScpO1xuXG4gIGF3YWl0IHBhZ2Uud2FpdEZvcignI2NyZWF0ZS1zdWJ0YXNrLWRpYWxvZycsIHt2aXNpYmxlOiB0cnVlfSk7XG4gIGNvbnN0IGRpYWxvZyA9IGF3YWl0IHBhZ2UuJCgnI2NyZWF0ZS1zdWJ0YXNrLWRpYWxvZycpO1xuICBpZiAoIWRpYWxvZylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FkZGluZyBpc3N1ZSBkaWFsb2cgbm90IGZvdW5kJyk7XG5cbiAgYXdhaXQgZGlhbG9nLiQoJ2lucHV0W25hbWU9c3VtbWFyeV0nKVxuICAgIC50aGVuKGlucHV0ID0+IGlucHV0IS50eXBlKHRhc2submFtZSkpO1xuXG4gIC8vIGNvbnN0IGlucHV0ID0gYXdhaXQgZGlhbG9nLiQoJyNmaXhWZXJzaW9ucy10ZXh0YXJlYScpO1xuICAvLyBhd2FpdCBpbnB1dCEuY2xpY2soKTtcbiAgLy8gbG9nLmluZm8oJ3ZlcnNpb246JywgdGFzay52ZXIhWzBdKTtcbiAgLy8gYXdhaXQgaW5wdXQhLnR5cGUodGFzay52ZXIhWzBdLCB7ZGVsYXk6IDEwMH0pO1xuICAvLyBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdFbnRlcicpO1xuICBhd2FpdCBkaWFsb2cuJCgnI2Rlc2NyaXB0aW9uLXdpa2ktZWRpdCcpLnRoZW4oZWwgPT4gZWwhLmNsaWNrKCkpO1xuICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUodGFzay5kZXNjID8gdGFzay5kZXNjIDogdGFzay5uYW1lKTtcblxuICBjb25zdCBsYWJlbHMgPSBhd2FpdCBkaWFsb2cuJCQoJy5maWVsZC1ncm91cCA+IGxhYmVsJyk7XG5cbiAgY29uc3QgdGV4dHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBsYWJlbHMubWFwKGxhYmVsID0+IGxhYmVsLmdldFByb3BlcnR5KCdpbm5lclRleHQnKS50aGVuKHYgPT4gdi5qc29uVmFsdWUoKSBhcyBQcm9taXNlPHN0cmluZz4pKSk7XG4gIGNvbnN0IGxhYmVsTWFwOiB7W25hbWU6IHN0cmluZ106IHB1cC5FbGVtZW50SGFuZGxlfSA9IHt9O1xuICB0ZXh0cy5mb3JFYWNoKCh0ZXh0LCBpZHgpID0+IGxhYmVsTWFwW3RleHQuc3BsaXQoL1tcXG5cXHJcXHRdKy8pWzBdXSA9IGxhYmVsc1tpZHhdKTtcbiAgLy8gbG9nLmluZm8oT2JqZWN0LmtleXMobGFiZWxNYXApKTtcblxuICBjb25zdCBtYXRjaE5hbWUgPSAvWyjvvIhdKFswLTkuXStbZGhESF0/KVsp77yJXVxccyokLy5leGVjKHRhc2submFtZSk7XG4gIGxldCBkdXJhdGlvbiA9IG1hdGNoTmFtZSA/IG1hdGNoTmFtZVsxXSA6ICcwLjVkJztcbiAgaWYgKCFkdXJhdGlvbi5lbmRzV2l0aCgnZCcpICYmICFkdXJhdGlvbi5lbmRzV2l0aCgnaCcpKSB7XG4gICAgZHVyYXRpb24gPSBkdXJhdGlvbiArICdkJztcbiAgfVxuICBjb25zdCBkYXRlcyA9IGRhdGUoKTtcbiAgY29uc3QgZm9ybVZhbHVlcyA9IHtcbiAgICDku7vliqHmj5Dlh7rml6XmnJ86IGRhdGVzWzBdLFxuICAgIOacn+acm+S4iue6v+aXtumXtDogZW5kRGF0ZUJhc2VPblZlcnNpb24odGFzay52ZXIhWzBdKSB8fCBkYXRlc1sxXSxcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcbiAgICAn5Yid5aeL6aKE5LywJzogZHVyYXRpb24sXG4gICAg5Ymp5L2Z55qE5Lyw566XOiBkdXJhdGlvbixcbiAgICDnu4/lip7kuro6IHRhc2suYXNzaWduZWUgfHwgJ+WImOaZtidcbiAgfTtcblxuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMobGFiZWxNYXApKSB7XG4gICAgaWYgKFsn5Lu75Yqh5o+Q5Ye65pel5pyfJywgJ0VuZCBkYXRlJ10uaW5jbHVkZXMobmFtZSkgJiYgXy5oYXMoZm9ybVZhbHVlcywgbmFtZSkpIHtcbiAgICAgIC8vIElmIHRoZXJlIGhhcyBiZWVuIGEgZXhpc3RpbmcgdmFsdWUsIHNraXAgdGhpcyBmaWVsZFxuICAgICAgY29uc3QgaWQgPSAoYXdhaXQgbGFiZWxNYXBbbmFtZV0uZXZhbHVhdGUoZWwgPT4gZWwuZ2V0QXR0cmlidXRlKCdmb3InKSkpO1xuICAgICAgY29uc3QgaW5wdXRFbCA9IGF3YWl0IHBhZ2UuJCgnIycgKyBpZCk7XG4gICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGlucHV0RWwhLmV2YWx1YXRlKGVsID0+IChlbCBhcyBIVE1MVGV4dEFyZWFFbGVtZW50KS52YWx1ZSk7XG4gICAgICBpZiAodmFsdWUudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBhd2FpdCBpbnB1dEVsIS5jbGljaygpO1xuICAgICAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUoZm9ybVZhbHVlc1tuYW1lXSwge2RlbGF5OiA1MH0pO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKCFfLmhhcyhmb3JtVmFsdWVzLCBuYW1lKSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGF3YWl0IGxhYmVsTWFwW25hbWVdLmNsaWNrKHtkZWxheTogNTB9KTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC50eXBlKGZvcm1WYWx1ZXNbbmFtZV0sIHtkZWxheTogNTB9KTtcbiAgICBpZiAobmFtZSA9PT0gJ+e7j+WKnuS6uicpIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTsgLy8gd2FpdCBmb3IgSklSQSBzZWFyY2hpbmcgdXNlclxuICAgICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnRW50ZXInLCB7ZGVsYXk6IDUwfSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IGRpYWxvZy4kKCcjY3JlYXRlLWlzc3VlLXN1Ym1pdCcpLnRoZW4oYnRuID0+IGJ0biEuY2xpY2soKSk7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvcignI2NyZWF0ZS1zdWJ0YXNrLWRpYWxvZycsIHtoaWRkZW46IHRydWV9KTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0U3VidGFza3MocGFnZTogcHVwLlBhZ2UsIHt2ZXJ9OiB7dmVyOiBzdHJpbmdbXX0pIHtcbiAgY29uc3QgdGFza3MgPSBhd2FpdCBwYWdlLiQkZXZhbCgnI3ZpZXctc3VidGFza3MgI2lzc3VldGFibGUgPiB0Ym9keSA+IHRyJywgKGVscywgdmVyKSA9PiB7XG4gICAgcmV0dXJuIGVscy5tYXAoZWwgPT4ge1xuICAgICAgY29uc3QgbmFtZTogSFRNTEVsZW1lbnQgfCBudWxsID0gZWwucXVlcnlTZWxlY3RvcignOnNjb3BlID4gLnN0c3VtbWFyeSA+IGEnKTtcbiAgICAgIGNvbnN0IHN1YnRhc2s6IElzc3VlID0ge1xuICAgICAgICBuYW1lOiBuYW1lID8gbmFtZS5pbm5lclRleHQudHJpbSgpIDogJycsXG4gICAgICAgIGlkOiBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXNzdWVrZXknKSEsXG4gICAgICAgIHN0YXR1czogKGVsLnF1ZXJ5U2VsZWN0b3IoJy5zdGF0dXMnKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJUZXh0LnRyaW0oKSxcbiAgICAgICAgdmVyLFxuICAgICAgICAvLyBhc3NpZ25lZTogJydcbiAgICAgICAgYXNzaWduZWU6IChlbC5xdWVyeVNlbGVjdG9yKCcuYXNzaWduZWUnKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJUZXh0LnRyaW0oKVxuICAgICAgfTtcbiAgICAgIHJldHVybiBzdWJ0YXNrO1xuICAgIH0pO1xuICB9LCB2ZXIpO1xuICByZXR1cm4gdGFza3M7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0UGFyZW50KCkge1xuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKGZhbHNlKTtcbiAgY29uc3QgcGFnZSA9IChhd2FpdCBicm93c2VyLnBhZ2VzKCkpWzBdO1xuXG4gIGNvbnN0IHN0b3J5TWFwID0gbmV3IE1hcDxzdHJpbmcsIElzc3VlPigpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICBhd2FpdCBwYWdlLmdvdG8oJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2lzc3Vlcy8/ZmlsdGVyPTE0MTA5JyxcbiAgICB7d2FpdFVudGlsOiAnbmV0d29ya2lkbGUyJ30pO1xuICBhd2FpdCBkb21Ub0lzc3VlcyhwYWdlLCBhc3luYyByb3dzID0+IHtcbiAgICBmb3IgKGNvbnN0IFtpc3N1ZSwgdHJdIG9mIHJvd3MpIHtcbiAgICAgIGlmIChpc3N1ZS5wYXJlbnRJZCkge1xuICAgICAgICBjb25zdCBsaW5rID0gYXdhaXQgdHIuJCgnOnNjb3BlID4gdGQuc3VtbWFyeSBhLmlzc3VlLWxpbmsnKTtcbiAgICAgICAgY29uc3QgcG5hbWUgPSBhd2FpdCBwYWdlXG4gICAgICAgIC5ldmFsdWF0ZShlbCA9PiBlbC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJyksIGxpbmspO1xuICAgICAgICBsZXQgcElzc3VlOiBJc3N1ZTtcbiAgICAgICAgaWYgKCFzdG9yeU1hcC5oYXMoaXNzdWUucGFyZW50SWQpKSB7XG4gICAgICAgICAgcElzc3VlID0ge1xuICAgICAgICAgICAgYnJpZWY6IHBuYW1lLFxuICAgICAgICAgICAgbmFtZTogcG5hbWUsXG4gICAgICAgICAgICBpZDogaXNzdWUucGFyZW50SWQsXG4gICAgICAgICAgICBzdGF0dXM6ICcnLFxuICAgICAgICAgICAgYXNzaWduZWU6ICcnLFxuICAgICAgICAgICAgdmVyOiBbXSxcbiAgICAgICAgICAgIGVzdDogMCxcbiAgICAgICAgICAgIHRhc2tzOiBbXVxuICAgICAgICAgIH07XG4gICAgICAgICAgc3RvcnlNYXAuc2V0KGlzc3VlLnBhcmVudElkLCBwSXNzdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBJc3N1ZSA9IHN0b3J5TWFwLmdldChpc3N1ZS5wYXJlbnRJZCkhO1xuICAgICAgICB9XG4gICAgICAgIGlmICgvQVBJXFxzKuiBlOiwgy9pLnRlc3QoaXNzdWUubmFtZSkpIHtcbiAgICAgICAgICBwSXNzdWUuaW50RXN0ID0gaXNzdWUuZXN0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBJc3N1ZS5lc3QhICs9IGlzc3VlLmVzdCE7XG4gICAgICAgIH1cbiAgICAgICAgcElzc3VlLnRhc2tzIS5wdXNoKGlzc3VlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNvbnNvbGUubG9nKCdXcml0dGVkIHRvIGRpc3QvcGFyZW50LXN0b3J5LnlhbWwnKTtcbiAgY29uc3Qgc3RvcmllcyA9IEFycmF5LmZyb20oc3RvcnlNYXAudmFsdWVzKCkpO1xuICBmcy53cml0ZUZpbGVTeW5jKCdkaXN0L3BhcmVudC1zdG9yeS55YW1sJywganNZYW1sLnNhZmVEdW1wKHN0b3JpZXMpKTtcbiAgY29uc29sZS5sb2coc3Rvcmllcy5tYXAoc3RvcnkgPT4gZGlzcGxheUlzc3VlKHN0b3J5KSkuam9pbignXFxuJykpO1xuICBicm93c2VyLmNsb3NlKCk7XG59XG5cbmZ1bmN0aW9uIGRhdGUoKTogW3N0cmluZywgc3RyaW5nXSB7XG4gIGNvbnN0IHRpbWUgPSBtb21lbnQoKTtcbiAgLy8gY29uc29sZS5sb2codGltZS5mb3JtYXQoJ0QvTU1NTS9ZWScpLCB0aW1lLmFkZCgyMSwgJ2RheXMnKS5mb3JtYXQoJ0QvTU1NTS9ZWScpKTtcbiAgcmV0dXJuIFt0aW1lLmZvcm1hdCgnRC9NTU1NL1lZJyksIHRpbWUuYWRkKDMwLCAnZGF5cycpLmZvcm1hdCgnRC9NTU1NL1lZJyldO1xufVxuXG4vKipcbiAqIFRvIGRheXNcbiAqIEBwYXJhbSBlc3RpbWF0aW9uU3RyIFxuICovXG5mdW5jdGlvbiBlc3RpbWF0aW9uVG9OdW0oZXN0aW1hdGlvblN0cjogc3RyaW5nKSB7XG4gIGNvbnN0IG1hdGNoID0gLyhbMC05Ll0rKSjml6V85bCP5pe2fOWIhnxkKS8uZXhlYyhlc3RpbWF0aW9uU3RyKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZGUgZXN0aW1hdGlvbiBmb3JtYXQ6ICR7ZXN0aW1hdGlvblN0cn1gKTtcbiAgfVxuICBpZiAobWF0Y2hbMl0gPT09ICflsI/ml7YnKSB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQobWF0Y2hbMV0pIC8gODtcbiAgfSBlbHNlIGlmIChtYXRjaFsyXSA9PT0gJ+WIhicpIHtcbiAgICByZXR1cm4gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKSAvIDggLyA2MDtcbiAgfSBlbHNlIGlmIChtYXRjaFsyXSA9PT0gJ2QnKSB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQobWF0Y2hbMV0pO1xuICB9XG4gIHJldHVybiBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbn1cblxuZnVuY3Rpb24gZGlzcGxheUlzc3VlKGlzc3VlOiBJc3N1ZSk6IHN0cmluZyB7XG4gIHJldHVybiBjaGFsay5jeWFuKGlzc3VlLmlkKSArIGAgJHtjaGFsay5ncmF5KGlzc3VlLm5hbWUpfSAoJHtpc3N1ZS5lc3R9KSB8IEFQSSBpbnQ6JHtpc3N1ZS5pbnRFc3QgfHwgJzAnfWA7XG59XG5cbmZ1bmN0aW9uIGVuZERhdGVCYXNlT25WZXJzaW9uKHZlcjogc3RyaW5nKSB7XG4gIGNvbnN0IHZlck1hdGNoID0gLyhcXGR7MSwyfSkoXFxkXFxkKSQvLmV4ZWModmVyKTtcbiAgaWYgKHZlck1hdGNoID09IG51bGwgfHwgdmVyTWF0Y2hbMV0gPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHRpbWUgPSBtb21lbnQoKTtcbiAgdGltZS5tb250aChwYXJzZUludCh2ZXJNYXRjaFsxXSwgMTApIC0gMSk7XG4gIHRpbWUuZGF0ZShwYXJzZUludCh2ZXJNYXRjaFsyXSwgMTApKTtcbiAgLy8gdGltZS5zdWJ0cmFjdCg1LCAnZGF5cycpO1xuICBpZiAodGltZS5pc0JlZm9yZShuZXcgRGF0ZSgpKSkge1xuICAgIHRpbWUuYWRkKDEsICd5ZWFycycpO1xuICB9XG4gIHJldHVybiB0aW1lLmZvcm1hdCgnREQvTU1NTS9ZWScpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVzdERhdGUoKSB7XG4gIGNvbnNvbGUubG9nKGVuZERhdGVCYXNlT25WZXJzaW9uKCdmZWFmYS85MDMnKSk7XG4gIGNvbnNvbGUubG9nKG1vbWVudCgnMTUv5Y2B5pyILzE5JywgJ0REL01NTU0vWVknKS50b0RhdGUoKSk7XG59XG5cbi8qKlxuICogQ2hlY2sgUkVBRE1FLm1kIGZvciBjb21tYW5kIGxpbmUgYXJndW1lbnRzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1Rhc2sodXBkYXRlVmVyc2lvbj86IGJvb2xlYW4pIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaChmYWxzZSk7XG4gIGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpO1xuICBjb25zdCBwYWdlcyA9IGF3YWl0IGJyb3dzZXIucGFnZXMoKTtcbiAgY29uc3QgdXJsID0gJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2lzc3Vlcy8/ZmlsdGVyPTE0MTA5JztcbiAgYXdhaXQgcGFnZXNbMV0uZ290byh1cmwsIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG5cbiAgY29uc3QgcGFyZW50U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGNvbXBhcmVUb0RhdGUgPSBtb21lbnQoKS5hZGQoYXBpLmFyZ3YuZW5kSW5EYXlzIHx8IDMsICdkYXlzJyk7XG4gIGxvZy5pbmZvKCdDb21wYXJlbnQgdG8gZW5kIGRhdGU6JywgY29tcGFyZVRvRGF0ZS5mb3JtYXQoJ1lZWVkvTS9EJykpO1xuXG4gIGF3YWl0IGRvbVRvSXNzdWVzKHBhZ2VzWzFdLCBhc3luYyByb3dzID0+IHtcbiAgICByb3dzID0gcm93cy5maWx0ZXIoKFt0YXNrXSkgPT4gdGFzay5zdGF0dXMgPT09ICflvIDmlL4nIHx8IHRhc2suc3RhdHVzID09PSAnREVWRUxPUElORycpO1xuICAgIHBhcmVudFNldC5jbGVhcigpO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICAgIGNvbnN0IFt0YXNrXSA9IHJvdztcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRhc2spO1xuICAgICAgaWYgKHRhc2sucGFyZW50SWQpIHtcbiAgICAgICAgcGFyZW50U2V0LmFkZCh0YXNrLnBhcmVudElkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYXJlbnRNYXAgPSBhd2FpdCBsaXN0SXNzdWVCeUlkcyhwYWdlc1swXSwgQXJyYXkuZnJvbShwYXJlbnRTZXQudmFsdWVzKCkpKTtcblxuICAgIGZvciAoY29uc3QgW3Rhc2ssIHRyXSBvZiByb3dzKSB7XG4gICAgICBjb25zdCBlbmREYXRlT2JqID0gbW9tZW50KHRhc2suZW5kRGF0ZSwgJ0REL01NTU0vWVknKTtcbiAgICAgIGlmICh0YXNrLmVuZERhdGUgJiYgZW5kRGF0ZU9iai5pc0JlZm9yZShjb21wYXJlVG9EYXRlKSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgIGxvZy53YXJuKGBFbmQgZGF0ZToke3Rhc2suZW5kRGF0ZX0gXCIke2Rpc3BsYXlJc3N1ZSh0YXNrKX1cImApO1xuICAgICAgICBpZiAoYXBpLmFyZ3YuYWRkRGF5cykge1xuICAgICAgICAgIGF3YWl0IF9lZGl0VHIocGFnZXNbMV0sIHRyLCB7XG4gICAgICAgICAgICBlbmREYXRlOiBlbmREYXRlT2JqLmFkZChwYXJzZUludChhcGkuYXJndi5hZGREYXlzLCAxMCksICdkYXlzJykuZm9ybWF0KCdERC9NTU1NL1lZJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXJlbnRNYXAuZ2V0KHRhc2sucGFyZW50SWQhKTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgcGFyZW50RW5kRGF0ZU1vbSA9IG1vbWVudChwYXJlbnQuZW5kRGF0ZSwgJ0REL01NTU0vWVknKTtcbiAgICAgICAgY29uc3Qgbm90U2FtZVZlcnNpb24gPSB0YXNrLnZlclswXSAhPT0gcGFyZW50IS52ZXJbMF07XG4gICAgICAgIGNvbnN0IGVhcmxpZXJFbmREYXRlID0gZW5kRGF0ZU9iai5pc0JlZm9yZShwYXJlbnRFbmREYXRlTW9tKTtcbiAgICAgICAgY29uc3QgdmVyRGF0ZSA9IGVuZERhdGVCYXNlT25WZXJzaW9uKHBhcmVudC52ZXJbMF0pO1xuXG4gICAgICAgIGNvbnN0IHVwZGF0ZVRvVGFzazogUGFyYW1ldGVyczx0eXBlb2YgX2VkaXRUcj5bMl0gPSB7fTtcbiAgICAgICAgbGV0IG5lZWRVcGRhdGUgPSBmYWxzZTtcblxuICAgICAgICBpZiAobm90U2FtZVZlcnNpb24pIHtcbiAgICAgICAgICBuZWVkVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgICAgICAgIGxvZy53YXJuKGBUYXNrIFwiJHtkaXNwbGF5SXNzdWUodGFzayl9XCJcXG4gIHZlcnNpb24gXCIke3Rhc2sudmVyWzBdfVwiIGRvZXNuJ3QgbWF0Y2ggcGFyZW50ICR7cGFyZW50LmlkfSBcIiR7cGFyZW50LnZlclswXX1cIlxcbmApO1xuICAgICAgICAgIHVwZGF0ZVRvVGFzay52ZXIgPSBwYXJlbnQudmVyO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2ZXJEYXRlICYmIHRhc2suZW5kRGF0ZSAhPT0gdmVyRGF0ZSkge1xuICAgICAgICAgIG5lZWRVcGRhdGUgPSB0cnVlO1xuICAgICAgICAgIHVwZGF0ZVRvVGFzay5lbmREYXRlID0gdmVyRGF0ZTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgICAgICAgIGxvZy53YXJuKGBUYXNrIFwiJHtkaXNwbGF5SXNzdWUodGFzayl9XCJcXG4gIGVuZCBkYXRlIFwiJHt0YXNrLmVuZERhdGV9XCIgZG9lc24ndCBtYXRjaCBwYXJlbnQgdmVyc2lvbiAke3BhcmVudC5pZH0gXCIke3BhcmVudC52ZXJbMF19IC0gJHt2ZXJEYXRlfVwiYCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWFybGllckVuZERhdGUpIHtcbiAgICAgICAgICBuZWVkVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICB1cGRhdGVUb1Rhc2suZW5kRGF0ZSA9IHBhcmVudC5lbmREYXRlO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgbG9nLndhcm4oYFRhc2sgXCIke2Rpc3BsYXlJc3N1ZSh0YXNrKX1cIlxcbiAgZW5kIGRhdGUgXCIke3Rhc2suZW5kRGF0ZX1cIiBpcyBlYXJsaWVyIHRoYW4gcGFyZW50ICR7cGFyZW50LmlkfSBcIiR7cGFyZW50LmVuZERhdGV9XCJgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZWVkVXBkYXRlICYmIHVwZGF0ZVZlcnNpb24gPT09IHRydWUgfHwgYXBpLmFyZ3YudXBkYXRlVmVyc2lvbikge1xuICAgICAgICAgIGF3YWl0IF9lZGl0VHIocGFnZXNbMV0sIHRyLCB1cGRhdGVUb1Rhc2spO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfZWRpdFRyKHBhZ2U6IHB1cC5QYWdlLCB0cjogcHVwLkVsZW1lbnRIYW5kbGUsIHVwZGF0ZVRhc2s6IHtba2V5IGluIGtleW9mIElzc3VlXT86IElzc3VlW2tleV19KSB7XG4gIGF3YWl0IChhd2FpdCB0ci4kJCgnOnNjb3BlID4gLnN1bW1hcnkgLmlzc3VlLWxpbmsnKSlbMV0uY2xpY2soKTtcbiAgYXdhaXQgZWRpdElzc3VlKHBhZ2UsIHVwZGF0ZVRhc2spO1xuICBhd2FpdCBwYWdlLmdvQmFjaygpO1xuICBhd2FpdCBwYWdlLndhaXRGb3IoODAwKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZWRpdElzc3VlKHBhZ2U6IHB1cC5QYWdlLCB0YXNrOiBQYXJ0aWFsPElzc3VlPikge1xuICBjb25zdCBlZGl0QnV0dG9uID0gYXdhaXQgcGFnZS53YWl0Rm9yU2VsZWN0b3IoJyNlZGl0LWlzc3VlJywge3Zpc2libGU6IHRydWV9KTtcbiAgYXdhaXQgZWRpdEJ1dHRvbi5jbGljaygpO1xuICBjb25zdCBkaWFsb2cgPSBhd2FpdCBwYWdlLndhaXRGb3JTZWxlY3RvcignI2VkaXQtaXNzdWUtZGlhbG9nJywge3Zpc2libGU6IHRydWV9KTtcblxuICBpZiAodGFzay5uYW1lKSB7XG4gICAgY29uc29sZS5sb2coJ2NoYW5nZSBuYW1lIHRvICcsIHRhc2submFtZSk7XG4gICAgYXdhaXQgZGlhbG9nLiQoJ2lucHV0W25hbWU9c3VtbWFyeV0nKVxuICAgICAgLnRoZW4oaW5wdXQgPT4gaW5wdXQhLnR5cGUodGFzay5uYW1lISkpO1xuICB9XG5cbiAgaWYgKHRhc2sudmVyICYmIHRhc2sudmVyLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLmxvZygnICBjaGFuZ2UgdmVyc2lvbiB0byAnLCB0YXNrLnZlclswXSk7XG4gICAgY29uc3QgaW5wdXQgPSBhd2FpdCBkaWFsb2cuJCgnI2ZpeFZlcnNpb25zLXRleHRhcmVhJyk7XG4gICAgYXdhaXQgaW5wdXQhLmNsaWNrKCk7XG4gICAgZm9yIChsZXQgaT0wOyBpPDU7IGkrKylcbiAgICAgIGF3YWl0IGlucHV0IS5wcmVzcygnQmFja3NwYWNlJywge2RlbGF5OiAxNTB9KTtcbiAgICAvLyBhd2FpdCBwYWdlLndhaXRGb3IoMTAwMCk7XG4gICAgYXdhaXQgaW5wdXQhLnR5cGUodGFzay52ZXJbMF0sIHtkZWxheTogMTAwfSk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnRW50ZXInKTtcbiAgfVxuXG4gIGlmICh0YXNrLmRlc2MgIT0gbnVsbCkge1xuICAgIGNvbnNvbGUubG9nKCcgIGNoYW5nZSBkZXNjcmlwdGlvbiB0bycsIHRhc2suZGVzYyk7XG4gICAgYXdhaXQgZGlhbG9nLiQoJyNkZXNjcmlwdGlvbi13aWtpLWVkaXQnKS50aGVuKGVsID0+IGVsIS5jbGljaygpKTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUodGFzay5kZXNjID8gdGFzay5kZXNjIDogdGFzay5uYW1lISk7XG4gIH1cblxuICBjb25zdCBsYWJlbHMgPSBhd2FpdCBkaWFsb2cuJCQoJy5maWVsZC1ncm91cCA+IGxhYmVsJyk7XG5cbiAgY29uc3QgdGV4dHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBsYWJlbHMubWFwKGxhYmVsID0+IGxhYmVsLmdldFByb3BlcnR5KCdpbm5lclRleHQnKS50aGVuKHYgPT4gdi5qc29uVmFsdWUoKSBhcyBQcm9taXNlPHN0cmluZz4pKSk7XG4gIGNvbnN0IGxhYmVsTWFwOiB7W25hbWU6IHN0cmluZ106IHB1cC5FbGVtZW50SGFuZGxlfSA9IHt9O1xuICB0ZXh0cy5mb3JFYWNoKCh0ZXh0LCBpZHgpID0+IGxhYmVsTWFwW3RleHQuc3BsaXQoL1tcXG5cXHJcXHRdKy8pWzBdXSA9IGxhYmVsc1tpZHhdKTtcblxuICBjb25zdCBkYXRlcyA9IGRhdGUoKTtcbiAgY29uc3QgZm9ybVZhbHVlcyA9IHt9O1xuXG4gIGlmICh0YXNrLnZlciAmJiB0YXNrLnZlci5sZW5ndGggPiAwKVxuICAgIGZvcm1WYWx1ZXNbJ0VuZCBkYXRlJ10gPSBlbmREYXRlQmFzZU9uVmVyc2lvbih0YXNrLnZlciFbMF0pIHx8IGRhdGVzWzFdO1xuXG4gIGlmICh0YXNrLmVuZERhdGUpXG4gICAgZm9ybVZhbHVlc1snRW5kIGRhdGUnXSA9IHRhc2suZW5kRGF0ZTtcblxuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMobGFiZWxNYXApKSB7XG4gICAgaWYgKCFfLmhhcyhmb3JtVmFsdWVzLCBuYW1lKSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGF3YWl0IGxhYmVsTWFwW25hbWVdLmNsaWNrKHtkZWxheTogNTB9KTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7XG4gICAgY29uc3QgaW5wdXRJZCA9ICcjJyArIGF3YWl0IHBhZ2UuZXZhbHVhdGUobGFiZWwgPT4gbGFiZWwuZ2V0QXR0cmlidXRlKCdmb3InKSwgbGFiZWxNYXBbbmFtZV0pO1xuICAgIC8vIGNvbnNvbGUubG9nKGlucHV0SWQpO1xuICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcGFnZS4kZXZhbChpbnB1dElkLCBpbnB1dCA9PiAoaW5wdXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUpO1xuXG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aCArIDI7IGkgPCBsOyBpKyspXG4gICAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0Fycm93UmlnaHQnLCB7ZGVsYXk6IDUwfSk7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aCArIDU7IGkgPCBsOyBpKyspXG4gICAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0JhY2tzcGFjZScsIHtkZWxheTogNTB9KTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJyVzOiAlcyAtPiAlcycsIG5hbWUsIHZhbHVlLCBmb3JtVmFsdWVzW25hbWVdKTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUoZm9ybVZhbHVlc1tuYW1lXSwge2RlbGF5OiA1MH0pO1xuICAgIC8vIGlmIChuYW1lID09PSAn57uP5Yqe5Lq6Jykge1xuICAgIC8vICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpOyAvLyB3YWl0IGZvciBKSVJBIHNlYXJjaGluZyB1c2VyXG4gICAgLy8gICBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdFbnRlcicsIHtkZWxheTogNTB9KTtcbiAgICAvLyB9XG4gIH1cbiAgYXdhaXQgKGF3YWl0IGRpYWxvZy4kKCcjZWRpdC1pc3N1ZS1zdWJtaXQnKSkhLmNsaWNrKCk7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvcignI2VkaXQtaXNzdWUtZGlhbG9nJywge2hpZGRlbjogdHJ1ZX0pO1xuICBhd2FpdCBwYWdlLndhaXRGb3IoMTAwMCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldENlbGxUaXRsZXMoaXNzdWVUYWJsZTogcHVwLkVsZW1lbnRIYW5kbGU8RWxlbWVudD4gfCBudWxsKSB7XG4gIGlmIChpc3N1ZVRhYmxlID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuICBjb25zdCB0aHMgPSBhd2FpdCBpc3N1ZVRhYmxlLiQkKCc6c2NvcGUgPiB0aGVhZCB0aCcpO1xuXG4gIGNvbnN0IHRpdGxlcyA9IGF3YWl0IFByb21pc2UuYWxsKHRocy5tYXAoYXN5bmMgdGggPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IGF3YWl0IHRoLiQoJzpzY29wZSA+IHNwYW5bdGl0bGVdJyk7XG4gICAgaWYgKGhlYWRlcikge1xuICAgICAgcmV0dXJuIChhd2FpdCBoZWFkZXIuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5qc29uVmFsdWUoKSBhcyBQcm9taXNlPHN0cmluZz47XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAoYXdhaXQgdGguZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5qc29uVmFsdWUoKSBhcyBQcm9taXNlPHN0cmluZz47XG4gICAgfVxuICB9KSk7XG5cbiAgcmV0dXJuIHRpdGxlcy5tYXAodGl0bGUgPT4gdGl0bGUudHJpbSgpKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbGlzdElzc3VlQnlJZHMocGFnZTogcHVwLlBhZ2UsIGlkczogc3RyaW5nW10pIHtcbiAgY29uc3QganFsID0gJ2pxbD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGBpZCBpbiAoJHtpZHMuam9pbignLCcpfSlgKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9pc3N1ZXMvPycgKyBqcWwpO1xuICBjb25zdCBpc3N1ZU1hcCA9IChhd2FpdCBkb21Ub0lzc3VlcyhwYWdlKSkucmVkdWNlKChtYXAsIGlzc3VlKSA9PiB7XG4gICAgbWFwLnNldChpc3N1ZS5pZCwgaXNzdWUpO1xuICAgIHJldHVybiBtYXA7XG4gIH0sIG5ldyBNYXA8c3RyaW5nLCBJc3N1ZT4oKSk7XG4gIHJldHVybiBpc3N1ZU1hcDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1vdmVJc3N1ZXMobmV3UGFyZW50SWQ6IHN0cmluZywgLi4ubW92ZWRJc3N1ZUlkczogc3RyaW5nW10pIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaCgpO1xuICBjb25zdCBwYWdlID0gKGF3YWl0IGJyb3dzZXIucGFnZXMoKSlbMF07XG5cbiAgY29uc3QgcGFyZW50SXNzdWVNYXAgPSBhd2FpdCBsaXN0SXNzdWVCeUlkcyhwYWdlLCBbbmV3UGFyZW50SWRdKTtcbiAgY29uc3QgcGFyZW50SXNzdWUgPSBwYXJlbnRJc3N1ZU1hcC52YWx1ZXMoKS5uZXh0KCkudmFsdWUgYXMgSXNzdWU7XG5cbiAgY29uc29sZS5sb2cocGFyZW50SXNzdWUpO1xuXG4gIGZvciAoY29uc3QgaWQgb2YgbW92ZWRJc3N1ZUlkcykge1xuICAgIGNvbnN0IHVybCA9ICdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9icm93c2UvJyArIGlkO1xuICAgIGF3YWl0IHBhZ2UuZ290byh1cmwsIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG5cbiAgICBhd2FpdCBwYWdlLndhaXRGb3IoJyNwYXJlbnRfaXNzdWVfc3VtbWFyeScsIHt2aXNpYmxlOiB0cnVlfSk7XG4gICAgY29uc3Qgb3JpZ1BhcmVudElkID0gYXdhaXQgcGFnZS4kZXZhbCgnI3BhcmVudF9pc3N1ZV9zdW1tYXJ5JywgZWwgPT4gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLWlzc3VlLWtleScpKTtcbiAgICBpZiAob3JpZ1BhcmVudElkICE9PSBwYXJlbnRJc3N1ZS5pZCkge1xuXG4gICAgICBhd2FpdCBjbGlja01vcmVCdXR0b24ocGFnZSwgJ+enu+WKqCcpO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xuICAgICAgLy8gY29uc3QgZWwgPSBhd2FpdCBwYWdlLiQoJ2h0bWwnKTtcbiAgICAgIC8vIGNvbnN0IGh0bWwgPSAoYXdhaXQgZWwhLiRldmFsKCc6c2NvcGUgPiBib2R5JywgZWwgPT4gZWwuaW5uZXJIVE1MKSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhodG1sKTtcblxuICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjbW92ZVxcXFwuc3VidGFza1xcXFwucGFyZW50XFxcXC5vcGVyYXRpb25cXFxcLm5hbWVfaWQnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICAgICAgYXdhaXQgcGFnZS5jbGljaygnI21vdmVcXFxcLnN1YnRhc2tcXFxcLnBhcmVudFxcXFwub3BlcmF0aW9uXFxcXC5uYW1lX2lkJywge2RlbGF5OiAyMDB9KTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKTtcbiAgICAgIGF3YWl0IHBhZ2UuY2xpY2soJyNuZXh0X3N1Ym1pdCcsIHtkZWxheTogMjAwfSk7XG4gICAgICBhd2FpdCBwYWdlLndhaXRGb3IoJ2lucHV0W25hbWU9cGFyZW50SXNzdWVdJywge3Zpc2libGU6IHRydWV9KTtcbiAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgcGFnZS4kKCdpbnB1dFtuYW1lPXBhcmVudElzc3VlXScpO1xuICAgICAgYXdhaXQgaW5wdXQhLmNsaWNrKCk7XG4gICAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnNlbmRDaGFyYWN0ZXIobmV3UGFyZW50SWQpO1xuICAgICAgYXdhaXQgcGFnZS5jbGljaygnI3JlcGFyZW50X3N1Ym1pdCcsIHtkZWxheTogMjAwfSk7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBpZiAocGFnZS51cmwoKS5zdGFydHNXaXRoKHVybCkpXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nKGAke2lkfSBpcyBtb3ZlZCB0byAke25ld1BhcmVudElkfWApO1xuICAgIH1cbiAgICBhd2FpdCBlZGl0SXNzdWUocGFnZSwge2VuZERhdGU6IHBhcmVudElzc3VlLmVuZERhdGUsIHZlcjogcGFyZW50SXNzdWUudmVyfSk7XG4gICAgY29uc29sZS5sb2coYCR7aWR9IGlzIHVwZGF0ZWRgKTtcbiAgfVxuICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhc3NpZ25Jc3N1ZXMoYXNzaWduZWU6IHN0cmluZywgLi4uaXNzdWVJZHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goKTtcbiAgY29uc3QgcGFnZSA9IChhd2FpdCBicm93c2VyLnBhZ2VzKCkpWzBdO1xuICBjb25zdCBqcWwgPSAnanFsPScgKyBlbmNvZGVVUklDb21wb25lbnQoYGlkIGluICgke2lzc3VlSWRzLmpvaW4oJywnKX0pYCk7XG4gIGF3YWl0IHBhZ2UuZ290bygnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz8nICsganFsKTtcbiAgYXdhaXQgZG9tVG9Jc3N1ZXMocGFnZSwgYXN5bmMgcGFpcnMgPT4ge1xuICAgIGZvciAoY29uc3QgW2lzc3VlLCBlbF0gb2YgcGFpcnMpIHtcbiAgICAgIGlmIChpc3N1ZS5hc3NpZ25lZSA9PT0gYXNzaWduZWUpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbGlua3MgPSBhd2FpdCBlbC4kJCgnOnNjb3BlID4gdGQgPiAuaXNzdWUtbGluaycpO1xuICAgICAgaWYgKGxpbmtzICYmIGxpbmtzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgbGluayA9IGxpbmtzW2xpbmtzLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGF3YWl0IGxpbmsuY2xpY2soe2RlbGF5OiAzMDB9KTtcbiAgICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjYXNzaWduLWlzc3VlJywge3Zpc2libGU6IHRydWV9KTtcbiAgICAgICAgYXdhaXQgcGFnZS5jbGljaygnI2Fzc2lnbi1pc3N1ZScsIHtkZWxheTogMzAwfSk7XG4gICAgICAgIGF3YWl0IHBhZ2Uud2FpdEZvcignI2Fzc2lnbi1kaWFsb2cnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICAgICAgICBjb25zdCBpbnB1dCA9IGF3YWl0IHBhZ2UuJCgnI2Fzc2lnbmVlLWZpZWxkJyk7XG4gICAgICAgIGF3YWl0IGVkaXRJbnB1dFRleHQocGFnZSwgaW5wdXQsIGFzc2lnbmVlKTtcbiAgICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yKCdib2R5ID4gLmFqcy1sYXllcicsIHt2aXNpYmxlOiB0cnVlfSk7XG4gICAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0VudGVyJywge2RlbGF5OiAxMDB9KTtcbiAgICAgICAgYXdhaXQgcGFnZS5jbGljaygnI2Fzc2lnbi1pc3N1ZS1zdWJtaXQnLCB7ZGVsYXk6IDEwMH0pO1xuICAgICAgICBhd2FpdCBwYWdlLndhaXRGb3IoJyNhc3NpZ24tZGlhbG9nJywge2hpZGRlbjogdHJ1ZX0pO1xuICAgICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4gICAgICAgIGF3YWl0IHBhZ2UuZ29CYWNrKHt3YWl0VW50aWw6ICduZXR3b3JraWRsZTAnfSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuXG4gIGF3YWl0IGJyb3dzZXIuY2xvc2UoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2xpY2tNb3JlQnV0dG9uKHBhZ2U6IHB1cC5QYWdlLCBidXR0b246IHN0cmluZykge1xuICBjb25zdCBtb3JlQnRuID0gYXdhaXQgcGFnZS4kKCcjb3BzYmFyLW9wZXJhdGlvbnNfbW9yZScpO1xuICBpZiAobW9yZUJ0biA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignI29wc2Jhci1vcGVyYXRpb25zX21vcmUgbm90IGZvdW5kIGluIHBhZ2UnKTsgLy8gY2xpY2sg5pu05aSaXG5cbiAgYXdhaXQgbW9yZUJ0biEuY2xpY2soe2RlbGF5OiAxMDB9KTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjb3BzYmFyLW9wZXJhdGlvbnNfbW9yZV9kcm9wJywge3Zpc2libGU6IHRydWV9KTtcblxuICBjb25zdCBtZW51SXRlbXMgPSBhd2FpdCBwYWdlLiQkKCcjb3BzYmFyLW9wZXJhdGlvbnNfbW9yZV9kcm9wIC50cmlnZ2VyLWxhYmVsJyk7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBtZW51SXRlbXMpIHtcbiAgICBjb25zdCB0ZXh0OiBzdHJpbmcgPSBhd2FpdCBpdGVtLmdldFByb3BlcnR5KCdpbm5lckhUTUwnKS50aGVuKGpoID0+IGpoLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPik7XG4gICAgaWYgKHRleHQgPT09IGJ1dHRvbikge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMCkpO1xuICAgICAgYXdhaXQgaXRlbS5jbGljaygpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG5cbnR5cGUgRXh0cmFjdFByb21pc2U8Vj4gPSBWIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBFPiA/IEUgOiB1bmtub3duO1xuXG5hc3luYyBmdW5jdGlvbiBlZGl0SW5wdXRUZXh0KHBhZ2U6IHB1cC5QYWdlLCBpbnB1dEVsOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHB1cC5QYWdlWyckJ10+PiwgbmV3VmFsdWU6IHN0cmluZykge1xuICBpZiAoaW5wdXRFbCA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgdmFsdWUgPSBhd2FpdCBpbnB1dEVsLmV2YWx1YXRlKChpbnB1dDogSFRNTElucHV0RWxlbWVudCkgPT4gaW5wdXQudmFsdWUpO1xuICBhd2FpdCBpbnB1dEVsLmNsaWNrKHtkZWxheTogMzAwfSk7XG4gIGlmICh2YWx1ZSkge1xuICAgIGZvciAobGV0IGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoICsgMjsgaSA8IGw7IGkrKylcbiAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0Fycm93UmlnaHQnLCB7ZGVsYXk6IDUwfSk7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGggKyAzOyBpIDwgbDsgaSsrKVxuICAgICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnQmFja3NwYWNlJywge2RlbGF5OiA1MH0pO1xuICB9XG5cbiAgYXdhaXQgcGFnZS5rZXlib2FyZC50eXBlKG5ld1ZhbHVlLCB7ZGVsYXk6IDUwfSk7XG59XG5cbiJdfQ==