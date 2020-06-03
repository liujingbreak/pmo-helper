"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
const fs_1 = tslib_1.__importDefault(require("fs"));
const jsYaml = tslib_1.__importStar(require("js-yaml"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const moment_1 = tslib_1.__importDefault(require("moment"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const puppeteer_1 = require("./puppeteer");
moment_1.default.locale('zh-cn');
const log = require('log4js').getLogger('jira-helper');
const DEFAULT_TASK_MODULE_VALUE = '大C线-研发';
function login() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const pages = yield browser.pages();
        yield pages[0].goto('https://issue.bkjk-inc.com', { timeout: 0, waitUntil: 'domcontentloaded' });
    });
}
exports.login = login;
// export await function waitForCondition()
function domToIssues(page, onEachPage) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const trPairs = [];
                const table = yield page.$('#issuetable');
                if (table == null)
                    return [];
                const cellTitles = yield getCellTitles(table);
                log.info('List headers:', cellTitles.join(', '));
                const done = yield Promise.all((yield table.$$(':scope > tbody > tr')).map((row) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                    (yield Promise.all((yield row.$$(':scope > td')).map((td) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                        .map((a) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield a.getProperty('innerText')).jsonValue(); })));
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
function listStory(
// tslint:disable-next-line: max-line-length
url = 'https://issue.bkjk-inc.com/issues/?filter=14118') {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        fs_1.default.writeFileSync('dist/list-story.yaml', jsYaml.safeDump(grouped));
        log.info('Result has been written to dist/list-story.yaml');
        yield browser.close();
        // tslint:disable-next-line: no-console
        console.log('Have a nice day');
    });
}
exports.listStory = listStory;
function sync() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const pages = yield browser.pages();
        const issueByProj = jsYaml.load(fs_1.default.readFileSync(__api_1.default.argv.file ? __api_1.default.argv.file : 'dist/list-story.yaml', 'utf8'));
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.info('adding', task);
        yield clickMoreButton(page, '创建子任务');
        yield page.waitFor('#create-subtask-dialog', { visible: true });
        const dialog = yield page.$('#create-subtask-dialog');
        if (!dialog)
            throw new Error('Adding issue dialog not found');
        yield dialog.$('input[name=summary]')
            .then(input => input.type(task.name));
        const input = yield dialog.$('#fixVersions-textarea');
        yield input.click();
        log.info('version:', task.ver[0]);
        yield input.type(task.ver[0], { delay: 100 });
        yield page.keyboard.press('Enter');
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
            'Start date': dates[0],
            'End date': endDateBaseOnVersion(task.ver[0]) || dates[1],
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        const page = (yield browser.pages())[0];
        const storyMap = new Map();
        // tslint:disable-next-line: max-line-length
        yield page.goto('https://issue.bkjk-inc.com/issues/?filter=14109', { waitUntil: 'networkidle2' });
        yield domToIssues(page, (rows) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return issue.id + ` ${issue.name} (${issue.est}) | API int:${issue.intEst || '0'}`;
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
    return time.format('D/MMMM/YY');
}
function testDate() {
    console.log(endDateBaseOnVersion('feafa/903'));
    console.log(moment_1.default('15/十月/19', 'D/MMMM/YY').toDate());
}
exports.testDate = testDate;
/**
 * Check README.md for command line arguments
 */
