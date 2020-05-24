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
    const verMatch = /[ /](\d{1,2})(\d\d)$/.exec(ver);
    if (verMatch == null || verMatch[1] == null)
        return null;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvdHMvamlyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLHdEQUFrQztBQUNsQyw0REFBdUI7QUFDdkIsNERBQTRCO0FBRTVCLDBEQUF3QjtBQUN4QiwyQ0FBcUM7QUFDckMsZ0JBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQXFCdkQsU0FBc0IsS0FBSzs7UUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxrQkFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFDOUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUFBO0FBTEQsc0JBS0M7QUFFRCwyQ0FBMkM7QUFFM0MsU0FBZSxXQUFXLENBQUMsSUFBYyxFQUN2QyxVQUFxRTs7UUFFckUsSUFBSSxNQUFNLEdBQVksRUFBRSxDQUFDO1FBQ3pCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixPQUFPLElBQUksRUFBRTtZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sY0FBYyxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUM7WUFDekMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdkMsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENB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QUMsS0FBSyxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7WUFDdkQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUM5QyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO1NBQ3ZEO1FBRUQsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQUEiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci9qaXJhLWhlbHBlci9kaXN0L2ppcmEuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMganNZYW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCBwdXAgZnJvbSAncHVwcGV0ZWVyLWNvcmUnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBsYXVuY2ggfSBmcm9tICcuL3B1cHBldGVlcic7XG5tb21lbnQubG9jYWxlKCd6aC1jbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdqaXJhLWhlbHBlcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIElzc3VlIHtcbiAgYnJpZWY/OiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAgc3RhdHVzOiBzdHJpbmc7XG4gIGRlc2M/OiBzdHJpbmc7XG4gIHZlcjogc3RyaW5nW107XG4gIGFzc2lnbmVlOiBzdHJpbmc7XG4gIHRhc2tzPzogSXNzdWVbXTtcbiAgcGFyZW50SWQ/OiBzdHJpbmc7XG4gIGVuZERhdGU/OiBzdHJpbmc7XG4gIGVzdD86IG51bWJlcjsgLy8gZXN0aW1hdGlvbiBkdXJhdGlvblxuICBpbnRFc3Q/OiBudW1iZXI7IC8vIEFQSSBpbnRlZ3JhdGlvbiBlc3RpbWF0aW9uIGR1cmF0aW9uXG5cbiAgJysnPzoge1thc3NpZ25lZTogc3RyaW5nXTogc3RyaW5nW119O1xufVxuXG50eXBlIE5ld1Rhc2sgPSB7W2tleSBpbiBrZXlvZiBJc3N1ZV0/OiBJc3N1ZVtrZXldfSAmIHtuYW1lOiBzdHJpbmd9O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9naW4oKSB7XG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goZmFsc2UpO1xuICBjb25zdCBwYWdlcyA9IGF3YWl0IGJyb3dzZXIucGFnZXMoKTtcbiAgYXdhaXQgcGFnZXNbMF0uZ290bygnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20nLFxuICAgIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICdkb21jb250ZW50bG9hZGVkJ30pO1xufVxuXG4vLyBleHBvcnQgYXdhaXQgZnVuY3Rpb24gd2FpdEZvckNvbmRpdGlvbigpXG5cbmFzeW5jIGZ1bmN0aW9uIGRvbVRvSXNzdWVzKHBhZ2U6IHB1cC5QYWdlLFxuICBvbkVhY2hQYWdlPzogKHRyUGFpcnM6IFtJc3N1ZSwgcHVwLkVsZW1lbnRIYW5kbGVdW10pID0+IFByb21pc2U8dm9pZD5cbikge1xuICBsZXQgaXNzdWVzOiBJc3N1ZVtdID0gW107XG4gIGxldCBwYWdlSWR4ID0gMTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBsb2cuaW5mbygnUGFnZSAlczogJXMnLCBwYWdlSWR4KyssIHBhZ2UudXJsKCkpO1xuICAgIGNvbnN0IGN1cnJQYWdlSXNzdWVzID0gYXdhaXQgZmV0Y2hQYWdlKCk7XG4gICAgaXNzdWVzID0gaXNzdWVzLmNvbmNhdChjdXJyUGFnZUlzc3Vlcyk7XG4gICAgY29uc3QgbmV4dFBhZ2VMaW5rID0gYXdhaXQgcGFnZS4kKCcucGFnaW5hdGlvbiA+IGEubmF2LW5leHQnKTtcbiAgICBpZiAobmV4dFBhZ2VMaW5rID09IG51bGwpXG4gICAgICBicmVhaztcbiAgICBhd2FpdCBuZXh0UGFnZUxpbmsuY2xpY2soKTtcbiAgICAvLyBjaGVjayBmaXJzdCBjZWxsLCB3YWl0IGZvciBpdHMgRE9NIG11dGF0aW9uXG5cbiAgICBjb25zdCBsYXN0Rmlyc3RSb3dJZCA9IGN1cnJQYWdlSXNzdWVzWzBdLmlkO1xuXG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yRnVuY3Rpb24oKG9yaWdpbklzc3VlSWQpID0+IHtcbiAgICAgIGNvbnN0IHRkOiBIVE1MRWxlbWVudCB8IG51bGwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaXNzdWV0YWJsZSA+IHRib2R5ID4gdHIgPiB0ZCcpO1xuICAgICAgcmV0dXJuIHRkICYmIHRkLmlubmVyVGV4dC5sZW5ndGggPiAwICYmIHRkLmlubmVyVGV4dC50cmltKCkgIT09IG9yaWdpbklzc3VlSWQ7XG4gICAgfSwge3BvbGxpbmc6ICdtdXRhdGlvbid9LCBsYXN0Rmlyc3RSb3dJZCk7XG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yKDUwMCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmZXRjaFBhZ2UoKSB7XG4gICAgY29uc3QgdHJQYWlyczogW0lzc3VlLCBwdXAuRWxlbWVudEhhbmRsZV1bXSA9IFtdO1xuICAgIGNvbnN0IHRhYmxlID0gYXdhaXQgcGFnZS4kKCcjaXNzdWV0YWJsZScpO1xuICAgIGlmICh0YWJsZSA9PSBudWxsKSByZXR1cm4gW10gYXMgSXNzdWVbXTtcbiAgICBjb25zdCBjZWxsVGl0bGVzID0gYXdhaXQgZ2V0Q2VsbFRpdGxlcyh0YWJsZSk7XG4gICAgbG9nLmluZm8oJ0xpc3QgaGVhZGVyczonLGNlbGxUaXRsZXMuam9pbignLCAnKSk7XG4gICAgY29uc3QgZG9uZSA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgKGF3YWl0IHRhYmxlIS4kJCgnOnNjb3BlID4gdGJvZHkgPiB0cicpKS5tYXAoYXN5bmMgcm93ID0+IHtcblxuICAgICAgICAvLyBGaWxsIHRpdGxlMlZhbHVlTWFwIGFuZCBjbHNNYXBcbiAgICAgICAgY29uc3QgY2xzTWFwID0gYXdhaXQgcm93LiQkZXZhbCgnOnNjb3BlID4gdGQnLCBlbHMgPT4ge1xuICAgICAgICAgIGNvbnN0IGNvbE1hcDoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBlbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGVsc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKGVsIGFzIEhUTUxFbGVtZW50KS5pbm5lclRleHQ7XG4gICAgICAgICAgICBjb2xNYXBbZWwuY2xhc3NOYW1lXSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY29sTWFwO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB0aXRsZTJWYWx1ZU1hcDoge1t0aXRsZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gICAgICAgIChhd2FpdCBQcm9taXNlLmFsbCgoYXdhaXQgcm93LiQkKCc6c2NvcGUgPiB0ZCcpKS5tYXAoYXN5bmMgdGQgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXdhaXQgdGQuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5qc29uVmFsdWUoKTtcbiAgICAgICAgfSkpKS5mb3JFYWNoKCh2YWx1ZSwgaSkgPT4gdGl0bGUyVmFsdWVNYXBbY2VsbFRpdGxlc1tpKytdXSA9IHZhbHVlIGFzIHN0cmluZyk7XG5cbiAgICAgICAgLy8gbG9nLmluZm8odXRpbC5pbnNwZWN0KHRpdGxlMlZhbHVlTWFwKSk7XG4gICAgICAgIC8vIGxvZy5pbmZvKGNsc01hcCk7XG4gICAgICAgIGNvbnN0IHRyaW1lZE1hcDoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNsc01hcCkpIHtcbiAgICAgICAgICB0cmltZWRNYXBba2V5LnRyaW1MZWZ0KCkuc3BsaXQoL1tcXG5cXHJdKy8pWzBdXSA9IGNsc01hcFtrZXldLnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjcmVhdGUgSXNzdWUgb2JqZWN0XG4gICAgICAgIGNvbnN0IGlzc3VlOiBJc3N1ZSA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICB2ZXI6IFt0cmltZWRNYXAuZml4VmVyc2lvbnNdLFxuICAgICAgICAgIHN0YXR1czogdHJpbWVkTWFwLnN0YXR1cyxcbiAgICAgICAgICBhc3NpZ25lZTogdHJpbWVkTWFwLmFzc2lnbmVlLFxuICAgICAgICAgIGlkOiB0cmltZWRNYXAuaXNzdWVrZXksXG4gICAgICAgICAgZW5kRGF0ZTogdGl0bGUyVmFsdWVNYXBbJ0VuZCBkYXRlJ11cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKG9uRWFjaFBhZ2UpXG4gICAgICAgICAgdHJQYWlycy5wdXNoKFtpc3N1ZSwgcm93XSk7XG5cbiAgICAgICAgLy8gYXNzaWduIGlzc3VlIG5hbWUgYW5kIGlzc3VlIHBhcmVudCBpZFxuICAgICAgICBjb25zdCBsaW5rcyA9IGF3YWl0IHJvdy4kJCgnOnNjb3BlID4gdGQuc3VtbWFyeSBhLmlzc3VlLWxpbmsnKTtcbiAgICAgICAgaWYgKGxpbmtzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBjb25zdCBwYXJlbnRJZDogc3RyaW5nID0gYXdhaXQgKGF3YWl0IGxpbmtzWzBdLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgc3RyaW5nO1xuICAgICAgICAgIGlzc3VlLnBhcmVudElkID0gcGFyZW50SWQ7XG4gICAgICAgICAgaXNzdWUubmFtZSA9IGF3YWl0IChhd2FpdCBsaW5rc1sxXS5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykpLmpzb25WYWx1ZSgpIGFzIHN0cmluZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpc3N1ZS5uYW1lID0gYXdhaXQgKGF3YWl0IGxpbmtzWzBdLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgc3RyaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaXNzdWUudmVyID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgKGF3YWl0IHJvdy4kJCgnOnNjb3BlID4gdGQuZml4VmVyc2lvbnMgPiAqJykpXG4gICAgICAgICAgLm1hcChhc3luYyBhID0+IChhd2FpdCBhLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+KVxuICAgICAgICApO1xuXG4gICAgICAgIGlmICh0cmltZWRNYXAuYWdncmVnYXRldGltZWVzdGltYXRlKSB7XG4gICAgICAgICAgaXNzdWUuZXN0ID0gZXN0aW1hdGlvblRvTnVtKHRyaW1lZE1hcC5hZ2dyZWdhdGV0aW1lZXN0aW1hdGUudHJpbSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNzdWU7XG4gICAgICB9KVxuICAgICk7XG4gICAgaWYgKG9uRWFjaFBhZ2UpXG4gICAgICBhd2FpdCBvbkVhY2hQYWdlKHRyUGFpcnMpO1xuXG4gICAgcmV0dXJuIGRvbmU7XG4gIH1cblxuICByZXR1cm4gaXNzdWVzO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFN0b3J5KFxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICB1cmwgPSAnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz9maWx0ZXI9MTQxMTgnKSB7XG5cbiAgY29uc3QgaW5jbHVkZVByb2ogPSBhcGkuYXJndi5pbmNsdWRlID9cbiAgICBuZXcgU2V0PHN0cmluZz4oKGFwaS5hcmd2LmluY2x1ZGUgYXMgc3RyaW5nKS5zcGxpdCgnLCcpLm1hcChlbCA9PiBlbC50cmltKCkpICk6XG4gICAgICBudWxsO1xuICBpZiAoaW5jbHVkZVByb2opXG4gICAgY29uc29sZS5sb2coJ2luY2x1ZGUgcHJvamVjdCBwcmZpZXg6ICcsIGluY2x1ZGVQcm9qKTtcblxuICBjb25zdCBpbmNsdWRlVmVyID0gYXBpLmFyZ3YuaW5jbHVkZVZlcnNpb24gP1xuICAgIChhcGkuYXJndi5pbmNsdWRlVmVyc2lvbiArICcnKS5zcGxpdCgnLCcpLm1hcChlbCA9PiBlbC50cmltKCkudG9Mb2NhbGVMb3dlckNhc2UoKSkgOiBudWxsO1xuXG5cbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaChmYWxzZSk7XG4gIGNvbnN0IHBhZ2VzID0gYXdhaXQgYnJvd3Nlci5wYWdlcygpO1xuICBhd2FpdCBwYWdlc1swXS5nb3RvKHVybCwge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlMid9KTtcbiAgYXdhaXQgcGFnZXNbMF0ud2FpdEZvcignI2lzc3VldGFibGUgPiB0Ym9keScsIHt2aXNpYmxlOiB0cnVlfSk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnZmV0Y2hpbmcgcGFnZSBkb25lJyk7XG4gIGNvbnN0IHBhZ2UgPSBwYWdlc1swXTtcblxuICBsZXQgaXNzdWVzID0gYXdhaXQgZG9tVG9Jc3N1ZXMocGFnZSwgZm9yU3RvcnlzKTtcblxuICBpZiAoaW5jbHVkZVByb2opIHtcbiAgICBpc3N1ZXMgPSBpc3N1ZXMuZmlsdGVyKGlzc3VlID0+IHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGlzc3VlLmlkLnNsaWNlKDAsIGlzc3VlLmlkLmluZGV4T2YoJy0nKSk7XG4gICAgICByZXR1cm4gaW5jbHVkZVByb2ouaGFzKHByZWZpeCk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAoaW5jbHVkZVZlcikge1xuICAgIGlzc3VlcyA9IGlzc3Vlcy5maWx0ZXIoaXNzdWUgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coaXNzdWUudmVyLCBpbmNsdWRlVmVyKTtcbiAgICAgIHJldHVybiBpc3N1ZS52ZXIubWFwKHZlciA9PiB2ZXIudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgLnNvbWUodmVyc2lvbiA9PiBpbmNsdWRlVmVyLnNvbWUoaW5jbHVkZSA9PiB2ZXJzaW9uLmluZGV4T2YoaW5jbHVkZSkgPj0gMCkpO1xuICAgIH0pO1xuICB9XG5cblxuICBsb2cuaW5mbygnTnVtIG9mIHN0b3JpZXM6JywgaXNzdWVzLmxlbmd0aCk7XG5cblxuICAvLyBmb3IgKGNvbnN0IGlzc3VlIG9mIGlzc3Vlcykge1xuICBhc3luYyBmdW5jdGlvbiBmb3JTdG9yeXModHJQYWlyczogW0lzc3VlLCBwdXAuRWxlbWVudEhhbmRsZV1bXSkge1xuICAgIGZvciAoY29uc3QgW2lzc3VlLCB0cl0gb2YgdHJQYWlycykge1xuICAgICAgY29uc3QgcHJlZml4ID0gaXNzdWUuaWQuc2xpY2UoMCwgaXNzdWUuaWQuaW5kZXhPZignLScpKTtcbiAgICAgIGlmIChpbmNsdWRlUHJvaiAmJiAhaW5jbHVkZVByb2ouaGFzKHByZWZpeCkgfHxcbiAgICAgICAgaW5jbHVkZVZlciAmJiAhaXNzdWUudmVyLm1hcCh2ZXIgPT4gdmVyLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgLnNvbWUodmVyc2lvbiA9PiBpbmNsdWRlVmVyLnNvbWUoaW5jbHVkZSA9PiB2ZXJzaW9uLmluZGV4T2YoaW5jbHVkZSkgPj0gMCkpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhbmNob3JzID0gYXdhaXQgdHIuJCQoYDpzY29wZSA+IC5pc3N1ZWtleSA+IGEuaXNzdWUtbGlua1tkYXRhLWlzc3VlLWtleT0ke2lzc3VlLmlkfV1gKTtcblxuICAgICAgbGV0IGxpbmtDbGlja2VkID0gZmFsc2U7XG4gICAgICBmb3IgKGNvbnN0IGFuY2hvciBvZiBhbmNob3JzKSB7XG4gICAgICAgIGNvbnN0IGJ4ID0gYXdhaXQgYW5jaG9yLmJvdW5kaW5nQm94KCk7XG5cbiAgICAgICAgaWYgKGJ4ICYmIGJ4LmhlaWdodCA+IDEwICYmIGJ4LndpZHRoID4gMTApIHtcbiAgICAgICAgICBsb2cuaW5mbygnR28gaXNzdWUgZGV0YWlsczogJywgaXNzdWUuaWQpO1xuICAgICAgICAgIGF3YWl0IGFuY2hvci5jbGljaygpO1xuICAgICAgICAgIGF3YWl0IHBhZ2Uud2FpdEZvclNlbGVjdG9yKCcubGlzdC12aWV3Jywge2hpZGRlbjogdHJ1ZX0pO1xuICAgICAgICAgIGlzc3VlLnRhc2tzID0gYXdhaXQgbGlzdFN1YnRhc2tzKHBhZ2UsIGlzc3VlKTtcbiAgICAgICAgICBhd2FpdCBwYWdlLmdvQmFjayh7d2FpdFVudGlsOiAnbmV0d29ya2lkbGUwJ30pO1xuICAgICAgICAgIGxpbmtDbGlja2VkID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFsaW5rQ2xpY2tlZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBsaW5rIGZvciAke2lzc3VlLmlkfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGNvbnN0IGdyb3VwZWQgPSBfLmdyb3VwQnkoaXNzdWVzLCBpc3N1ZSA9PiBpc3N1ZS5pZC5zbGljZSgwLCBpc3N1ZS5pZC5pbmRleE9mKCctJykpKTtcbiAgY29uc3QgZ3JvdXBlZCA9IF8uZ3JvdXBCeShpc3N1ZXMsIGlzc3VlID0+IGlzc3VlLnZlciAmJiBpc3N1ZS52ZXIubGVuZ3RoID4gMCA/IGlzc3VlLnZlclswXSA6ICdObyB2ZXJzaW9uJyk7XG5cbiAgZnMud3JpdGVGaWxlU3luYygnZGlzdC9saXN0LXN0b3J5LnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoZ3JvdXBlZCkpO1xuICBsb2cuaW5mbygnUmVzdWx0IGhhcyBiZWVuIHdyaXR0ZW4gdG8gZGlzdC9saXN0LXN0b3J5LnlhbWwnKTtcblxuICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnSGF2ZSBhIG5pY2UgZGF5Jyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzeW5jKCkge1xuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKGZhbHNlKTtcbiAgY29uc3QgcGFnZXMgPSBhd2FpdCBicm93c2VyLnBhZ2VzKCk7XG5cbiAgY29uc3QgaXNzdWVCeVByb2o6IHtbcHJvajogc3RyaW5nXTogSXNzdWVbXX0gPSBqc1lhbWwubG9hZChmcy5yZWFkRmlsZVN5bmMoXG4gICAgYXBpLmFyZ3YuZmlsZSA/IGFwaS5hcmd2LmZpbGUgOiAnZGlzdC9saXN0LXN0b3J5LnlhbWwnLCAndXRmOCcpKTtcblxuICBmb3IgKGNvbnN0IHByb2ogb2YgT2JqZWN0LmtleXMoaXNzdWVCeVByb2opKSB7XG4gICAgY29uc3QgaXNzdWVzID0gaXNzdWVCeVByb2pbcHJval07XG4gICAgbG9nLmluZm8oaXNzdWVzLmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBpc3N1ZSBvZiBpc3N1ZXMpIHtcbiAgICAgIGlmIChpc3N1ZS50YXNrcykge1xuICAgICAgICBsb2cuaW5mbygnQ2hlY2sgaXNzdWUnLCBpc3N1ZS5pZCk7XG5cbiAgICAgICAgY29uc3QgdGFza3NXaXRob3V0SWQgPSBpc3N1ZS50YXNrc1xuICAgICAgICAuZmlsdGVyKHRhc2sgPT4gdGFzay5pZCA9PSBudWxsKTtcbiAgICAgICAgLy8gbG9nLmluZm8odGFza3NXaXRob3V0SWQpO1xuICAgICAgICBpZiAodGFza3NXaXRob3V0SWQubGVuZ3RoID4gMClcbiAgICAgICAgICBhd2FpdCBjcmVhdGVUYXNrcyhpc3N1ZSwgdGFza3NXaXRob3V0SWQsIHBhZ2VzWzBdKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRvQWRkID0gaXNzdWVbJysnXTtcbiAgICAgIGlmICh0b0FkZCkge1xuICAgICAgICBjb25zdCB0YXNrczogTmV3VGFza1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgYXNzaWduZWUgb2YgT2JqZWN0LmtleXModG9BZGQpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIHRvQWRkW2Fzc2lnbmVlXSkge1xuICAgICAgICAgICAgY29uc3QgW25hbWVdID0gbGluZS5zcGxpdCgvW1xcclxcbl0rLyk7XG4gICAgICAgICAgICBjb25zdCBkZXNjID0gbGluZTtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW06IE5ld1Rhc2sgPSB7XG4gICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgIGRlc2MsXG4gICAgICAgICAgICAgIGFzc2lnbmVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgY3JlYXRlVGFza3MoaXNzdWUsIHRhc2tzLCBwYWdlc1swXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGF3YWl0IGJyb3dzZXIuY2xvc2UoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlVGFza3MocGFyZW50SXNzdWU6IElzc3VlLCB0YXNrczogTmV3VGFza1tdLCBwYWdlOiBwdXAuUGFnZSkge1xuICBhd2FpdCBwYWdlLmdvdG8oJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2Jyb3dzZS8nICsgcGFyZW50SXNzdWUuaWQsXG4gICAge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlMid9KTtcbiAgY29uc3QgcmVtb3RlVGFza3MgPSBhd2FpdCBsaXN0U3VidGFza3MocGFnZSwgcGFyZW50SXNzdWUpO1xuICBwYXJlbnRJc3N1ZS52ZXIgPSBhd2FpdCBQcm9taXNlLmFsbCgoYXdhaXQgcGFnZS4kJCgnI2ZpeGZvci12YWwgYScpKVxuICAgIC5tYXAoYSA9PiBhLmdldFByb3BlcnR5KCdpbm5lclRleHQnKS50aGVuKGpoID0+IGpoLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPikpKTtcblxuICBjb25zdCBpc0hkZWNvciA9IHBhcmVudElzc3VlLmlkLnN0YXJ0c1dpdGgoJ0hERUNPUicpO1xuICBjb25zdCBwcmVmaXggPSBpc0hkZWNvciA/ICfoo4XotJ0tRkUtJyA6ICdGRSAtICc7XG4gIHRhc2tzLmZvckVhY2godGFzayA9PiB7XG4gICAgaWYgKCF0YXNrLm5hbWUuc3RhcnRzV2l0aChwcmVmaXgpKVxuICAgICAgdGFzay5uYW1lID0gcHJlZml4ICsgdGFzay5uYW1lO1xuICB9KTtcbiAgY29uc3QgdG9BZGQgPSBfLmRpZmZlcmVuY2VCeSh0YXNrcywgcmVtb3RlVGFza3MsIGlzc3VlID0+IGlzc3VlLm5hbWUpO1xuICBsb2cuaW5mbygnQ3JlYXRpbmcgbmV3IGlzc3VlXFxuJywgdG9BZGQpO1xuXG4gIGZvciAoY29uc3QgaXRlbSBvZiB0b0FkZCkge1xuICAgIGl0ZW0udmVyID0gcGFyZW50SXNzdWUudmVyO1xuICAgIGF3YWl0IF9hZGRTdWJUYXNrKHBhZ2UsIGl0ZW0pO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9hZGRTdWJUYXNrKHBhZ2U6IHB1cC5QYWdlLCB0YXNrOiBOZXdUYXNrKSB7XG4gIGxvZy5pbmZvKCdhZGRpbmcnLCB0YXNrKTtcbiAgYXdhaXQgY2xpY2tNb3JlQnV0dG9uKHBhZ2UsICfliJvlu7rlrZDku7vliqEnKTtcblxuICBhd2FpdCBwYWdlLndhaXRGb3IoJyNjcmVhdGUtc3VidGFzay1kaWFsb2cnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICBjb25zdCBkaWFsb2cgPSBhd2FpdCBwYWdlLiQoJyNjcmVhdGUtc3VidGFzay1kaWFsb2cnKTtcbiAgaWYgKCFkaWFsb2cpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgaXNzdWUgZGlhbG9nIG5vdCBmb3VuZCcpO1xuXG4gIGF3YWl0IGRpYWxvZy4kKCdpbnB1dFtuYW1lPXN1bW1hcnldJylcbiAgICAudGhlbihpbnB1dCA9PiBpbnB1dCEudHlwZSh0YXNrLm5hbWUpKTtcblxuICBjb25zdCBpbnB1dCA9IGF3YWl0IGRpYWxvZy4kKCcjZml4VmVyc2lvbnMtdGV4dGFyZWEnKTtcbiAgYXdhaXQgaW5wdXQhLmNsaWNrKCk7XG4gIGxvZy5pbmZvKCd2ZXJzaW9uOicsIHRhc2sudmVyIVswXSk7XG4gIGF3YWl0IGlucHV0IS50eXBlKHRhc2sudmVyIVswXSwge2RlbGF5OiAxMDB9KTtcbiAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnRW50ZXInKTtcbiAgYXdhaXQgZGlhbG9nLiQoJyNkZXNjcmlwdGlvbi13aWtpLWVkaXQnKS50aGVuKGVsID0+IGVsIS5jbGljaygpKTtcbiAgYXdhaXQgcGFnZS5rZXlib2FyZC50eXBlKHRhc2suZGVzYyA/IHRhc2suZGVzYyA6IHRhc2submFtZSk7XG5cbiAgY29uc3QgbGFiZWxzID0gYXdhaXQgZGlhbG9nLiQkKCcuZmllbGQtZ3JvdXAgPiBsYWJlbCcpO1xuXG4gIGNvbnN0IHRleHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgbGFiZWxzLm1hcChsYWJlbCA9PiBsYWJlbC5nZXRQcm9wZXJ0eSgnaW5uZXJUZXh0JykudGhlbih2ID0+IHYuanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+KSkpO1xuICBjb25zdCBsYWJlbE1hcDoge1tuYW1lOiBzdHJpbmddOiBwdXAuRWxlbWVudEhhbmRsZX0gPSB7fTtcbiAgdGV4dHMuZm9yRWFjaCgodGV4dCwgaWR4KSA9PiBsYWJlbE1hcFt0ZXh0LnNwbGl0KC9bXFxuXFxyXFx0XSsvKVswXV0gPSBsYWJlbHNbaWR4XSk7XG4gIC8vIGxvZy5pbmZvKE9iamVjdC5rZXlzKGxhYmVsTWFwKSk7XG5cbiAgY29uc3QgbWF0Y2hOYW1lID0gL1so77yIXShbMC05Ll0rW2RoREhdPylbKe+8iV1cXHMqJC8uZXhlYyh0YXNrLm5hbWUpO1xuICBsZXQgZHVyYXRpb24gPSBtYXRjaE5hbWUgPyBtYXRjaE5hbWVbMV0gOiAnMC41ZCc7XG4gIGlmICghZHVyYXRpb24uZW5kc1dpdGgoJ2QnKSAmJiAhZHVyYXRpb24uZW5kc1dpdGgoJ2gnKSkge1xuICAgIGR1cmF0aW9uID0gZHVyYXRpb24gKyAnZCc7XG4gIH1cbiAgY29uc3QgZGF0ZXMgPSBkYXRlKCk7XG4gIGNvbnN0IGZvcm1WYWx1ZXMgPSB7XG4gICAgJ1N0YXJ0IGRhdGUnOiBkYXRlc1swXSxcbiAgICAnRW5kIGRhdGUnOiBlbmREYXRlQmFzZU9uVmVyc2lvbih0YXNrLnZlciFbMF0pIHx8IGRhdGVzWzFdLFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogb2JqZWN0LWxpdGVyYWwta2V5LXF1b3Rlc1xuICAgICfliJ3lp4vpooTkvLAnOiBkdXJhdGlvbixcbiAgICDliankvZnnmoTkvLDnrpc6IGR1cmF0aW9uLFxuICAgIOe7j+WKnuS6ujogdGFzay5hc3NpZ25lZSB8fCAn5YiY5pm2J1xuICB9O1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhsYWJlbE1hcCkpIHtcbiAgICBpZiAoIV8uaGFzKGZvcm1WYWx1ZXMsIG5hbWUpKVxuICAgICAgY29udGludWU7XG4gICAgYXdhaXQgbGFiZWxNYXBbbmFtZV0uY2xpY2soe2RlbGF5OiA1MH0pO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUoZm9ybVZhbHVlc1tuYW1lXSwge2RlbGF5OiA1MH0pO1xuICAgIGlmIChuYW1lID09PSAn57uP5Yqe5Lq6Jykge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpOyAvLyB3YWl0IGZvciBKSVJBIHNlYXJjaGluZyB1c2VyXG4gICAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdFbnRlcicsIHtkZWxheTogNTB9KTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgZGlhbG9nLiQoJyNjcmVhdGUtaXNzdWUtc3VibWl0JykudGhlbihidG4gPT4gYnRuIS5jbGljaygpKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjY3JlYXRlLXN1YnRhc2stZGlhbG9nJywge2hpZGRlbjogdHJ1ZX0pO1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RTdWJ0YXNrcyhwYWdlOiBwdXAuUGFnZSwge3Zlcn06IHt2ZXI6IHN0cmluZ1tdfSkge1xuICBjb25zdCB0YXNrcyA9IGF3YWl0IHBhZ2UuJCRldmFsKCcjdmlldy1zdWJ0YXNrcyAjaXNzdWV0YWJsZSA+IHRib2R5ID4gdHInLCAoZWxzLCB2ZXIpID0+IHtcbiAgICByZXR1cm4gZWxzLm1hcChlbCA9PiB7XG4gICAgICBjb25zdCBuYW1lOiBIVE1MRWxlbWVudCB8IG51bGwgPSBlbC5xdWVyeVNlbGVjdG9yKCc6c2NvcGUgPiAuc3RzdW1tYXJ5ID4gYScpO1xuICAgICAgY29uc3Qgc3VidGFzazogSXNzdWUgPSB7XG4gICAgICAgIG5hbWU6IG5hbWUgPyBuYW1lLmlubmVyVGV4dC50cmltKCkgOiAnJyxcbiAgICAgICAgaWQ6IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1pc3N1ZWtleScpISxcbiAgICAgICAgc3RhdHVzOiAoZWwucXVlcnlTZWxlY3RvcignLnN0YXR1cycpIGFzIEhUTUxFbGVtZW50KS5pbm5lclRleHQudHJpbSgpLFxuICAgICAgICB2ZXIsXG4gICAgICAgIC8vIGFzc2lnbmVlOiAnJ1xuICAgICAgICBhc3NpZ25lZTogKGVsLnF1ZXJ5U2VsZWN0b3IoJy5hc3NpZ25lZScpIGFzIEhUTUxFbGVtZW50KS5pbm5lclRleHQudHJpbSgpXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHN1YnRhc2s7XG4gICAgfSk7XG4gIH0sIHZlcik7XG4gIHJldHVybiB0YXNrcztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RQYXJlbnQoKSB7XG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goZmFsc2UpO1xuICBjb25zdCBwYWdlID0gKGF3YWl0IGJyb3dzZXIucGFnZXMoKSlbMF07XG5cbiAgY29uc3Qgc3RvcnlNYXAgPSBuZXcgTWFwPHN0cmluZywgSXNzdWU+KCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gIGF3YWl0IHBhZ2UuZ290bygnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz9maWx0ZXI9MTQxMDknLFxuICAgIHt3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG4gIGF3YWl0IGRvbVRvSXNzdWVzKHBhZ2UsIGFzeW5jIHJvd3MgPT4ge1xuICAgIGZvciAoY29uc3QgW2lzc3VlLCB0cl0gb2Ygcm93cykge1xuICAgICAgaWYgKGlzc3VlLnBhcmVudElkKSB7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBhd2FpdCB0ci4kKCc6c2NvcGUgPiB0ZC5zdW1tYXJ5IGEuaXNzdWUtbGluaycpO1xuICAgICAgICBjb25zdCBwbmFtZSA9IGF3YWl0IHBhZ2VcbiAgICAgICAgLmV2YWx1YXRlKGVsID0+IGVsLmdldEF0dHJpYnV0ZSgndGl0bGUnKSwgbGluayk7XG4gICAgICAgIGxldCBwSXNzdWU6IElzc3VlO1xuICAgICAgICBpZiAoIXN0b3J5TWFwLmhhcyhpc3N1ZS5wYXJlbnRJZCkpIHtcbiAgICAgICAgICBwSXNzdWUgPSB7XG4gICAgICAgICAgICBicmllZjogcG5hbWUsXG4gICAgICAgICAgICBuYW1lOiBwbmFtZSxcbiAgICAgICAgICAgIGlkOiBpc3N1ZS5wYXJlbnRJZCxcbiAgICAgICAgICAgIHN0YXR1czogJycsXG4gICAgICAgICAgICBhc3NpZ25lZTogJycsXG4gICAgICAgICAgICB2ZXI6IFtdLFxuICAgICAgICAgICAgZXN0OiAwLFxuICAgICAgICAgICAgdGFza3M6IFtdXG4gICAgICAgICAgfTtcbiAgICAgICAgICBzdG9yeU1hcC5zZXQoaXNzdWUucGFyZW50SWQsIHBJc3N1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcElzc3VlID0gc3RvcnlNYXAuZ2V0KGlzc3VlLnBhcmVudElkKSE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKC9BUElcXHMq6IGU6LCDL2kudGVzdChpc3N1ZS5uYW1lKSkge1xuICAgICAgICAgIHBJc3N1ZS5pbnRFc3QgPSBpc3N1ZS5lc3Q7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcElzc3VlLmVzdCEgKz0gaXNzdWUuZXN0ITtcbiAgICAgICAgfVxuICAgICAgICBwSXNzdWUudGFza3MhLnB1c2goaXNzdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgY29uc29sZS5sb2coJ1dyaXR0ZWQgdG8gZGlzdC9wYXJlbnQtc3RvcnkueWFtbCcpO1xuICBjb25zdCBzdG9yaWVzID0gQXJyYXkuZnJvbShzdG9yeU1hcC52YWx1ZXMoKSk7XG4gIGZzLndyaXRlRmlsZVN5bmMoJ2Rpc3QvcGFyZW50LXN0b3J5LnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoc3RvcmllcykpO1xuICBjb25zb2xlLmxvZyhzdG9yaWVzLm1hcChzdG9yeSA9PiBkaXNwbGF5SXNzdWUoc3RvcnkpKS5qb2luKCdcXG4nKSk7XG4gIGJyb3dzZXIuY2xvc2UoKTtcbn1cblxuZnVuY3Rpb24gZGF0ZSgpOiBbc3RyaW5nLCBzdHJpbmddIHtcbiAgY29uc3QgdGltZSA9IG1vbWVudCgpO1xuICAvLyBjb25zb2xlLmxvZyh0aW1lLmZvcm1hdCgnRC9NTU1NL1lZJyksIHRpbWUuYWRkKDIxLCAnZGF5cycpLmZvcm1hdCgnRC9NTU1NL1lZJykpO1xuICByZXR1cm4gW3RpbWUuZm9ybWF0KCdEL01NTU0vWVknKSwgdGltZS5hZGQoMzAsICdkYXlzJykuZm9ybWF0KCdEL01NTU0vWVknKV07XG59XG5cbmZ1bmN0aW9uIGVzdGltYXRpb25Ub051bShlc3RpbWF0aW9uU3RyOiBzdHJpbmcpIHtcbiAgY29uc3QgbWF0Y2ggPSAvKFswLTkuXSspKOaXpXzlsI/ml7Z85YiGKS8uZXhlYyhlc3RpbWF0aW9uU3RyKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZGUgZXN0aW1hdGlvbiBmb3JtYXQ6ICR7ZXN0aW1hdGlvblN0cn1gKTtcbiAgfVxuICBpZiAobWF0Y2hbMl0gPT09ICflsI/ml7YnKSB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQobWF0Y2hbMV0pIC8gODtcbiAgfSBlbHNlIGlmIChtYXRjaFsyXSA9PT0gJ+WIhicpIHtcbiAgICByZXR1cm4gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKSAvIDggLyA2MDtcbiAgfVxuICByZXR1cm4gcGFyc2VGbG9hdChtYXRjaFsxXSk7XG59XG5cbmZ1bmN0aW9uIGRpc3BsYXlJc3N1ZShpc3N1ZTogSXNzdWUpOiBzdHJpbmcge1xuICByZXR1cm4gaXNzdWUuaWQgKyBgICR7aXNzdWUubmFtZX0gKCR7aXNzdWUuZXN0fSkgfCBBUEkgaW50OiR7aXNzdWUuaW50RXN0IHx8ICcwJ31gO1xufVxuXG5mdW5jdGlvbiBlbmREYXRlQmFzZU9uVmVyc2lvbih2ZXI6IHN0cmluZykge1xuICBjb25zdCB2ZXJNYXRjaCA9IC9bIC9dKFxcZHsxLDJ9KShcXGRcXGQpJC8uZXhlYyh2ZXIpO1xuICBpZiAodmVyTWF0Y2ggPT0gbnVsbCB8fCB2ZXJNYXRjaFsxXSA9PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuICBjb25zdCB0aW1lID0gbW9tZW50KCk7XG4gIHRpbWUubW9udGgocGFyc2VJbnQodmVyTWF0Y2hbMV0sIDEwKSAtIDEpO1xuICB0aW1lLmRhdGUocGFyc2VJbnQodmVyTWF0Y2hbMl0sIDEwKSk7XG4gIC8vIHRpbWUuc3VidHJhY3QoNSwgJ2RheXMnKTtcbiAgaWYgKHRpbWUuaXNCZWZvcmUobmV3IERhdGUoKSkpIHtcbiAgICB0aW1lLmFkZCgxLCAneWVhcnMnKTtcbiAgfVxuICByZXR1cm4gdGltZS5mb3JtYXQoJ0QvTU1NTS9ZWScpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVzdERhdGUoKSB7XG4gIGNvbnNvbGUubG9nKGVuZERhdGVCYXNlT25WZXJzaW9uKCdmZWFmYS85MDMnKSk7XG4gIGNvbnNvbGUubG9nKG1vbWVudCgnMTUv5Y2B5pyILzE5JywgJ0QvTU1NTS9ZWScpLnRvRGF0ZSgpKTtcbn1cblxuLyoqXG4gKiBDaGVjayBSRUFETUUubWQgZm9yIGNvbW1hbmQgbGluZSBhcmd1bWVudHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrVGFzaygpIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaChmYWxzZSk7XG4gIGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpO1xuICBjb25zdCBwYWdlcyA9IGF3YWl0IGJyb3dzZXIucGFnZXMoKTtcbiAgY29uc3QgdXJsID0gJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2lzc3Vlcy8/ZmlsdGVyPTE0MTA5JztcbiAgYXdhaXQgcGFnZXNbMV0uZ290byh1cmwsIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG5cbiAgY29uc3QgcGFyZW50U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGNvbXBhcmVUb0RhdGUgPSBtb21lbnQoKS5hZGQoYXBpLmFyZ3YuZW5kSW5EYXlzIHx8IDMsICdkYXlzJyk7XG4gIGxvZy5pbmZvKCdDb21wYXJlbnQgdG8gZW5kIGRhdGU6JywgY29tcGFyZVRvRGF0ZS5mb3JtYXQoJ1lZWVkvTS9EJykpO1xuXG4gIGF3YWl0IGRvbVRvSXNzdWVzKHBhZ2VzWzFdLCBhc3luYyByb3dzID0+IHtcbiAgICByb3dzID0gcm93cy5maWx0ZXIoKFt0YXNrXSkgPT4gdGFzay5zdGF0dXMgPT09ICflvIDmlL4nIHx8IHRhc2suc3RhdHVzID09PSAnREVWRUxPUElORycpO1xuICAgIHBhcmVudFNldC5jbGVhcigpO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICAgIGNvbnN0IFt0YXNrXSA9IHJvdztcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRhc2spO1xuICAgICAgaWYgKHRhc2sucGFyZW50SWQpIHtcbiAgICAgICAgcGFyZW50U2V0LmFkZCh0YXNrLnBhcmVudElkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYXJlbnRNYXAgPSBhd2FpdCBsaXN0SXNzdWVCeUlkcyhwYWdlc1swXSwgQXJyYXkuZnJvbShwYXJlbnRTZXQudmFsdWVzKCkpKTtcblxuICAgIGZvciAoY29uc3QgW3Rhc2ssIHRyXSBvZiByb3dzKSB7XG4gICAgICBjb25zdCBlbmREYXRlT2JqID0gbW9tZW50KHRhc2suZW5kRGF0ZSwgJ0QvTU1NTS9ZWScpO1xuICAgICAgaWYgKHRhc2suZW5kRGF0ZSAmJiBlbmREYXRlT2JqLmlzQmVmb3JlKGNvbXBhcmVUb0RhdGUpKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgICAgbG9nLndhcm4oYEVuZCBkYXRlOiR7dGFzay5lbmREYXRlfSBcIiR7ZGlzcGxheUlzc3VlKHRhc2spfVwiYCk7XG4gICAgICAgIGlmIChhcGkuYXJndi5hZGREYXlzKSB7XG4gICAgICAgICAgYXdhaXQgX2VkaXRUcihwYWdlc1sxXSwgdHIsIHtcbiAgICAgICAgICAgIGVuZERhdGU6IGVuZERhdGVPYmouYWRkKHBhcnNlSW50KGFwaS5hcmd2LmFkZERheXMsIDEwKSwgJ2RheXMnKS5mb3JtYXQoJ0QvTU1NTS9ZWScpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgcGFyZW50ID0gcGFyZW50TWFwLmdldCh0YXNrLnBhcmVudElkISk7XG4gICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIGNvbnN0IHBhcmVudEVuZERhdGVNb20gPSBtb21lbnQocGFyZW50LmVuZERhdGUsICdEL01NTU0vWVknKTtcbiAgICAgICAgY29uc3Qgbm90U2FtZVZlcnNpb24gPSB0YXNrLnZlclswXSAhPT0gcGFyZW50IS52ZXJbMF07XG4gICAgICAgIGNvbnN0IGVhcmxpZXJFbmREYXRlID0gZW5kRGF0ZU9iai5pc0JlZm9yZShwYXJlbnRFbmREYXRlTW9tKTtcbiAgICAgICAgY29uc3QgdmVyRGF0ZSA9IGVuZERhdGVCYXNlT25WZXJzaW9uKHBhcmVudC52ZXJbMF0pO1xuXG4gICAgICAgIGNvbnN0IHVwZGF0ZVRvVGFzazogUGFyYW1ldGVyczx0eXBlb2YgX2VkaXRUcj5bMl0gPSB7fTtcbiAgICAgICAgbGV0IG5lZWRVcGRhdGUgPSBmYWxzZTtcblxuICAgICAgICBpZiAobm90U2FtZVZlcnNpb24pIHtcbiAgICAgICAgICBuZWVkVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgICAgICAgIGxvZy53YXJuKGBUYXNrIFwiJHtkaXNwbGF5SXNzdWUodGFzayl9XCJcXG4gIHZlcnNpb24gXCIke3Rhc2sudmVyWzBdfVwiIGRvZXNuJ3QgbWF0Y2ggcGFyZW50IFwiJHtwYXJlbnQudmVyWzBdfVwiXFxuYCk7XG4gICAgICAgICAgdXBkYXRlVG9UYXNrLnZlciA9IHBhcmVudC52ZXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZlckRhdGUgJiYgdGFzay5lbmREYXRlICE9PSB2ZXJEYXRlKSB7XG4gICAgICAgICAgbmVlZFVwZGF0ZSA9IHRydWU7XG4gICAgICAgICAgdXBkYXRlVG9UYXNrLmVuZERhdGUgPSB2ZXJEYXRlO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgbG9nLndhcm4oYFRhc2sgXCIke2Rpc3BsYXlJc3N1ZSh0YXNrKX1cIlxcbiAgZW5kIGRhdGUgXCIke3Rhc2suZW5kRGF0ZX1cIiBkb2Vzbid0IG1hdGNoIHBhcmVudCB2ZXJzaW9uICR7cGFyZW50LnZlclswXX0gLSAke3ZlckRhdGV9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWFybGllckVuZERhdGUpIHtcbiAgICAgICAgICBuZWVkVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICB1cGRhdGVUb1Rhc2suZW5kRGF0ZSA9IHBhcmVudC5lbmREYXRlO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgbG9nLndhcm4oYFRhc2sgXCIke2Rpc3BsYXlJc3N1ZSh0YXNrKX1cIlxcbiAgZW5kIGRhdGUgXCIke3Rhc2suZW5kRGF0ZX1cIiBpcyBlYXJsaWVyIHRoYW4gcGFyZW50IFwiJHtwYXJlbnQuZW5kRGF0ZX1cImApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5lZWRVcGRhdGUgJiYgYXBpLmFyZ3YudXBkYXRlVmVyc2lvbikge1xuICAgICAgICAgIGF3YWl0IF9lZGl0VHIocGFnZXNbMV0sIHRyLCB1cGRhdGVUb1Rhc2spO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfZWRpdFRyKHBhZ2U6IHB1cC5QYWdlLCB0cjogcHVwLkVsZW1lbnRIYW5kbGUsIHVwZGF0ZVRhc2s6IHtba2V5IGluIGtleW9mIElzc3VlXT86IElzc3VlW2tleV19KSB7XG4gIGF3YWl0IChhd2FpdCB0ci4kJCgnOnNjb3BlID4gLnN1bW1hcnkgLmlzc3VlLWxpbmsnKSlbMV0uY2xpY2soKTtcbiAgYXdhaXQgZWRpdElzc3VlKHBhZ2UsIHVwZGF0ZVRhc2spO1xuICBhd2FpdCBwYWdlLmdvQmFjaygpO1xuICBhd2FpdCBwYWdlLndhaXRGb3IoODAwKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZWRpdElzc3VlKHBhZ2U6IHB1cC5QYWdlLCB0YXNrOiBQYXJ0aWFsPElzc3VlPikge1xuICBjb25zdCBlZGl0QnV0dG9uID0gYXdhaXQgcGFnZS53YWl0Rm9yU2VsZWN0b3IoJyNlZGl0LWlzc3VlJywge3Zpc2libGU6IHRydWV9KTtcbiAgYXdhaXQgZWRpdEJ1dHRvbi5jbGljaygpO1xuICBjb25zdCBkaWFsb2cgPSBhd2FpdCBwYWdlLndhaXRGb3JTZWxlY3RvcignI2VkaXQtaXNzdWUtZGlhbG9nJywge3Zpc2libGU6IHRydWV9KTtcblxuICBpZiAodGFzay5uYW1lKSB7XG4gICAgY29uc29sZS5sb2coJ2NoYW5nZSBuYW1lIHRvICcsIHRhc2submFtZSk7XG4gICAgYXdhaXQgZGlhbG9nLiQoJ2lucHV0W25hbWU9c3VtbWFyeV0nKVxuICAgICAgLnRoZW4oaW5wdXQgPT4gaW5wdXQhLnR5cGUodGFzay5uYW1lISkpO1xuICB9XG5cbiAgaWYgKHRhc2sudmVyICYmIHRhc2sudmVyLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLmxvZygnICBjaGFuZ2UgdmVyc2lvbiB0byAnLCB0YXNrLnZlclswXSk7XG4gICAgY29uc3QgaW5wdXQgPSBhd2FpdCBkaWFsb2cuJCgnI2ZpeFZlcnNpb25zLXRleHRhcmVhJyk7XG4gICAgYXdhaXQgaW5wdXQhLmNsaWNrKCk7XG4gICAgZm9yIChsZXQgaT0wOyBpPDU7IGkrKylcbiAgICAgIGF3YWl0IGlucHV0IS5wcmVzcygnQmFja3NwYWNlJywge2RlbGF5OiAxNTB9KTtcbiAgICAvLyBhd2FpdCBwYWdlLndhaXRGb3IoMTAwMCk7XG4gICAgYXdhaXQgaW5wdXQhLnR5cGUodGFzay52ZXJbMF0sIHtkZWxheTogMTAwfSk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnRW50ZXInKTtcbiAgfVxuXG4gIGlmICh0YXNrLmRlc2MgIT0gbnVsbCkge1xuICAgIGNvbnNvbGUubG9nKCcgIGNoYW5nZSBkZXNjcmlwdGlvbiB0bycsIHRhc2suZGVzYyk7XG4gICAgYXdhaXQgZGlhbG9nLiQoJyNkZXNjcmlwdGlvbi13aWtpLWVkaXQnKS50aGVuKGVsID0+IGVsIS5jbGljaygpKTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUodGFzay5kZXNjID8gdGFzay5kZXNjIDogdGFzay5uYW1lISk7XG4gIH1cblxuICBjb25zdCBsYWJlbHMgPSBhd2FpdCBkaWFsb2cuJCQoJy5maWVsZC1ncm91cCA+IGxhYmVsJyk7XG5cbiAgY29uc3QgdGV4dHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBsYWJlbHMubWFwKGxhYmVsID0+IGxhYmVsLmdldFByb3BlcnR5KCdpbm5lclRleHQnKS50aGVuKHYgPT4gdi5qc29uVmFsdWUoKSBhcyBQcm9taXNlPHN0cmluZz4pKSk7XG4gIGNvbnN0IGxhYmVsTWFwOiB7W25hbWU6IHN0cmluZ106IHB1cC5FbGVtZW50SGFuZGxlfSA9IHt9O1xuICB0ZXh0cy5mb3JFYWNoKCh0ZXh0LCBpZHgpID0+IGxhYmVsTWFwW3RleHQuc3BsaXQoL1tcXG5cXHJcXHRdKy8pWzBdXSA9IGxhYmVsc1tpZHhdKTtcblxuICBjb25zdCBkYXRlcyA9IGRhdGUoKTtcbiAgY29uc3QgZm9ybVZhbHVlcyA9IHt9O1xuXG4gIGlmICh0YXNrLnZlciAmJiB0YXNrLnZlci5sZW5ndGggPiAwKVxuICAgIGZvcm1WYWx1ZXNbJ0VuZCBkYXRlJ10gPSBlbmREYXRlQmFzZU9uVmVyc2lvbih0YXNrLnZlciFbMF0pIHx8IGRhdGVzWzFdO1xuXG4gIGlmICh0YXNrLmVuZERhdGUpXG4gICAgZm9ybVZhbHVlc1snRW5kIGRhdGUnXSA9IHRhc2suZW5kRGF0ZTtcblxuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMobGFiZWxNYXApKSB7XG4gICAgaWYgKCFfLmhhcyhmb3JtVmFsdWVzLCBuYW1lKSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGF3YWl0IGxhYmVsTWFwW25hbWVdLmNsaWNrKHtkZWxheTogNTB9KTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7XG4gICAgY29uc3QgaW5wdXRJZCA9ICcjJyArIGF3YWl0IHBhZ2UuZXZhbHVhdGUobGFiZWwgPT4gbGFiZWwuZ2V0QXR0cmlidXRlKCdmb3InKSwgbGFiZWxNYXBbbmFtZV0pO1xuICAgIC8vIGNvbnNvbGUubG9nKGlucHV0SWQpO1xuICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcGFnZS4kZXZhbChpbnB1dElkLCBpbnB1dCA9PiAoaW5wdXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUpO1xuXG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aCArIDI7IGkgPCBsOyBpKyspXG4gICAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0Fycm93UmlnaHQnLCB7ZGVsYXk6IDUwfSk7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aCArIDU7IGkgPCBsOyBpKyspXG4gICAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0JhY2tzcGFjZScsIHtkZWxheTogNTB9KTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJyVzOiAlcyAtPiAlcycsIG5hbWUsIHZhbHVlLCBmb3JtVmFsdWVzW25hbWVdKTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnR5cGUoZm9ybVZhbHVlc1tuYW1lXSwge2RlbGF5OiA1MH0pO1xuICAgIC8vIGlmIChuYW1lID09PSAn57uP5Yqe5Lq6Jykge1xuICAgIC8vICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpOyAvLyB3YWl0IGZvciBKSVJBIHNlYXJjaGluZyB1c2VyXG4gICAgLy8gICBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdFbnRlcicsIHtkZWxheTogNTB9KTtcbiAgICAvLyB9XG4gIH1cbiAgYXdhaXQgKGF3YWl0IGRpYWxvZy4kKCcjZWRpdC1pc3N1ZS1zdWJtaXQnKSkhLmNsaWNrKCk7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvcignI2VkaXQtaXNzdWUtZGlhbG9nJywge2hpZGRlbjogdHJ1ZX0pO1xuICBhd2FpdCBwYWdlLndhaXRGb3IoMTAwMCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldENlbGxUaXRsZXMoaXNzdWVUYWJsZTogcHVwLkVsZW1lbnRIYW5kbGU8RWxlbWVudD4gfCBudWxsKSB7XG4gIGlmIChpc3N1ZVRhYmxlID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuICBjb25zdCB0aHMgPSBhd2FpdCBpc3N1ZVRhYmxlLiQkKCc6c2NvcGUgPiB0aGVhZCB0aCcpO1xuXG4gIGNvbnN0IHRpdGxlcyA9IGF3YWl0IFByb21pc2UuYWxsKHRocy5tYXAoYXN5bmMgdGggPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IGF3YWl0IHRoLiQoJzpzY29wZSA+IHNwYW5bdGl0bGVdJyk7XG4gICAgaWYgKGhlYWRlcikge1xuICAgICAgcmV0dXJuIChhd2FpdCBoZWFkZXIuZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5qc29uVmFsdWUoKSBhcyBQcm9taXNlPHN0cmluZz47XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAoYXdhaXQgdGguZ2V0UHJvcGVydHkoJ2lubmVyVGV4dCcpKS5qc29uVmFsdWUoKSBhcyBQcm9taXNlPHN0cmluZz47XG4gICAgfVxuICB9KSk7XG5cbiAgcmV0dXJuIHRpdGxlcy5tYXAodGl0bGUgPT4gdGl0bGUudHJpbSgpKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbGlzdElzc3VlQnlJZHMocGFnZTogcHVwLlBhZ2UsIGlkczogc3RyaW5nW10pIHtcbiAgY29uc3QganFsID0gJ2pxbD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGBpZCBpbiAoJHtpZHMuam9pbignLCcpfSlgKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9pc3N1ZXMvPycgKyBqcWwpO1xuICBjb25zdCBpc3N1ZU1hcCA9IChhd2FpdCBkb21Ub0lzc3VlcyhwYWdlKSkucmVkdWNlKChtYXAsIGlzc3VlKSA9PiB7XG4gICAgbWFwLnNldChpc3N1ZS5pZCwgaXNzdWUpO1xuICAgIHJldHVybiBtYXA7XG4gIH0sIG5ldyBNYXA8c3RyaW5nLCBJc3N1ZT4oKSk7XG4gIHJldHVybiBpc3N1ZU1hcDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1vdmVJc3N1ZXMobmV3UGFyZW50SWQ6IHN0cmluZywgLi4ubW92ZWRJc3N1ZUlkczogc3RyaW5nW10pIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaCgpO1xuICBjb25zdCBwYWdlID0gKGF3YWl0IGJyb3dzZXIucGFnZXMoKSlbMF07XG5cbiAgY29uc3QgcGFyZW50SXNzdWVNYXAgPSBhd2FpdCBsaXN0SXNzdWVCeUlkcyhwYWdlLCBbbmV3UGFyZW50SWRdKTtcbiAgY29uc3QgcGFyZW50SXNzdWUgPSBwYXJlbnRJc3N1ZU1hcC52YWx1ZXMoKS5uZXh0KCkudmFsdWUgYXMgSXNzdWU7XG5cbiAgY29uc29sZS5sb2cocGFyZW50SXNzdWUpO1xuXG4gIGZvciAoY29uc3QgaWQgb2YgbW92ZWRJc3N1ZUlkcykge1xuICAgIGNvbnN0IHVybCA9ICdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9icm93c2UvJyArIGlkO1xuICAgIGF3YWl0IHBhZ2UuZ290byh1cmwsIHt0aW1lb3V0OiAwLCB3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG5cbiAgICBhd2FpdCBwYWdlLndhaXRGb3IoJyNwYXJlbnRfaXNzdWVfc3VtbWFyeScsIHt2aXNpYmxlOiB0cnVlfSk7XG4gICAgY29uc3Qgb3JpZ1BhcmVudElkID0gYXdhaXQgcGFnZS4kZXZhbCgnI3BhcmVudF9pc3N1ZV9zdW1tYXJ5JywgZWwgPT4gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLWlzc3VlLWtleScpKTtcbiAgICBpZiAob3JpZ1BhcmVudElkICE9PSBwYXJlbnRJc3N1ZS5pZCkge1xuXG4gICAgICBhd2FpdCBjbGlja01vcmVCdXR0b24ocGFnZSwgJ+enu+WKqCcpO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xuICAgICAgLy8gY29uc3QgZWwgPSBhd2FpdCBwYWdlLiQoJ2h0bWwnKTtcbiAgICAgIC8vIGNvbnN0IGh0bWwgPSAoYXdhaXQgZWwhLiRldmFsKCc6c2NvcGUgPiBib2R5JywgZWwgPT4gZWwuaW5uZXJIVE1MKSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhodG1sKTtcblxuICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjbW92ZVxcXFwuc3VidGFza1xcXFwucGFyZW50XFxcXC5vcGVyYXRpb25cXFxcLm5hbWVfaWQnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICAgICAgYXdhaXQgcGFnZS5jbGljaygnI21vdmVcXFxcLnN1YnRhc2tcXFxcLnBhcmVudFxcXFwub3BlcmF0aW9uXFxcXC5uYW1lX2lkJywge2RlbGF5OiAyMDB9KTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKTtcbiAgICAgIGF3YWl0IHBhZ2UuY2xpY2soJyNuZXh0X3N1Ym1pdCcsIHtkZWxheTogMjAwfSk7XG4gICAgICBhd2FpdCBwYWdlLndhaXRGb3IoJ2lucHV0W25hbWU9cGFyZW50SXNzdWVdJywge3Zpc2libGU6IHRydWV9KTtcbiAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgcGFnZS4kKCdpbnB1dFtuYW1lPXBhcmVudElzc3VlXScpO1xuICAgICAgYXdhaXQgaW5wdXQhLmNsaWNrKCk7XG4gICAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnNlbmRDaGFyYWN0ZXIobmV3UGFyZW50SWQpO1xuICAgICAgYXdhaXQgcGFnZS5jbGljaygnI3JlcGFyZW50X3N1Ym1pdCcsIHtkZWxheTogMjAwfSk7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBpZiAocGFnZS51cmwoKS5zdGFydHNXaXRoKHVybCkpXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nKGAke2lkfSBpcyBtb3ZlZCB0byAke25ld1BhcmVudElkfWApO1xuICAgIH1cbiAgICBhd2FpdCBlZGl0SXNzdWUocGFnZSwge2VuZERhdGU6IHBhcmVudElzc3VlLmVuZERhdGUsIHZlcjogcGFyZW50SXNzdWUudmVyfSk7XG4gICAgY29uc29sZS5sb2coYCR7aWR9IGlzIHVwZGF0ZWRgKTtcbiAgfVxuICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhc3NpZ25Jc3N1ZXMoYXNzaWduZWU6IHN0cmluZywgLi4uaXNzdWVJZHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goKTtcbiAgY29uc3QgcGFnZSA9IChhd2FpdCBicm93c2VyLnBhZ2VzKCkpWzBdO1xuICBjb25zdCBqcWwgPSAnanFsPScgKyBlbmNvZGVVUklDb21wb25lbnQoYGlkIGluICgke2lzc3VlSWRzLmpvaW4oJywnKX0pYCk7XG4gIGF3YWl0IHBhZ2UuZ290bygnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz8nICsganFsKTtcbiAgYXdhaXQgZG9tVG9Jc3N1ZXMocGFnZSwgYXN5bmMgcGFpcnMgPT4ge1xuICAgIGZvciAoY29uc3QgW2lzc3VlLCBlbF0gb2YgcGFpcnMpIHtcbiAgICAgIGlmIChpc3N1ZS5hc3NpZ25lZSA9PT0gYXNzaWduZWUpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbGlua3MgPSBhd2FpdCBlbC4kJCgnOnNjb3BlID4gdGQgPiAuaXNzdWUtbGluaycpO1xuICAgICAgaWYgKGxpbmtzICYmIGxpbmtzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgbGluayA9IGxpbmtzW2xpbmtzLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGF3YWl0IGxpbmsuY2xpY2soe2RlbGF5OiAzMDB9KTtcbiAgICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjYXNzaWduLWlzc3VlJywge3Zpc2libGU6IHRydWV9KTtcbiAgICAgICAgYXdhaXQgcGFnZS5jbGljaygnI2Fzc2lnbi1pc3N1ZScsIHtkZWxheTogMzAwfSk7XG4gICAgICAgIGF3YWl0IHBhZ2Uud2FpdEZvcignI2Fzc2lnbi1kaWFsb2cnLCB7dmlzaWJsZTogdHJ1ZX0pO1xuICAgICAgICBjb25zdCBpbnB1dCA9IGF3YWl0IHBhZ2UuJCgnI2Fzc2lnbmVlLWZpZWxkJyk7XG4gICAgICAgIGF3YWl0IGVkaXRJbnB1dFRleHQocGFnZSwgaW5wdXQsIGFzc2lnbmVlKTtcbiAgICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yKCdib2R5ID4gLmFqcy1sYXllcicsIHt2aXNpYmxlOiB0cnVlfSk7XG4gICAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0VudGVyJywge2RlbGF5OiAxMDB9KTtcbiAgICAgICAgYXdhaXQgcGFnZS5jbGljaygnI2Fzc2lnbi1pc3N1ZS1zdWJtaXQnLCB7ZGVsYXk6IDEwMH0pO1xuICAgICAgICBhd2FpdCBwYWdlLndhaXRGb3IoJyNhc3NpZ24tZGlhbG9nJywge2hpZGRlbjogdHJ1ZX0pO1xuICAgICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4gICAgICAgIGF3YWl0IHBhZ2UuZ29CYWNrKHt3YWl0VW50aWw6ICduZXR3b3JraWRsZTAnfSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuXG4gIGF3YWl0IGJyb3dzZXIuY2xvc2UoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2xpY2tNb3JlQnV0dG9uKHBhZ2U6IHB1cC5QYWdlLCBidXR0b246IHN0cmluZykge1xuICBjb25zdCBtb3JlQnRuID0gYXdhaXQgcGFnZS4kKCcjb3BzYmFyLW9wZXJhdGlvbnNfbW9yZScpO1xuICBpZiAobW9yZUJ0biA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignI29wc2Jhci1vcGVyYXRpb25zX21vcmUgbm90IGZvdW5kIGluIHBhZ2UnKTsgLy8gY2xpY2sg5pu05aSaXG5cbiAgYXdhaXQgbW9yZUJ0biEuY2xpY2soe2RlbGF5OiAxMDB9KTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yKCcjb3BzYmFyLW9wZXJhdGlvbnNfbW9yZV9kcm9wJywge3Zpc2libGU6IHRydWV9KTtcblxuICBjb25zdCBtZW51SXRlbXMgPSBhd2FpdCBwYWdlLiQkKCcjb3BzYmFyLW9wZXJhdGlvbnNfbW9yZV9kcm9wIC50cmlnZ2VyLWxhYmVsJyk7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBtZW51SXRlbXMpIHtcbiAgICBjb25zdCB0ZXh0OiBzdHJpbmcgPSBhd2FpdCBpdGVtLmdldFByb3BlcnR5KCdpbm5lckhUTUwnKS50aGVuKGpoID0+IGpoLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8c3RyaW5nPik7XG4gICAgaWYgKHRleHQgPT09IGJ1dHRvbikge1xuICAgICAgYXdhaXQgaXRlbS5jbGljaygpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG5cbnR5cGUgRXh0cmFjdFByb21pc2U8Vj4gPSBWIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBFPiA/IEUgOiB1bmtub3duO1xuXG5hc3luYyBmdW5jdGlvbiBlZGl0SW5wdXRUZXh0KHBhZ2U6IHB1cC5QYWdlLCBpbnB1dEVsOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHB1cC5QYWdlWyckJ10+PiwgbmV3VmFsdWU6IHN0cmluZykge1xuICBpZiAoaW5wdXRFbCA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgdmFsdWUgPSBhd2FpdCBpbnB1dEVsLmV2YWx1YXRlKChpbnB1dDogSFRNTElucHV0RWxlbWVudCkgPT4gaW5wdXQudmFsdWUpO1xuICBhd2FpdCBpbnB1dEVsLmNsaWNrKHtkZWxheTogMzAwfSk7XG4gIGlmICh2YWx1ZSkge1xuICAgIGZvciAobGV0IGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoICsgMjsgaSA8IGw7IGkrKylcbiAgICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0Fycm93UmlnaHQnLCB7ZGVsYXk6IDUwfSk7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGggKyAzOyBpIDwgbDsgaSsrKVxuICAgICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnQmFja3NwYWNlJywge2RlbGF5OiA1MH0pO1xuICB9XG5cbiAgYXdhaXQgcGFnZS5rZXlib2FyZC50eXBlKG5ld1ZhbHVlLCB7ZGVsYXk6IDUwfSk7XG59XG5cbiJdfQ==