function checkTask() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch(false);
        yield browser.newPage();
        const pages = yield browser.pages();
        const url = 'https://issue.bkjk-inc.com/issues/?filter=14109';
        yield pages[1].goto(url, { timeout: 0, waitUntil: 'networkidle2' });
        const parentSet = new Set();
        const compareToDate = moment_1.default().add(__api_1.default.argv.endInDays || 3, 'days');
        log.info('Comparent to end date:', compareToDate.format('YYYY/M/D'));
        yield domToIssues(pages[1], (rows) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                const endDateObj = moment_1.default(task.endDate, 'D/MMMM/YY');
                if (task.endDate && endDateObj.isBefore(compareToDate)) {
                    // tslint:disable-next-line:max-line-length
                    log.warn(`End date:${task.endDate} "${displayIssue(task)}"`);
                    if (__api_1.default.argv.addDays) {
                        yield _editTr(pages[1], tr, {
                            endDate: endDateObj.add(parseInt(__api_1.default.argv.addDays, 10), 'days').format('D/MMMM/YY')
                        });
                    }
                }
                const parent = parentMap.get(task.parentId);
                if (parent) {
                    const parentEndDateMom = moment_1.default(parent.endDate, 'D/MMMM/YY');
                    const notSameVersion = task.ver[0] !== parent.ver[0];
                    const earlierEndDate = endDateObj.isBefore(parentEndDateMom);
                    const verDate = endDateBaseOnVersion(parent.ver[0]);
                    const updateToTask = {};
                    let needUpdate = false;
                    if (notSameVersion) {
                        needUpdate = true;
                        // tslint:disable-next-line: max-line-length
                        log.warn(`Task "${displayIssue(task)}"\n  version "${task.ver[0]}" doesn't match parent "${parent.ver[0]}"\n`);
                        updateToTask.ver = parent.ver;
                    }
                    if (verDate && task.endDate !== verDate) {
                        needUpdate = true;
                        updateToTask.endDate = verDate;
                        // tslint:disable-next-line: max-line-length
                        log.warn(`Task "${displayIssue(task)}"\n  end date "${task.endDate}" doesn't match parent version ${parent.ver[0]} - ${verDate}`);
                    }
                    else if (earlierEndDate) {
                        needUpdate = true;
                        updateToTask.endDate = parent.endDate;
                        // tslint:disable-next-line: max-line-length
                        log.warn(`Task "${displayIssue(task)}"\n  end date "${task.endDate}" is earlier than parent "${parent.endDate}"`);
                    }
                    if (needUpdate && __api_1.default.argv.updateVersion) {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield (yield tr.$$(':scope > .summary .issue-link'))[1].click();
        yield editIssue(page, updateTask);
        yield page.goBack();
        yield page.waitFor(800);
    });
}
function editIssue(page, task) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (issueTable == null)
            return [];
        const ths = yield issueTable.$$(':scope > thead th');
        const titles = yield Promise.all(ths.map((th) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch();
        const page = (yield browser.pages())[0];
        const jql = 'jql=' + encodeURIComponent(`id in (${issueIds.join(',')})`);
        yield page.goto('https://issue.bkjk-inc.com/issues/?' + jql);
        yield domToIssues(page, (pairs) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvdHMvamlyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLHdEQUFrQztBQUNsQyw0REFBdUI7QUFDdkIsNERBQTRCO0FBRTVCLDBEQUF3QjtBQUN4QiwyQ0FBcUM7QUFDckMsZ0JBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUV2RCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQztBQW9CM0MsU0FBc0IsS0FBSzs7UUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxrQkFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFDOUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUFBO0FBTEQsc0JBS0M7QUFFRCwyQ0FBMkM7QUFFM0MsU0FBZSxXQUFXLENBQUMsSUFBYyxFQUN2QyxVQUFxRTs7UUFFckUsSUFBSSxNQUFNLEdBQVksRUFBRSxDQUFDO1FBQ3pCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixPQUFPLElBQUksRUFBRTtZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sY0FBYyxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUM7WUFDekMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7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UUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztTQUN2RDtRQUVELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvZGlzdC9qaXJhLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIGpzWWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgcHVwIGZyb20gJ3B1cHBldGVlci1jb3JlJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgbGF1bmNoIH0gZnJvbSAnLi9wdXBwZXRlZXInO1xubW9tZW50LmxvY2FsZSgnemgtY24nKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignamlyYS1oZWxwZXInKTtcblxuY29uc3QgREVGQVVMVF9UQVNLX01PRFVMRV9WQUxVRSA9ICflpKdD57q/LeeglOWPkSc7XG5leHBvcnQgaW50ZXJmYWNlIElzc3VlIHtcbiAgYnJpZWY/OiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAgc3RhdHVzOiBzdHJpbmc7XG4gIGRlc2M/OiBzdHJpbmc7XG4gIHZlcjogc3RyaW5nW107XG4gIGFzc2lnbmVlOiBzdHJpbmc7XG4gIHRhc2tzPzogSXNzdWVbXTtcbiAgcGFyZW50SWQ/OiBzdHJpbmc7XG4gIGVuZERhdGU/OiBzdHJpbmc7XG4gIGVzdD86IG51bWJlcjsgLy8gZXN0aW1hdGlvbiBkdXJhdGlvblxuICBpbnRFc3Q/OiBudW1iZXI7IC8vIEFQSSBpbnRlZ3JhdGlvbiBlc3RpbWF0aW9uIGR1cmF0aW9uXG5cbiAgJysnPzoge1thc3NpZ25lZTogc3RyaW5nXTogc3RyaW5nW119O1xufVxuXG50eXBlIE5ld1Rhc2sgPSB7W2tleSBpbiBrZXlvZiBJc3N1ZV0/OiBJc3N1ZVtrZXldfSAmIHtuYW1lOiBzdHJpbmd9O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9naW4oKSB7XG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goZmFsc2UpO1xuICBjb25zdCBwYWdlcyA9IGF3YWl0IGJyb3dzZXIucGFnZXMoKTtcbiAgYXdhaXQgcGFnZXNbMF0uZ290bygnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20nLFxuICAgIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICdkb21jb250ZW50bG9hZGVkJ30pO1xufVxuXG4vLyBleHBvcnQgYXdhaXQgZnVuY3Rpb24gd2FpdEZvckNvbmRpdGlvbigpXG5cbmFzeW5jIGZ1bmN0aW9uIGRvbVRvSXNzdWVzKHBhZ2U6IHB1cC5QYWdlLFxuICBvbkVhY2hQYWdlPzogKHRyUGFpcnM6IFtJc3N1ZSwgcHVwLkVsZW1lbnRIYW5kbGVdW10pID0+IFByb21pc2U8dm9pZD5cbikge1xuICBsZXQgaXNzdWVzOiBJc3N1ZVtdID0gW107XG4gIGxldCBwYWdlSWR4ID0gMTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBsb2cuaW5mbygnUGFnZSAlczogJXMnLCBwYWdlSWR4KyssIHBhZ2UudXJsKCkpO1xuICAgIGNvbnN0IGN1cnJQYWdlSXNzdWVzID0gYXdhaXQgZmV0Y2hQYWdlKCk7XG4gICAgaXNzdWVzID0gaXNzdWVzLmNvbmNhdChjdXJyUGFnZUlzc3Vlcyk7XG4gICAgY29uc3QgbmV4dFBhZ2VMaW5rID0gYXdhaXQgcGFnZS4kKCcucGFnaW5hdGlvbiA+IGEubmF2LW5leHQnKTtcbiAgICBpZiAobmV4dFBhZ2VMaW5rID09IG51bGwpXG4gICAgICBicmVhaztcbiAgICBhd2FpdCBuZXh0UGFnZUxpbmsuY2xpY2soKTtcbiAgICAvLyBjaGVjayBmaXJzdCBjZWxsLCB3YWl0IGZvciBpdHMgRE9NIG11dGF0aW9uXG5cbiAgICBjb25zdCBsYXN0Rmlyc3RSb3dJZCA9IGN1cnJQYWdlSXNzdWVzWzBdLmlkO1xuXG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yRnVuY3Rpb24oKG9yaWdpbklzc3VlSWQpID0+IHtcbiAgICAgIGNvbnN0IHRkOiBIVE1MRWxlbWVudCB8IG51bGwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaXNzdWV0YWJsZSA+IHRib2R5ID4gdHIgPiB0ZCcpO1xuICAgICAgcmV0dXJuIHRkICYmIHRkLmlubmVyVGV4dC5sZW5ndGggPiAwICYmIHRkLmlubmVyVGV4dC50cmltKCkgIT09IG9yaWdpbklzc3VlSWQ7XG4gICAgfSwge3BvbGxpbmc6ICdtdXRhdGlvbid9LCBsYXN0Rmlyc3RSb3dJZCk7XG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yKDUwMCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmZXRjaFBhZ2UoKSB7XG4gICAgY29uc3QgdHJQYWlyczogW0lzc3VlLCBwdXAuRWxlbWVudEhhbmRsZV1bXSA9IFtdO1xuICAgIGNvbnN0IHRhYmxlID0gYXdhaXQgcGFnZS4kKCcjaXNzdWV0YWJsZScpO1xuICAgIGlmICh0YWJsZSA9PSBudWxsKSByZXR1cm4gW10gYXMgSXNzdWVbXTtcbiAgICBjb25zdCBjZWxsVGl0bGVzID0gYXdhaXQgZ2V0Q2VsbFRpdGxlcyh0YWJsZSk7XG4gICAgbG9nLmluZm8oJ0xpc3QgaGVhZGVyczonLGNlbGxUaXRsZXMuam9pbignLCAnKSk7XG4gICAgY29uc3QgZG9uZSA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgKGF3YWl0IHRhYmxlIS4kJCgnOnNjb3BlID4gdGJvZHkgPiB0cicpKS5tYXAoYXN5bmMgcm93ID0+IHtcblxuICAgICAgICAvLyBGaWxsIHRpdGxlMlZhbHVlTWFwIGFuZCBjbHNNYXBcbiAgICAgICAgY29uc3QgY2xzTWFwID0gYXdhaXQgcm93LiQkZXZhbCgnOnNjb3BlID4gdGQnLCBlbHMgPT4ge1xuICAgICAgICAgIGNvbnN0IGNvbE1hcDoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBlbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGVsc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKGVsIGFzIEhUTUxFbGVtZW50KS5pbm5lclRleHQ7XG4gICAgICAgICAgICBjb2xNYXBbZWwuY2xhc3NOYW1lXSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY29sTWFwO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB0aXRsZTJWYWx1ZU1hcDoge1t0aXRsZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gICAgICAgIChhd2FpdCBQcm9taXNlLmFsbCgoYXdhaXQgcm93LiQkKCc6c2NvcGUgPiB0ZCcpKS5tYXAoYXN5bmMgdGQgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXdhaXQgdGQuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5qc29uVmFsdWUoKTtcbiAgICAgICAgfSkpKS5mb3JFYWNoKCh2YWx1ZSwgaSkgPT4gdGl0bGUyVmFsdWVNYXBbY2VsbFRpdGxlc1tpKytdXSA9IHZhbHVlIGFzIHN0cmluZyk7XG5cbiAgICAgICAgLy8gbG9nLmluZm8odXRpbC5pbnNwZWN0KHRpdGxlMlZhbHVlTWFwKSk7XG4gICAgICAgIC8vIGxvZy5pbmZvKGNsc01hcCk7XG4gICAgICAgIGNvbnN0IHRyaW1lZE1hcDoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNsc01hcCkpIHtcbiAgICAgICAgICB0cmltZWRNYXBba2V5LnRyaW1MZWZ0KCkuc3BsaXQoL1tcXG5cXHJdKy8pWzBdXSA9IGNsc01hcFtrZXldLnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjcmVhdGUgSXNzdWUgb2JqZWN0XG4gICAgICAgIGNvbnN0IGlzc3VlOiBJc3N1ZSA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICB2ZXI6IFt0cmltZWRNYXAuZml4VmVyc2lvbnNdLFxuICAgICAgICAgIHN0YXR1czogdHJpbWVkTWFwLnN0YXR1cyxcbiAgICAgICAgICBhc3NpZ25lZTogdHJpbWVkTWFwLmFzc2lnbmVlLFxuICAgICAgICAgIGlkOiB0cmltZWRNYXAuaXNzdWVrZXksXG4gICAgICAgICAgZW5kRGF0ZTogdGl0bGUyVmFsdWVNYXBbJ0VuZCBkYXRlJ11cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKG9uRWFjaFBhZ2UpXG4gICAgICAgICAgdHJQYWlycy5wdXNoKFtpc3N1ZSwgcm93XSk7XG5cbiAgICAgICAgLy8gYXNzaWduIGlzc3VlIG5hbWUgYW5kIGlzc3VlIHBhcmVudCBpZFxuICAgICAgICBjb25zdCBsaW5rcyA9IGF3YWl0IHJvdy4kJCgnOnNjb3BlID4gdGQuc3VtbWFyeSBhLmlzc3VlLWxpbmsnKTtcbiAgICAgICAgaWYgKGxpbmtzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBjb25zdCBwYXJlbnRJZDogc3RyaW5nID0gYXdhaXQgKGF3YWl0IGxpbmtzWzBdLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgc3RyaW5nO1xuICAgICAgICAgIGlzc3VlLnBhcmVudElkID0gcGFyZW50SWQ7XG4gICAgICAgICAgaXNzdWUubmFtZSA9IGF3YWl0IChhd2FpdCBsaW5rc1sxXS5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykpLmpzb25WYWx1ZSgpIGFzIHN0cmluZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpc3N1ZS5uYW1lID0gYXdhaXQgKGF3YWl0IGxpbmtzWzBdLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgc3RyaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaXNzdWUudmVyID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgKGF3YWl0IHJvdy4kJCgnOnNjb3BlID4gdGQuZml4VmVyc2lvbnMgPiAqJykpXG4gICAgICAgICAgLm1hcChhc3luYyBhID0+IChhd2FpdCBhLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+KVxuICAgICAgICApO1xuXG4gICAgICAgIGlmICh0cmltZWRNYXAuYWdncmVnYXRldGltZWVzdGltYXRlKSB7XG4gICAgICAgICAgaXNzdWUuZXN0ID0gZXN0aW1hdGlvblRvTnVtKHRyaW1lZE1hcC5hZ2dyZWdhdGV0aW1lZXN0aW1hdGUudHJpbSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNzdWU7XG4gICAgICB9KVxuICAgICk7XG4gICAgaWYgKG9uRWFjaFBhZ2UpXG4gICAgICBhd2FpdCBvbkVhY2hQYWdlKHRyUGFpcnMpO1xuXG4gICAgcmV0dXJuIGRvbmU7XG4gIH1cblxuICByZXR1cm4gaXNzdWVzO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFN0b3J5KFxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICB1cmwgPSAnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz9maWx0ZXI9MTQxMTgnKSB7XG5cbiAgY29uc3QgaW5jbHVkZVByb2ogPSBhcGkuYXJndi5pbmNsdWRlID9cbiAgICBuZXcgU2V0PHN0cmluZz4oKGFwaS5hcmd2LmluY2x1ZGUgYXMgc3RyaW5nKS5zcGxpdCgnLCcpLm1hcChlbCA9PiBlbC50cmltKCkpICk6XG4gICAgICBudWxsO1xuICBpZiAoaW5jbHVkZVByb2opXG4gICAgY29uc29sZS5sb2coJ2luY2x1ZGUgcHJvamVjdCBwcmZpZXg6ICcsIGluY2x1ZGVQcm9qKTtcblxuICBjb25zdCBpbmNsdWRlVmVyID0gYXBpLmFyZ3YuaW5jbHVkZVZlcnNpb24gP1xuICAgIChhcGkuYXJndi5pbmNsdWRlVmVyc2lvbiArICcnKS5zcGxpdCgnLCcpLm1hcChlbCA9PiBlbC50cmltKCkudG9Mb2NhbGVMb3dlckNhc2UoKSkgOiBudWxsO1xuXG5cbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaChmYWxzZSk7XG4gIGNvbnN0IHBhZ2VzID0gYXdhaXQgYnJvd3Nlci5wYWdlcygpO1xuICBhd2FpdCBwYWdlc1swXS5nb3RvKHVybCwge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlMid9KTtcbiAgYXdhaXQgcGFnZXNbMF0ud2FpdEZvcignI2lzc3VldGFibGUgPiB0Ym9keScsIHt2aXNpYmxlOiB0cnVlfSk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnZmV0Y2hpbmcgcGFnZSBkb25lJyk7XG4gIGNvbnN0IHBhZ2UgPSBwYWdlc1swXTtcblxuICBsZXQgaXNzdWVzID0gYXdhaXQgZG9tVG9Jc3N1ZXMocGFnZSwgZm9yU3RvcnlzKTtcblxuICBpZiAoaW5jbHVkZVByb2opIHtcbiAgICBpc3N1ZXMgPSBpc3N1ZXMuZmlsdGVyKGlzc3VlID0+IHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGlzc3VlLmlkLnNsaWNlKDAsIGlzc3VlLmlkLmluZGV4T2YoJy0nKSk7XG4gICAgICByZXR1cm4gaW5jbHVkZVByb2ouaGFzKHByZWZpeCk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAoaW5jbHVkZVZlcikge1xuICAgIGlzc3VlcyA9IGlzc3Vlcy5maWx0ZXIoaXNzdWUgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coaXNzdWUudmVyLCBpbmNsdWRlVmVyKTtcbiAgICAgIHJldHVybiBpc3N1ZS52ZXIubWFwKHZlciA9PiB2ZXIudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgLnNvbWUodmVyc2lvbiA9PiBpbmNsdWRlVmVyLnNvbWUoaW5jbHVkZSA9PiB2ZXJzaW9uLmluZGV4T2YoaW5jbHVkZSkgPj0gMCkpO1xuICAgIH0pO1xuICB9XG5cblxuICBsb2cuaW5mbygnTnVtIG9mIHN0b3JpZXM6JywgaXNzdWVzLmxlbmd0aCk7XG5cblxuICAvLyBmb3IgKGNvbnN0IGlzc3VlIG9mIGlzc3Vlcykge1xuICBhc3luYyBmdW5jdGlvbiBmb3JTdG9yeXModHJQYWlyczogW0lzc3VlLCBwdXAuRWxlbWVudEhhbmRsZV1bXSkge1xuICAgIGZvciAoY29uc3QgW2lzc3VlLCB0cl0gb2YgdHJQYWlycykge1xuICAgICAgY29uc3QgcHJlZml4ID0gaXNzdWUuaWQuc2xpY2UoMCwgaXNzdWUuaWQuaW5kZXhPZignLScpKTtcbiAgICAgIGlmIChpbmNsdWRlUHJvaiAmJiAhaW5jbHVkZVByb2ouaGFzKHByZWZpeCkgfHxcbiAgICAgICAgaW5jbHVkZVZlciAmJiAhaXNzdWUudmVyLm1hcCh2ZXIgPT4gdmVyLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgLnNvbWUodmVyc2lvbiA9PiBpbmNsdWRlVmVyLnNvbWUoaW5jbHVkZSA9PiB2ZXJzaW9uLmluZGV4T2YoaW5jbHVkZSkgPj0gMCkpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhbmNob3JzID0gYXdhaXQgdHIuJCQoYDpzY29wZSA+IC5pc3N1ZWtleSA+IGEuaXNzdWUtbGlua1tkYXRhLWlzc3VlLWtleT0ke2lzc3VlLmlkfV1gKTtcblxuICAgICAgbGV0IGxpbmtDbGlja2VkID0gZmFsc2U7XG4gICAgICBmb3IgKGNvbnN0IGFuY2hvciBvZiBhbmNob3JzKSB7XG4gICAgICAgIGNvbnN0IGJ4ID0gYXdhaXQgYW5jaG9yLmJvdW5kaW5nQm94KCk7XG5cbiAgICAgICAgaWYgKGJ4ICYmIGJ4LmhlaWdodCA+IDEwICYmIGJ4LndpZHRoID4gMTApIHtcbiAgICAgICAgICBsb2cuaW5mbygnR28gaXNzdWUgZGV0YWlsczogJywgaXNzdWUuaWQpO1xuICAgICAgICAgIGF3YWl0IGFuY2hvci5jbGljaygpO1xuICAgICAgICAgIGF3YWl0IHBhZ2Uud2FpdEZvclNlbGVjdG9yKCcubGlzdC12aWV3Jywge2hpZGRlbjogdHJ1ZX0pO1xuICAgICAgICAgIGlzc3VlLnRhc2tzID0gYXdhaXQgbGlzdFN1YnRhc2tzKHBhZ2UsIGlzc3VlKTtcbiAgICAgICAgICBhd2FpdCBwYWdlLmdvQmFjayh7d2FpdFVudGlsOiAnbmV0d29ya2lkbGUwJ30pO1xuICAgICAgICAgIGxpbmtDbGlja2VkID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFsaW5rQ2xpY2tlZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBsaW5rIGZvciAke2lzc3VlLmlkfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGNvbnN0IGdyb3VwZWQgPSBfLmdyb3VwQnkoaXNzdWVzLCBpc3N1ZSA9PiBpc3N1ZS5pZC5zbGljZSgwLCBpc3N1ZS5pZC5pbmRleE9mKCctJykpKTtcbiAgY29uc3QgZ3JvdXBlZCA9IF8uZ3JvdXBCeShpc3N1ZXMsIGlzc3VlID0+IGlzc3VlLnZlciAmJiBpc3N1ZS52ZXIubGVuZ3RoID4gMCA/IGlzc3VlLnZlclswXSA6ICdObyB2ZXJzaW9uJyk7XG5cbiAgZnMud3JpdGVGaWxlU3luYygnZGlzdC9saXN0LXN0b3J5LnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoZ3JvdXBlZCkpO1xuICBsb2cuaW5mbygnUmVzdWx0IGhhcyBiZWVuIHdyaXR0ZW4gdG8gZGlzdC9saXN0LXN0b3J5LnlhbWwnKTtcblxuICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnSGF2ZSBhIG5pY2UgZGF5Jyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzeW5jKCkge1xuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKGZhbHNlKTtcbiAgY29uc3QgcGFnZXMgPSBhd2FpdCBicm93c2VyLnBhZ2VzKCk7XG5cbiAgY29uc3QgaXNzdWVCeVByb2o6IHtbcHJvajogc3RyaW5nXTogSXNzdWVbXX0gPSBqc1lhbWwubG9hZChmcy5yZWFkRmlsZVN5bmMoXG4gICAgYXBpLmFyZ3YuZmlsZSA/IGFwaS5hcmd2LmZpbGUgOiAnZGlzdC9saXN0LXN0b3J5LnlhbWwnLCAndXRmOCcpKTtcblxuICBmb3IgKGNvbnN0IHByb2ogb2YgT2JqZWN0LmtleXMoaXNzdWVCeVByb2opKSB7XG4gICAgY29uc3QgaXNzdWVzID0gaXNzdWVCeVByb2pbcHJval07XG4gICAgbG9nLmluZm8oaXNzdWVzLmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBpc3N1ZSBvZiBpc3N1ZXMpIHtcbiAgICAgIGlmIChpc3N1ZS50YXNrcykge1xuICAgICAgICBsb2cuaW5mbygnQ2hlY2sgaXNzdWUnLCBpc3N1ZS5pZCk7XG5cbiAgICAgICAgY29uc3QgdGFza3NXaXRob3V0SWQgPSBpc3N1ZS50YXNrc1xuICAgICAgICAuZmlsdGVyKHRhc2sgPT4gdGFzay5pZCA9PSBudWxsKTtcbiAgICAgICAgLy8gbG9nLmluZm8odGFza3NXaXRob3V0SWQpO1xuICAgICAgICBpZiAodGFza3NXaXRob3V0SWQubGVuZ3RoID4gMClcbiAgICAgICAgICBhd2FpdCBjcmVhdGVUYXNrcyhpc3N1ZSwgdGFza3NXaXRob3V0SWQsIHBhZ2VzWzBdKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRvQWRkID0gaXNzdWVbJysnXTtcbiAgICAgIGlmICh0b0FkZCkge1xuICAgICAgICBjb25zdCB0YXNrczogTmV3VGFza1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgYXNzaWduZWUgb2YgT2JqZWN0LmtleXModG9BZGQpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIHRvQWRkW2Fzc2lnbmVlXSkge1xuICAgICAgICAgICAgY29uc3QgW25hbWVdID0gbGluZS5zcGxpdCgvW1xcclxcbl0rLyk7XG4gICAgICAgICAgICBjb25zdCBkZXNjID0gbGluZTtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW06IE5ld1Rhc2sgPSB7XG4gICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgIGRlc2MsXG4gICAgICAgICAgICAgIGFzc2lnbmVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgY3JlYXRlVGFza3MoaXNzdWUsIHRhc2tzLCBwYWdlc1swXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGF3YWl0IGJyb3dzZXIuY2xvc2UoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlVGFza3MocGFyZW50SXNzdWU6IElzc3VlLCB0YXNrczogTmV3VGFza1tdLCBwYWdlOiBwdXAuUGFnZSkge1xuICBhd2FpdCBwYWdlLmdvdG8oJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2Jyb3dzZS8nICsgcGFyZW50SXNzdWUuaWQsXG4gICAge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlMid9KTtcbiAgY29uc3QgcmVtb3RlVGFza3MgPSBhd2FpdCBsaXN0U3VidGFza3MocGFnZSwgcGFyZW50SXNzdWUpO1xuICBwYXJlbnRJc3N1ZS52ZXIgPSBhd2FpdCBQcm9taXNlLmFsbCgoYXdhaXQgcGFnZS4kJCgnI2ZpeGZvci12YWwgYScpKVxuICAgIC5tYXAoYSA9PiBhLmdldFByb3BlcnR5KCdpbm5lclRleHQnKS50aGVuKGpoID0+IGpoLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPikpKTtcblxuICBjb25zdCBpc0hkZWNvciA9IHBhcmVudElzc3VlLmlkLnN0YXJ0c1dpdGgoJ0hERUNPUicpO1xuICBjb25zdCBwcmVmaXggPSBpc0hkZWNvciA/ICfoo4XotJ0tRkUtJyA6ICdGRSAtICc7XG4gIHRhc2tzLmZvckVhY2godGFzayA9PiB7XG4gICAgaWYgKCF0YXNrLm5hbWUuc3RhcnRzV2l0aChwcmVmaXgpKVxuICAgICAgdGFzay5uYW1lID0gcHJlZml4ICsgdGFzay5uYW1lO1xuICB9KTtcbiAgY29uc3QgdG9BZGQgPSBfLmRpZmZlcmVuY2VCeSh0YXNrcywgcmVtb3RlVGFza3MsIGlzc3VlID0+IGlzc3VlLm5hbWUpO1xuICBsb2cuaW5mbygnQ3JlYXRpbmcgbmV3IGlzc3VlXFxuJywgdG9BZGQpO1xuXG4gIGZvciAoY29uc3QgaXRlbSBvZiB0b0FkZCkge1xuICAgIGl0ZW0udmVyID0gcGFyZW50SXNzdWUudmVyO1xuICAgIGF3YWl0IF9hZGRTdWJUYXNrKHBhZ2UsIGl0ZW0pO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9hZGRTdWJUYXNrKHBhZ2U6IHB1cC5QYWdlLCB0YXNrOiBOZXdUYXNrKSB7XG4gIGxvZy5pbmZvKCdhZGRpbmcnLCB0YXNrKTtcbiAgYXdhaXQgY2xpY2tNb3JlQnV0dG9uKHBhZ2UsICfliJvlu7rlrZDku7vliqEnKTtcblxuICBhd2FpdCBwYWdlLndhaXRGb3IoJyNjcmVhdGUtc3VidGFzay1kaWFsb2cnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICBjb25zdCBkaWFsb2cgPSBhd2FpdCBwYWdlLiQoJyNjcmVhdGUtc3VidGFzay1kaWFsb2cnKTtcbiAgaWYgKCFkaWFsb2cpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgaXNzdWUgZGlhbG9nIG5vdCBmb3VuZCcpO1xuXG4gIGF3YWl0IGRpYWxvZy4kKCdpbnB1dFtuYW1lPXN1bW1hcnldJylcbiAgICAudGhlbihpbnB1dCA9PiBpbnB1dCEudHlwZSh0YXNrLm5hbWUpKTtcblxuICBjb25zdCBpbnB1dCA9IGF3YWl0IGRpYWxvZy4kKCcjZml4VmVyc2lvbnMtdGV4dGFyZWEnKTtcbiAgYXdhaXQgaW5wdXQhLmNsaWNrKCk7XG4gIGxvZy5pbmZvKCd2ZXJzaW9uOicsIHRhc2sudmVyIVswXSk7XG4gIGF3YWl0IGlucHV0IS50eXBlKHRhc2sudmVyIVswXSwge2RlbGF5OiAxMDB9KTtcbiAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnRW50ZXInKTtcbiAgYXdhaXQgZGlhbG9nLiQoJyNkZXNjcmlwdGlvbi13aWtpLWVkaXQnKS50aGVuKGVsID0+IGVsIS5jbGljaygpKTtcbiAgYXdhaXQgcGFnZS5rZXlib2FyZC50eXBlKHRhc2suZGVzYyA/IHRhc2suZGVzYyA6IHRhc2submFtZSk7XG5cbiAgY29uc3QgbGFiZWxzID0gYXdhaXQgZGlhbG9nLiQkKCcuZmllbGQtZ3JvdXAgPiBsYWJlbCcpO1xuXG4gIGNvbnN0IHRleHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgbGFiZWxzLm1hcChsYWJlbCA9PiBsYWJlbC5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykudGhlbih2ID0+IHYuanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+KSkpO1xuICBjb25zdCBsYWJlbE1hcDoge1tuYW1lOiBzdHJpbmddOiBwdXAuRWxlbWVudEhhbmRsZX0gPSB7fTtcbiAgdGV4dHMuZm9yRWFjaCgodGV4dCwgaWR4KSA9PiBsYWJlbE1hcFt0ZXh0LnNwbGl0KC9bXFxuXFxyXFx0XSsvKVswXV0gPSBsYWJlbHNbaWR4XSk7XG4gIC8vIGxvZy5pbmZvKE9iamVjdC5rZXlzKGxhYmVsTWFwKSk7XG5cbiAgY29uc3QgbWF0Y2hOYW1lID0gL1so77yIXShbMC05Ll0rW2RoREhdPylbKe+8iV1cXHMqJC8uZXhlYyh0YXNrLm5hbWUpO1xuICBsZXQgZHVyYXRpb24gPSBtYXRjaE5hbWUgPyBtYXRjaE5hbWVbMV0gOiAnMC41ZCc7XG4gIGlmICghZHVyYXRpb24uZW5kc1dpdGgoJ2QnKSAmJiAhZHVyYXRpb24uZW5kc1dpdGgoJ2gnKSkge1xuICAgIGR1cmF0aW9uID0gZHVyYXRpb24gKyAnZCc7XG4gIH1cbiAgY29uc3QgZGF0ZXMgPSBkYXRlKCk7XG4gIGNvbnN0IGZvcm1WYWx1ZXMgPSB7XG4gICAgJ1N0YXJ0IGRhdGUnOiBkYXRlc1swXSxcbiAgICAnRW5kIGRhdGUnOiBlbmREYXRlQmFzZU9uVmVyc2lvbih0YXNrLnZlciFbMF0pIHx8IGRhdGVzWzFdLFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogb2JqZWN0LWxpdGVyYWwta2V5LXF1b3Rlc1xuICAgICfliJ3lp4vpooTkvLAnOiBkdXJhdGlvbixcbiAgICDliankvZnnmoTkvLDnrpc6IGR1cmF0aW9uLFxuICAgIOe7j+WKnuS6ujogdGFzay5hc3NpZ25lZSB8fCAn5YiY5pm2J1xuICB9O1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhsYWJlbE1hcCkpIHtcbiAgICBpZiAobmFtZS5pbmRleE9mKCfmqKHlnZcnKSA+PSAwICYmICFfLmhhcyhmb3JtVmFsdWVzLCBuYW1lKSkge1xuICAgICAgY29uc3QgaWQgPSAoYXdhaXQgbGFiZWxNYXBbbmFtZV0uZXZhbHVhdGUoZWwgPT4gZWwuZ2V0QXR0cmlidXRlKCdmb3InKSkpO1xuICAgICAgY29uc3QgaW5wdXRFbCA9IGF3YWl0IHBhZ2UuJCgnIycgKyBpZCk7XG4gICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGlucHV0RWwhLmV2YWx1YXRlKGVsID0+IChlbCBhcyBIVE1MVGV4dEFyZWFFbGVtZW50KS52YWx1ZSk7XG4gICAgICBpZiAodmFsdWUudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBhd2FpdCBpbnB1dEVsIS5jbGljaygpO1xuICAgICAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUoREVGQVVMVF9UQVNLX01PRFVMRV9WQUxVRSwge2RlbGF5OiA1MH0pO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmICghXy5oYXMoZm9ybVZhbHVlcywgbmFtZSkpXG4gICAgICBjb250aW51ZTtcbiAgICBhd2FpdCBsYWJlbE1hcFtuYW1lXS5jbGljayh7ZGVsYXk6IDUwfSk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMCkpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQudHlwZShmb3JtVmFsdWVzW25hbWVdLCB7ZGVsYXk6IDUwfSk7XG4gICAgaWYgKG5hbWUgPT09ICfnu4/lip7kuronKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7IC8vIHdhaXQgZm9yIEpJUkEgc2VhcmNoaW5nIHVzZXJcbiAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0VudGVyJywge2RlbGF5OiA1MH0pO1xuICAgIH1cbiAgfVxuICBhd2FpdCBkaWFsb2cuJCgnI2NyZWF0ZS1pc3N1ZS1zdWJtaXQnKS50aGVuKGJ0biA9PiBidG4hLmNsaWNrKCkpO1xuICBhd2FpdCBwYWdlLndhaXRGb3IoJyNjcmVhdGUtc3VidGFzay1kaWFsb2cnLCB7aGlkZGVuOiB0cnVlfSk7XG5cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbGlzdFN1YnRhc2tzKHBhZ2U6IHB1cC5QYWdlLCB7dmVyfToge3Zlcjogc3RyaW5nW119KSB7XG4gIGNvbnN0IHRhc2tzID0gYXdhaXQgcGFnZS4kJGV2YWwoJyN2aWV3LXN1YnRhc2tzICNpc3N1ZXRhYmxlID4gdGJvZHkgPiB0cicsIChlbHMsIHZlcikgPT4ge1xuICAgIHJldHVybiBlbHMubWFwKGVsID0+IHtcbiAgICAgIGNvbnN0IG5hbWU6IEhUTUxFbGVtZW50IHwgbnVsbCA9IGVsLnF1ZXJ5U2VsZWN0b3IoJzpzY29wZSA+IC5zdHN1bW1hcnkgPiBhJyk7XG4gICAgICBjb25zdCBzdWJ0YXNrOiBJc3N1ZSA9IHtcbiAgICAgICAgbmFtZTogbmFtZSA/IG5hbWUuaW5uZXJUZXh0LnRyaW0oKSA6ICcnLFxuICAgICAgICBpZDogZWwuZ2V0QXR0cmlidXRlKCdkYXRhLWlzc3Vla2V5JykhLFxuICAgICAgICBzdGF0dXM6IChlbC5xdWVyeVNlbGVjdG9yKCcuc3RhdHVzJykgYXMgSFRNTEVsZW1lbnQpLmlubmVyVGV4dC50cmltKCksXG4gICAgICAgIHZlcixcbiAgICAgICAgLy8gYXNzaWduZWU6ICcnXG4gICAgICAgIGFzc2lnbmVlOiAoZWwucXVlcnlTZWxlY3RvcignLmFzc2lnbmVlJykgYXMgSFRNTEVsZW1lbnQpLmlubmVyVGV4dC50cmltKClcbiAgICAgIH07XG4gICAgICByZXR1cm4gc3VidGFzaztcbiAgICB9KTtcbiAgfSwgdmVyKTtcbiAgcmV0dXJuIHRhc2tzO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFBhcmVudCgpIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaChmYWxzZSk7XG4gIGNvbnN0IHBhZ2UgPSAoYXdhaXQgYnJvd3Nlci5wYWdlcygpKVswXTtcblxuICBjb25zdCBzdG9yeU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBJc3N1ZT4oKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgYXdhaXQgcGFnZS5nb3RvKCdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9pc3N1ZXMvP2ZpbHRlcj0xNDEwOScsXG4gICAge3dhaXRVbnRpbDogJ25ldHdvcmtpZGxlMid9KTtcbiAgYXdhaXQgZG9tVG9Jc3N1ZXMocGFnZSwgYXN5bmMgcm93cyA9PiB7XG4gICAgZm9yIChjb25zdCBbaXNzdWUsIHRyXSBvZiByb3dzKSB7XG4gICAgICBpZiAoaXNzdWUucGFyZW50SWQpIHtcbiAgICAgICAgY29uc3QgbGluayA9IGF3YWl0IHRyLiQoJzpzY29wZSA+IHRkLnN1bW1hcnkgYS5pc3N1ZS1saW5rJyk7XG4gICAgICAgIGNvbnN0IHBuYW1lID0gYXdhaXQgcGFnZVxuICAgICAgICAuZXZhbHVhdGUoZWwgPT4gZWwuZ2V0QXR0cmlidXRlKCd0aXRsZScpLCBsaW5rKTtcbiAgICAgICAgbGV0IHBJc3N1ZTogSXNzdWU7XG4gICAgICAgIGlmICghc3RvcnlNYXAuaGFzKGlzc3VlLnBhcmVudElkKSkge1xuICAgICAgICAgIHBJc3N1ZSA9IHtcbiAgICAgICAgICAgIGJyaWVmOiBwbmFtZSxcbiAgICAgICAgICAgIG5hbWU6IHBuYW1lLFxuICAgICAgICAgICAgaWQ6IGlzc3VlLnBhcmVudElkLFxuICAgICAgICAgICAgc3RhdHVzOiAnJyxcbiAgICAgICAgICAgIGFzc2lnbmVlOiAnJyxcbiAgICAgICAgICAgIHZlcjogW10sXG4gICAgICAgICAgICBlc3Q6IDAsXG4gICAgICAgICAgICB0YXNrczogW11cbiAgICAgICAgICB9O1xuICAgICAgICAgIHN0b3J5TWFwLnNldChpc3N1ZS5wYXJlbnRJZCwgcElzc3VlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwSXNzdWUgPSBzdG9yeU1hcC5nZXQoaXNzdWUucGFyZW50SWQpITtcbiAgICAgICAgfVxuICAgICAgICBpZiAoL0FQSVxccyrogZTosIMvaS50ZXN0KGlzc3VlLm5hbWUpKSB7XG4gICAgICAgICAgcElzc3VlLmludEVzdCA9IGlzc3VlLmVzdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwSXNzdWUuZXN0ISArPSBpc3N1ZS5lc3QhO1xuICAgICAgICB9XG4gICAgICAgIHBJc3N1ZS50YXNrcyEucHVzaChpc3N1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBjb25zb2xlLmxvZygnV3JpdHRlZCB0byBkaXN0L3BhcmVudC1zdG9yeS55YW1sJyk7XG4gIGNvbnN0IHN0b3JpZXMgPSBBcnJheS5mcm9tKHN0b3J5TWFwLnZhbHVlcygpKTtcbiAgZnMud3JpdGVGaWxlU3luYygnZGlzdC9wYXJlbnQtc3RvcnkueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChzdG9yaWVzKSk7XG4gIGNvbnNvbGUubG9nKHN0b3JpZXMubWFwKHN0b3J5ID0+IGRpc3BsYXlJc3N1ZShzdG9yeSkpLmpvaW4oJ1xcbicpKTtcbiAgYnJvd3Nlci5jbG9zZSgpO1xufVxuXG5mdW5jdGlvbiBkYXRlKCk6IFtzdHJpbmcsIHN0cmluZ10ge1xuICBjb25zdCB0aW1lID0gbW9tZW50KCk7XG4gIC8vIGNvbnNvbGUubG9nKHRpbWUuZm9ybWF0KCdEL01NTU0vWVknKSwgdGltZS5hZGQoMjEsICdkYXlzJykuZm9ybWF0KCdEL01NTU0vWVknKSk7XG4gIHJldHVybiBbdGltZS5mb3JtYXQoJ0QvTU1NTS9ZWScpLCB0aW1lLmFkZCgzMCwgJ2RheXMnKS5mb3JtYXQoJ0QvTU1NTS9ZWScpXTtcbn1cblxuZnVuY3Rpb24gZXN0aW1hdGlvblRvTnVtKGVzdGltYXRpb25TdHI6IHN0cmluZykge1xuICBjb25zdCBtYXRjaCA9IC8oWzAtOS5dKyko5pelfOWwj+aXtnzliIYpLy5leGVjKGVzdGltYXRpb25TdHIpO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkZSBlc3RpbWF0aW9uIGZvcm1hdDogJHtlc3RpbWF0aW9uU3RyfWApO1xuICB9XG4gIGlmIChtYXRjaFsyXSA9PT0gJ+Wwj+aXticpIHtcbiAgICByZXR1cm4gcGFyc2VGbG9hdChtYXRjaFsxXSkgLyA4O1xuICB9IGVsc2UgaWYgKG1hdGNoWzJdID09PSAn5YiGJykge1xuICAgIHJldHVybiBwYXJzZUludChtYXRjaFsxXSwgMTApIC8gOCAvIDYwO1xuICB9XG4gIHJldHVybiBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbn1cblxuZnVuY3Rpb24gZGlzcGxheUlzc3VlKGlzc3VlOiBJc3N1ZSk6IHN0cmluZyB7XG4gIHJldHVybiBpc3N1ZS5pZCArIGAgJHtpc3N1ZS5uYW1lfSAoJHtpc3N1ZS5lc3R9KSB8IEFQSSBpbnQ6JHtpc3N1ZS5pbnRFc3QgfHwgJzAnfWA7XG59XG5cbmZ1bmN0aW9uIGVuZERhdGVCYXNlT25WZXJzaW9uKHZlcjogc3RyaW5nKSB7XG4gIGNvbnN0IHZlck1hdGNoID0gLyhcXGR7MSwyfSkoXFxkXFxkKSQvLmV4ZWModmVyKTtcbiAgaWYgKHZlck1hdGNoID09IG51bGwgfHwgdmVyTWF0Y2hbMV0gPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHRpbWUgPSBtb21lbnQoKTtcbiAgdGltZS5tb250aChwYXJzZUludCh2ZXJNYXRjaFsxXSwgMTApIC0gMSk7XG4gIHRpbWUuZGF0ZShwYXJzZUludCh2ZXJNYXRjaFsyXSwgMTApKTtcbiAgLy8gdGltZS5zdWJ0cmFjdCg1LCAnZGF5cycpO1xuICBpZiAodGltZS5pc0JlZm9yZShuZXcgRGF0ZSgpKSkge1xuICAgIHRpbWUuYWRkKDEsICd5ZWFycycpO1xuICB9XG4gIHJldHVybiB0aW1lLmZvcm1hdCgnRC9NTU1NL1lZJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZXN0RGF0ZSgpIHtcbiAgY29uc29sZS5sb2coZW5kRGF0ZUJhc2VPblZlcnNpb24oJ2ZlYWZhLzkwMycpKTtcbiAgY29uc29sZS5sb2cobW9tZW50KCcxNS/ljYHmnIgvMTknLCAnRC9NTU1NL1lZJykudG9EYXRlKCkpO1xufVxuXG4vKipcbiAqIENoZWNrIFJFQURNRS5tZCBmb3IgY29tbWFuZCBsaW5lIGFyZ3VtZW50c1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tUYXNrKCkge1xuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKGZhbHNlKTtcbiAgYXdhaXQgYnJvd3Nlci5uZXdQYWdlKCk7XG4gIGNvbnN0IHBhZ2VzID0gYXdhaXQgYnJvd3Nlci5wYWdlcygpO1xuICBjb25zdCB1cmwgPSAnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz9maWx0ZXI9MTQxMDknO1xuICBhd2FpdCBwYWdlc1sxXS5nb3RvKHVybCwge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlMid9KTtcblxuICBjb25zdCBwYXJlbnRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgY29tcGFyZVRvRGF0ZSA9IG1vbWVudCgpLmFkZChhcGkuYXJndi5lbmRJbkRheXMgfHwgMywgJ2RheXMnKTtcbiAgbG9nLmluZm8oJ0NvbXBhcmVudCB0byBlbmQgZGF0ZTonLCBjb21wYXJlVG9EYXRlLmZvcm1hdCgnWVlZWS9NL0QnKSk7XG5cbiAgYXdhaXQgZG9tVG9Jc3N1ZXMocGFnZXNbMV0sIGFzeW5jIHJvd3MgPT4ge1xuICAgIHJvd3MgPSByb3dzLmZpbHRlcigoW3Rhc2tdKSA9PiB0YXNrLnN0YXR1cyA9PT0gJ+W8gOaUvicgfHwgdGFzay5zdGF0dXMgPT09ICdERVZFTE9QSU5HJyk7XG4gICAgcGFyZW50U2V0LmNsZWFyKCk7XG4gICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgICAgY29uc3QgW3Rhc2tdID0gcm93O1xuICAgICAgLy8gY29uc29sZS5sb2codGFzayk7XG4gICAgICBpZiAodGFzay5wYXJlbnRJZCkge1xuICAgICAgICBwYXJlbnRTZXQuYWRkKHRhc2sucGFyZW50SWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhcmVudE1hcCA9IGF3YWl0IGxpc3RJc3N1ZUJ5SWRzKHBhZ2VzWzBdLCBBcnJheS5mcm9tKHBhcmVudFNldC52YWx1ZXMoKSkpO1xuXG4gICAgZm9yIChjb25zdCBbdGFzaywgdHJdIG9mIHJvd3MpIHtcbiAgICAgIGNvbnN0IGVuZERhdGVPYmogPSBtb21lbnQodGFzay5lbmREYXRlLCAnRC9NTU1NL1lZJyk7XG4gICAgICBpZiAodGFzay5lbmREYXRlICYmIGVuZERhdGVPYmouaXNCZWZvcmUoY29tcGFyZVRvRGF0ZSkpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAgICAgICBsb2cud2FybihgRW5kIGRhdGU6JHt0YXNrLmVuZERhdGV9IFwiJHtkaXNwbGF5SXNzdWUodGFzayl9XCJgKTtcbiAgICAgICAgaWYgKGFwaS5hcmd2LmFkZERheXMpIHtcbiAgICAgICAgICBhd2FpdCBfZWRpdFRyKHBhZ2VzWzFdLCB0ciwge1xuICAgICAgICAgICAgZW5kRGF0ZTogZW5kRGF0ZU9iai5hZGQocGFyc2VJbnQoYXBpLmFyZ3YuYWRkRGF5cywgMTApLCAnZGF5cycpLmZvcm1hdCgnRC9NTU1NL1lZJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXJlbnRNYXAuZ2V0KHRhc2sucGFyZW50SWQhKTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgcGFyZW50RW5kRGF0ZU1vbSA9IG1vbWVudChwYXJlbnQuZW5kRGF0ZSwgJ0QvTU1NTS9ZWScpO1xuICAgICAgICBjb25zdCBub3RTYW1lVmVyc2lvbiA9IHRhc2sudmVyWzBdICE9PSBwYXJlbnQhLnZlclswXTtcbiAgICAgICAgY29uc3QgZWFybGllckVuZERhdGUgPSBlbmREYXRlT2JqLmlzQmVmb3JlKHBhcmVudEVuZERhdGVNb20pO1xuICAgICAgICBjb25zdCB2ZXJEYXRlID0gZW5kRGF0ZUJhc2VPblZlcnNpb24ocGFyZW50LnZlclswXSk7XG5cbiAgICAgICAgY29uc3QgdXBkYXRlVG9UYXNrOiBQYXJhbWV0ZXJzPHR5cGVvZiBfZWRpdFRyPlsyXSA9IHt9O1xuICAgICAgICBsZXQgbmVlZFVwZGF0ZSA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChub3RTYW1lVmVyc2lvbikge1xuICAgICAgICAgIG5lZWRVcGRhdGUgPSB0cnVlO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgbG9nLndhcm4oYFRhc2sgXCIke2Rpc3BsYXlJc3N1ZSh0YXNrKX1cIlxcbiAgdmVyc2lvbiBcIiR7dGFzay52ZXJbMF19XCIgZG9lc24ndCBtYXRjaCBwYXJlbnQgXCIke3BhcmVudC52ZXJbMF19XCJcXG5gKTtcbiAgICAgICAgICB1cGRhdGVUb1Rhc2sudmVyID0gcGFyZW50LnZlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmVyRGF0ZSAmJiB0YXNrLmVuZERhdGUgIT09IHZlckRhdGUpIHtcbiAgICAgICAgICBuZWVkVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICB1cGRhdGVUb1Rhc2suZW5kRGF0ZSA9IHZlckRhdGU7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAgICAgICBsb2cud2FybihgVGFzayBcIiR7ZGlzcGxheUlzc3VlKHRhc2spfVwiXFxuICBlbmQgZGF0ZSBcIiR7dGFzay5lbmREYXRlfVwiIGRvZXNuJ3QgbWF0Y2ggcGFyZW50IHZlcnNpb24gJHtwYXJlbnQudmVyWzBdfSAtICR7dmVyRGF0ZX1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChlYXJsaWVyRW5kRGF0ZSkge1xuICAgICAgICAgIG5lZWRVcGRhdGUgPSB0cnVlO1xuICAgICAgICAgIHVwZGF0ZVRvVGFzay5lbmREYXRlID0gcGFyZW50LmVuZERhdGU7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAgICAgICBsb2cud2FybihgVGFzayBcIiR7ZGlzcGxheUlzc3VlKHRhc2spfVwiXFxuICBlbmQgZGF0ZSBcIiR7dGFzay5lbmREYXRlfVwiIGlzIGVhcmxpZXIgdGhhbiBwYXJlbnQgXCIke3BhcmVudC5lbmREYXRlfVwiYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmVlZFVwZGF0ZSAmJiBhcGkuYXJndi51cGRhdGVWZXJzaW9uKSB7XG4gICAgICAgICAgYXdhaXQgX2VkaXRUcihwYWdlc1sxXSwgdHIsIHVwZGF0ZVRvVGFzayk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9lZGl0VHIocGFnZTogcHVwLlBhZ2UsIHRyOiBwdXAuRWxlbWVudEhhbmRsZSwgdXBkYXRlVGFzazoge1trZXkgaW4ga2V5b2YgSXNzdWVdPzogSXNzdWVba2V5XX0pIHtcbiAgYXdhaXQgKGF3YWl0IHRyLiQkKCc6c2NvcGUgPiAuc3VtbWFyeSAuaXNzdWUtbGluaycpKVsxXS5jbGljaygpO1xuICBhd2FpdCBlZGl0SXNzdWUocGFnZSwgdXBkYXRlVGFzayk7XG4gIGF3YWl0IHBhZ2UuZ29CYWNrKCk7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvcig4MDApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBlZGl0SXNzdWUocGFnZTogcHVwLlBhZ2UsIHRhc2s6IFBhcnRpYWw8SXNzdWU+KSB7XG4gIGNvbnN0IGVkaXRCdXR0b24gPSBhd2FpdCBwYWdlLndhaXRGb3JTZWxlY3RvcignI2VkaXQtaXNzdWUnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICBhd2FpdCBlZGl0QnV0dG9uLmNsaWNrKCk7XG4gIGNvbnN0IGRpYWxvZyA9IGF3YWl0IHBhZ2Uud2FpdEZvclNlbGVjdG9yKCcjZWRpdC1pc3N1ZS1kaWFsb2cnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuXG4gIGlmICh0YXNrLm5hbWUpIHtcbiAgICBjb25zb2xlLmxvZygnY2hhbmdlIG5hbWUgdG8gJywgdGFzay5uYW1lKTtcbiAgICBhd2FpdCBkaWFsb2cuJCgnaW5wdXRbbmFtZT1zdW1tYXJ5XScpXG4gICAgICAudGhlbihpbnB1dCA9PiBpbnB1dCEudHlwZSh0YXNrLm5hbWUhKSk7XG4gIH1cblxuICBpZiAodGFzay52ZXIgJiYgdGFzay52ZXIubGVuZ3RoID4gMCkge1xuICAgIGNvbnNvbGUubG9nKCcgIGNoYW5nZSB2ZXJzaW9uIHRvICcsIHRhc2sudmVyWzBdKTtcbiAgICBjb25zdCBpbnB1dCA9IGF3YWl0IGRpYWxvZy4kKCcjZml4VmVyc2lvbnMtdGV4dGFyZWEnKTtcbiAgICBhd2FpdCBpbnB1dCEuY2xpY2soKTtcbiAgICBmb3IgKGxldCBpPTA7IGk8NTsgaSsrKVxuICAgICAgYXdhaXQgaW5wdXQhLnByZXNzKCdCYWNrc3BhY2UnLCB7ZGVsYXk6IDE1MH0pO1xuICAgIC8vIGF3YWl0IHBhZ2Uud2FpdEZvcigxMDAwKTtcbiAgICBhd2FpdCBpbnB1dCEudHlwZSh0YXNrLnZlclswXSwge2RlbGF5OiAxMDB9KTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdFbnRlcicpO1xuICB9XG5cbiAgaWYgKHRhc2suZGVzYyAhPSBudWxsKSB7XG4gICAgY29uc29sZS5sb2coJyAgY2hhbmdlIGRlc2NyaXB0aW9uIHRvJywgdGFzay5kZXNjKTtcbiAgICBhd2FpdCBkaWFsb2cuJCgnI2Rlc2NyaXB0aW9uLXdpa2ktZWRpdCcpLnRoZW4oZWwgPT4gZWwhLmNsaWNrKCkpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQudHlwZSh0YXNrLmRlc2MgPyB0YXNrLmRlc2MgOiB0YXNrLm5hbWUhKTtcbiAgfVxuXG4gIGNvbnN0IGxhYmVscyA9IGF3YWl0IGRpYWxvZy4kJCgnLmZpZWxkLWdyb3VwID4gbGFiZWwnKTtcblxuICBjb25zdCB0ZXh0cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGxhYmVscy5tYXAobGFiZWwgPT4gbGFiZWwuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpLnRoZW4odiA9PiB2Lmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPikpKTtcbiAgY29uc3QgbGFiZWxNYXA6IHtbbmFtZTogc3RyaW5nXTogcHVwLkVsZW1lbnRIYW5kbGV9ID0ge307XG4gIHRleHRzLmZvckVhY2goKHRleHQsIGlkeCkgPT4gbGFiZWxNYXBbdGV4dC5zcGxpdCgvW1xcblxcclxcdF0rLylbMF1dID0gbGFiZWxzW2lkeF0pO1xuXG4gIGNvbnN0IGRhdGVzID0gZGF0ZSgpO1xuICBjb25zdCBmb3JtVmFsdWVzID0ge307XG5cbiAgaWYgKHRhc2sudmVyICYmIHRhc2sudmVyLmxlbmd0aCA+IDApXG4gICAgZm9ybVZhbHVlc1snRW5kIGRhdGUnXSA9IGVuZERhdGVCYXNlT25WZXJzaW9uKHRhc2sudmVyIVswXSkgfHwgZGF0ZXNbMV07XG5cbiAgaWYgKHRhc2suZW5kRGF0ZSlcbiAgICBmb3JtVmFsdWVzWydFbmQgZGF0ZSddID0gdGFzay5lbmREYXRlO1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhsYWJlbE1hcCkpIHtcbiAgICBpZiAoIV8uaGFzKGZvcm1WYWx1ZXMsIG5hbWUpKVxuICAgICAgY29udGludWU7XG4gICAgYXdhaXQgbGFiZWxNYXBbbmFtZV0uY2xpY2soe2RlbGF5OiA1MH0pO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKTtcbiAgICBjb25zdCBpbnB1dElkID0gJyMnICsgYXdhaXQgcGFnZS5ldmFsdWF0ZShsYWJlbCA9PiBsYWJlbC5nZXRBdHRyaWJ1dGUoJ2ZvcicpLCBsYWJlbE1hcFtuYW1lXSk7XG4gICAgLy8gY29uc29sZS5sb2coaW5wdXRJZCk7XG4gICAgY29uc3QgdmFsdWUgPSBhd2FpdCBwYWdlLiRldmFsKGlucHV0SWQsIGlucHV0ID0+IChpbnB1dCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSk7XG5cbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoICsgMjsgaSA8IGw7IGkrKylcbiAgICAgICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnQXJyb3dSaWdodCcsIHtkZWxheTogNTB9KTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoICsgNTsgaSA8IGw7IGkrKylcbiAgICAgICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnQmFja3NwYWNlJywge2RlbGF5OiA1MH0pO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnJXM6ICVzIC0+ICVzJywgbmFtZSwgdmFsdWUsIGZvcm1WYWx1ZXNbbmFtZV0pO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQudHlwZShmb3JtVmFsdWVzW25hbWVdLCB7ZGVsYXk6IDUwfSk7XG4gICAgLy8gaWYgKG5hbWUgPT09ICfnu4/lip7kuronKSB7XG4gICAgLy8gICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7IC8vIHdhaXQgZm9yIEpJUkEgc2VhcmNoaW5nIHVzZXJcbiAgICAvLyAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0VudGVyJywge2RlbGF5OiA1MH0pO1xuICAgIC8vIH1cbiAgfVxuICBhd2FpdCAoYXdhaXQgZGlhbG9nLiQoJyNlZGl0LWlzc3VlLXN1Ym1pdCcpKSEuY2xpY2soKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjZWRpdC1pc3N1ZS1kaWFsb2cnLCB7aGlkZGVuOiB0cnVlfSk7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvcigxMDAwKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q2VsbFRpdGxlcyhpc3N1ZVRhYmxlOiBwdXAuRWxlbWVudEhhbmRsZTxFbGVtZW50PiB8IG51bGwpIHtcbiAgaWYgKGlzc3VlVGFibGUgPT0gbnVsbClcbiAgICByZXR1cm4gW107XG4gIGNvbnN0IHRocyA9IGF3YWl0IGlzc3VlVGFibGUuJCQoJzpzY29wZSA+IHRoZWFkIHRoJyk7XG5cbiAgY29uc3QgdGl0bGVzID0gYXdhaXQgUHJvbWlzZS5hbGwodGhzLm1hcChhc3luYyB0aCA9PiB7XG4gICAgY29uc3QgaGVhZGVyID0gYXdhaXQgdGguJCgnOnNjb3BlID4gc3Bhblt0aXRsZV0nKTtcbiAgICBpZiAoaGVhZGVyKSB7XG4gICAgICByZXR1cm4gKGF3YWl0IGhlYWRlci5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykpLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIChhd2FpdCB0aC5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykpLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPjtcbiAgICB9XG4gIH0pKTtcblxuICByZXR1cm4gdGl0bGVzLm1hcCh0aXRsZSA9PiB0aXRsZS50cmltKCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0SXNzdWVCeUlkcyhwYWdlOiBwdXAuUGFnZSwgaWRzOiBzdHJpbmdbXSkge1xuICBjb25zdCBqcWwgPSAnanFsPScgKyBlbmNvZGVVUklDb21wb25lbnQoYGlkIGluICgke2lkcy5qb2luKCcsJyl9KWApO1xuICBhd2FpdCBwYWdlLmdvdG8oJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2lzc3Vlcy8/JyArIGpxbCk7XG4gIGNvbnN0IGlzc3VlTWFwID0gKGF3YWl0IGRvbVRvSXNzdWVzKHBhZ2UpKS5yZWR1Y2UoKG1hcCwgaXNzdWUpID0+IHtcbiAgICBtYXAuc2V0KGlzc3VlLmlkLCBpc3N1ZSk7XG4gICAgcmV0dXJuIG1hcDtcbiAgfSwgbmV3IE1hcDxzdHJpbmcsIElzc3VlPigpKTtcbiAgcmV0dXJuIGlzc3VlTWFwO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbW92ZUlzc3VlcyhuZXdQYXJlbnRJZDogc3RyaW5nLCAuLi5tb3ZlZElzc3VlSWRzOiBzdHJpbmdbXSkge1xuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKCk7XG4gIGNvbnN0IHBhZ2UgPSAoYXdhaXQgYnJvd3Nlci5wYWdlcygpKVswXTtcblxuICBjb25zdCBwYXJlbnRJc3N1ZU1hcCA9IGF3YWl0IGxpc3RJc3N1ZUJ5SWRzKHBhZ2UsIFtuZXdQYXJlbnRJZF0pO1xuICBjb25zdCBwYXJlbnRJc3N1ZSA9IHBhcmVudElzc3VlTWFwLnZhbHVlcygpLm5leHQoKS52YWx1ZSBhcyBJc3N1ZTtcblxuICBjb25zb2xlLmxvZyhwYXJlbnRJc3N1ZSk7XG5cbiAgZm9yIChjb25zdCBpZCBvZiBtb3ZlZElzc3VlSWRzKSB7XG4gICAgY29uc3QgdXJsID0gJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2Jyb3dzZS8nICsgaWQ7XG4gICAgYXdhaXQgcGFnZS5nb3RvKHVybCwge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlMid9KTtcblxuICAgIGF3YWl0IHBhZ2Uud2FpdEZvcignI3BhcmVudF9pc3N1ZV9zdW1tYXJ5Jywge3Zpc2libGU6IHRydWV9KTtcbiAgICBjb25zdCBvcmlnUGFyZW50SWQgPSBhd2FpdCBwYWdlLiRldmFsKCcjcGFyZW50X2lzc3VlX3N1bW1hcnknLCBlbCA9PiBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXNzdWUta2V5JykpO1xuICAgIGlmIChvcmlnUGFyZW50SWQgIT09IHBhcmVudElzc3VlLmlkKSB7XG5cbiAgICAgIGF3YWl0IGNsaWNrTW9yZUJ1dHRvbihwYWdlLCAn56e75YqoJyk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4gICAgICAvLyBjb25zdCBlbCA9IGF3YWl0IHBhZ2UuJCgnaHRtbCcpO1xuICAgICAgLy8gY29uc3QgaHRtbCA9IChhd2FpdCBlbCEuJGV2YWwoJzpzY29wZSA+IGJvZHknLCBlbCA9PiBlbC5pbm5lckhUTUwpKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGh0bWwpO1xuXG4gICAgICBhd2FpdCBwYWdlLndhaXRGb3IoJyNtb3ZlXFxcXC5zdWJ0YXNrXFxcXC5wYXJlbnRcXFxcLm9wZXJhdGlvblxcXFwubmFtZV9pZCcsIHt2aXNpYmxlOiB0cnVlfSk7XG4gICAgICBhd2FpdCBwYWdlLmNsaWNrKCcjbW92ZVxcXFwuc3VidGFza1xcXFwucGFyZW50XFxcXC5vcGVyYXRpb25cXFxcLm5hbWVfaWQnLCB7ZGVsYXk6IDIwMH0pO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMCkpO1xuICAgICAgYXdhaXQgcGFnZS5jbGljaygnI25leHRfc3VibWl0Jywge2RlbGF5OiAyMDB9KTtcbiAgICAgIGF3YWl0IHBhZ2Uud2FpdEZvcignaW5wdXRbbmFtZT1wYXJlbnRJc3N1ZV0nLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBwYWdlLiQoJ2lucHV0W25hbWU9cGFyZW50SXNzdWVdJyk7XG4gICAgICBhd2FpdCBpbnB1dCEuY2xpY2soKTtcbiAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQuc2VuZENoYXJhY3RlcihuZXdQYXJlbnRJZCk7XG4gICAgICBhd2FpdCBwYWdlLmNsaWNrKCcjcmVwYXJlbnRfc3VibWl0Jywge2RlbGF5OiAyMDB9KTtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGlmIChwYWdlLnVybCgpLnN0YXJ0c1dpdGgodXJsKSlcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbiAgICAgIH1cblxuICAgICAgY29uc29sZS5sb2coYCR7aWR9IGlzIG1vdmVkIHRvICR7bmV3UGFyZW50SWR9YCk7XG4gICAgfVxuICAgIGF3YWl0IGVkaXRJc3N1ZShwYWdlLCB7ZW5kRGF0ZTogcGFyZW50SXNzdWUuZW5kRGF0ZSwgdmVyOiBwYXJlbnRJc3N1ZS52ZXJ9KTtcbiAgICBjb25zb2xlLmxvZyhgJHtpZH0gaXMgdXBkYXRlZGApO1xuICB9XG4gIGF3YWl0IGJyb3dzZXIuY2xvc2UoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFzc2lnbklzc3Vlcyhhc3NpZ25lZTogc3RyaW5nLCAuLi5pc3N1ZUlkczogc3RyaW5nW10pIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaCgpO1xuICBjb25zdCBwYWdlID0gKGF3YWl0IGJyb3dzZXIucGFnZXMoKSlbMF07XG4gIGNvbnN0IGpxbCA9ICdqcWw9JyArIGVuY29kZVVSSUNvbXBvbmVudChgaWQgaW4gKCR7aXNzdWVJZHMuam9pbignLCcpfSlgKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9pc3N1ZXMvPycgKyBqcWwpO1xuICBhd2FpdCBkb21Ub0lzc3VlcyhwYWdlLCBhc3luYyBwYWlycyA9PiB7XG4gICAgZm9yIChjb25zdCBbaXNzdWUsIGVsXSBvZiBwYWlycykge1xuICAgICAgaWYgKGlzc3VlLmFzc2lnbmVlID09PSBhc3NpZ25lZSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBsaW5rcyA9IGF3YWl0IGVsLiQkKCc6c2NvcGUgPiB0ZCA+IC5pc3N1ZS1saW5rJyk7XG4gICAgICBpZiAobGlua3MgJiYgbGlua3MubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBsaW5rID0gbGlua3NbbGlua3MubGVuZ3RoIC0gMV07XG5cbiAgICAgICAgYXdhaXQgbGluay5jbGljayh7ZGVsYXk6IDMwMH0pO1xuICAgICAgICBhd2FpdCBwYWdlLndhaXRGb3IoJyNhc3NpZ24taXNzdWUnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICAgICAgICBhd2FpdCBwYWdlLmNsaWNrKCcjYXNzaWduLWlzc3VlJywge2RlbGF5OiAzMDB9KTtcbiAgICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjYXNzaWduLWRpYWxvZycsIHt2aXNpYmxlOiB0cnVlfSk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgcGFnZS4kKCcjYXNzaWduZWUtZmllbGQnKTtcbiAgICAgICAgYXdhaXQgZWRpdElucHV0VGV4dChwYWdlLCBpbnB1dCwgYXNzaWduZWUpO1xuICAgICAgICBhd2FpdCBwYWdlLndhaXRGb3IoJ2JvZHkgPiAuYWpzLWxheWVyJywge3Zpc2libGU6IHRydWV9KTtcbiAgICAgICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnRW50ZXInLCB7ZGVsYXk6IDEwMH0pO1xuICAgICAgICBhd2FpdCBwYWdlLmNsaWNrKCcjYXNzaWduLWlzc3VlLXN1Ym1pdCcsIHtkZWxheTogMTAwfSk7XG4gICAgICAgIGF3YWl0IHBhZ2Uud2FpdEZvcignI2Fzc2lnbi1kaWFsb2cnLCB7aGlkZGVuOiB0cnVlfSk7XG4gICAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbiAgICAgICAgYXdhaXQgcGFnZS5nb0JhY2soe3dhaXRVbnRpbDogJ25ldHdvcmtpZGxlMCd9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG5cbiAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjbGlja01vcmVCdXR0b24ocGFnZTogcHVwLlBhZ2UsIGJ1dHRvbjogc3RyaW5nKSB7XG4gIGNvbnN0IG1vcmVCdG4gPSBhd2FpdCBwYWdlLiQoJyNvcHNiYXItb3BlcmF0aW9uc19tb3JlJyk7XG4gIGlmIChtb3JlQnRuID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCcjb3BzYmFyLW9wZXJhdGlvbnNfbW9yZSBub3QgZm91bmQgaW4gcGFnZScpOyAvLyBjbGljayDmm7TlpJpcblxuICBhd2FpdCBtb3JlQnRuIS5jbGljayh7ZGVsYXk6IDEwMH0pO1xuICBhd2FpdCBwYWdlLndhaXRGb3IoJyNvcHNiYXItb3BlcmF0aW9uc19tb3JlX2Ryb3AnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuXG4gIGNvbnN0IG1lbnVJdGVtcyA9IGF3YWl0IHBhZ2UuJCQoJyNvcHNiYXItb3BlcmF0aW9uc19tb3JlX2Ryb3AgLnRyaWdnZXItbGFiZWwnKTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIG1lbnVJdGVtcykge1xuICAgIGNvbnN0IHRleHQ6IHN0cmluZyA9IGF3YWl0IGl0ZW0uZ2V0UHJvcGVydHkoJ2lubmVySFRNTCcpLnRoZW4oamggPT4gamguanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+KTtcbiAgICBpZiAodGV4dCA9PT0gYnV0dG9uKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7XG4gICAgICBhd2FpdCBpdGVtLmNsaWNrKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbn1cblxudHlwZSBFeHRyYWN0UHJvbWlzZTxWPiA9IFYgZXh0ZW5kcyBQcm9taXNlPGluZmVyIEU+ID8gRSA6IHVua25vd247XG5cbmFzeW5jIGZ1bmN0aW9uIGVkaXRJbnB1dFRleHQocGFnZTogcHVwLlBhZ2UsIGlucHV0RWw6IEV4dHJhY3RQcm9taXNlPFJldHVyblR5cGU8cHVwLlBhZ2VbJyQnXT4+LCBuZXdWYWx1ZTogc3RyaW5nKSB7XG4gIGlmIChpbnB1dEVsID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBjb25zdCB2YWx1ZSA9IGF3YWl0IGlucHV0RWwuZXZhbHVhdGUoKGlucHV0OiBIVE1MSW5wdXRFbGVtZW50KSA9PiBpbnB1dC52YWx1ZSk7XG4gIGF3YWl0IGlucHV0RWwuY2xpY2soe2RlbGF5OiAzMDB9KTtcbiAgaWYgKHZhbHVlKSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGggKyAyOyBpIDwgbDsgaSsrKVxuICAgICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnQXJyb3dSaWdodCcsIHtkZWxheTogNTB9KTtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aCArIDM7IGkgPCBsOyBpKyspXG4gICAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdCYWNrc3BhY2UnLCB7ZGVsYXk6IDUwfSk7XG4gIH1cblxuICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUobmV3VmFsdWUsIHtkZWxheTogNTB9KTtcbn1cblxuIl19
