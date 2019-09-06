// tslint:disable no-console
import fs from 'fs';
import {launch} from './puppeteer';
import * as jsYaml from 'js-yaml';
import _ from 'lodash';
import pup from 'puppeteer-core';
import moment from 'moment';
import api from '__api';
moment.locale('zh-cn');
const log = require('log4js').getLogger('jira-helper');

export interface Issue {
  name: string;
  id: string;
  status: string;
  desc?: string;
  ver: string[];
  assignee: string;
  tasks?: Issue[];
  parentId?: string;
  est?: string; // estimation duration
}

export async function login() {
  const browser = await launch(false);
  const pages = await browser.pages();
  await pages[0].goto('https://issue.bkjk-inc.com',
    {timeout: 0, waitUntil: 'domcontentloaded'});
}

// export await function waitForCondition()

export async function domToIssues(page: pup.Page,
  onEachPage?: (trPairs: [Issue, pup.ElementHandle][]) => Promise<void>
) {
  let issues: Issue[] = [];
  let pageIdx = 1;
  while (true) {
    log.info('Page %s: %s', ++pageIdx, page.url());
    const currPageIssues = await fetchPage();
    issues = issues.concat(currPageIssues);
    const nextPageLink = await page.$('.pagination > a.nav-next');
    if (nextPageLink == null)
      break;
    await nextPageLink.click();
    // check first cell, wait for its DOM mutation

    const lastFirstRowId = currPageIssues[0].id;

    await page.waitForFunction((originIssueId) => {
      const td: HTMLElement | null = document.querySelector('#issuetable > tbody > tr > td');
      return td && td.innerText.length > 0 && td.innerText.trim() !== originIssueId;
    }, {polling: 'mutation'}, lastFirstRowId);
    await page.waitFor(500);
  }

  async function fetchPage() {
    const trPairs: [Issue, pup.ElementHandle][] = [];
    const done = await Promise.all(
      (await page.$$('#issuetable > tbody > tr')).map(async row => {
        const clsMap = await row.$$eval(':scope > td', els => {
          const colMap: {[k: string]: string} = {};
          els.forEach(el => {
            colMap[el.className] = (el as HTMLElement).innerText;
          });
          return colMap;
        });

        // log.info(clsMap);
        const trimedMap: {[k: string]: string} = {};
        for (const key of Object.keys(clsMap)) {
          trimedMap[key.trimLeft().split(/[\n\r]+/)[0]] = clsMap[key].trim();
        }
        // create Issue object
        const issue: Issue = {
          name: '',
          ver: [trimedMap.fixVersions],
          status: trimedMap.status,
          assignee: trimedMap.assignee,
          id: trimedMap.issuekey
        };
        if (onEachPage)
          trPairs.push([issue, row]);

        // assign issue name and issue parent id
        const links = await row.$$(':scope > td.summary a.issue-link');
        if (links.length > 1) {
          const parentId: string = await (await links[0].getProperty('innerText')).jsonValue();
          issue.parentId = parentId;
          issue.name = await (await links[1].getProperty('innerText')).jsonValue();
        } else {
          issue.name = await (await links[0].getProperty('innerText')).jsonValue();
        }

        issue.ver = await Promise.all(
          (await row.$$(':scope > td.fixVersions > *'))
          .map(async a => (await a.getProperty('innerText')).jsonValue())
        );

        if (trimedMap.aggregatetimeestimate) {
          issue.est = trimedMap.aggregatetimeestimate.trim();
        }
        return issue;
      })
    );
    if (onEachPage)
      await onEachPage(trPairs);

    return done;
  }

  return issues;
}

export async function listStory(
  // tslint:disable-next-line: max-line-length
  url = 'https://issue.bkjk-inc.com/issues/?filter=14118') {

  const includeProj = api.argv.include ?
    new Set<string>((api.argv.include as string).split(',').map(el => el.trim()) ):
      null;
  if (includeProj)
    console.log('include project prfiex: ', includeProj);

  const includeVer = api.argv.includeVersion ?
    (api.argv.includeVersion as string).split(',').map(el => el.trim()) : null;


  const browser = await launch(false);
  const pages = await browser.pages();
  await pages[0].goto(url, {timeout: 0, waitUntil: 'networkidle2'});
  await pages[0].waitFor('#issuetable > tbody', {visible: true});
  // tslint:disable-next-line: no-console
  log.info('fetching page done');
  const page = pages[0];

  let issues = await domToIssues(page, forStorys);

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
  async function forStorys(trPairs: [Issue, pup.ElementHandle][]) {
    for (const [issue, tr] of trPairs) {
      const prefix = issue.id.slice(0, issue.id.indexOf('-'));
      if (includeProj && !includeProj.has(prefix) ||
        includeVer && !issue.ver.map(ver => ver.toLowerCase())
          .some(version => includeVer.some(include => version.indexOf(include) >= 0))) {
        continue;
      }

      const anchors = await tr.$$(`:scope > .issuekey > a.issue-link[data-issue-key=${issue.id}]`);

      let linkClicked = false;
      for (const anchor of anchors) {
        const bx = await anchor.boundingBox();

        if (bx && bx.height > 10 && bx.width > 10) {
          log.info('Go issue details: ', issue.id);
          await anchor.click();
          await page.waitFor(300); // TODO
          issue.tasks = await listSubtasks(page, issue);
          await page.goBack({waitUntil: 'networkidle0'});
          linkClicked = true;
          break;
        }
      }
      if (!linkClicked) {
        throw new Error(`Can not find link for ${issue.id}`);
      }
    }
  }

  const grouped = _.groupBy(issues, issue => issue.id.slice(0, issue.id.indexOf('-')));

  fs.writeFileSync('dist/list-story.yaml', jsYaml.safeDump(grouped));
  log.info('Result has been written to dist/list-story.yaml');

  await browser.close();
  // tslint:disable-next-line: no-console
  console.log('Have a nice day');
}

export async function sync() {
  const browser = await launch(false);
  const pages = await browser.pages();

  const issueByProj: {[proj: string]: Issue[]} = jsYaml.load(fs.readFileSync(
    api.argv.file ? api.argv.file : 'dist/list-story.yaml', 'utf8'));

  for (const proj of Object.keys(issueByProj)) {
    const issues = issueByProj[proj];
    log.info(issues.length);
    for (const issue of issues) {
      if (!issue.tasks)
        continue;
      log.info('Check issue', issue.id);

      const tasksWithoutId = issue.tasks
      .filter(task => task.id == null)
      .map(task => {
        if (!task.name.startsWith('FE -'))
          task.name = 'FE - ' + task.name;
        return task;
      });
      // log.info(tasksWithoutId);
      if (tasksWithoutId.length === 0)
        continue;
      await pages[0].goto('https://issue.bkjk-inc.com/browse/' + issue.id, {timeout: 0, waitUntil: 'networkidle2'});
      const remoteTasks = await listSubtasks(pages[0], issue);
      issue.ver = await Promise.all((await pages[0].$$('#fixfor-val a'))
        .map(a => a.getProperty('innerText').then(jh => jh.jsonValue())));

      const toAdd = _.differenceBy(tasksWithoutId, remoteTasks, issue => issue.name);
      // log.info('Creating new issue\n', toAdd);
      for (const item of toAdd) {
        item.ver = issue.ver;
        await addSubTask(pages[0], item);
      }
    }
  }
  browser.close();
}

async function addSubTask(page: pup.Page, task: Issue) {
  log.info('adding', task);
  const moreBtn = await page.$('#opsbar-operations_more');
  if (moreBtn == null)
    throw new Error('#opsbar-operations_more not found in page'); // click 更多
  // log.warn(await moreBtn.getProperty('innerText').then(jh => jh.jsonValue()));

  await moreBtn!.click({delay: 100});
  await page.waitFor('#opsbar-operations_more_drop', {visible: true});

  const menuItems = await page.$$('#opsbar-operations_more_drop .trigger-label');
  for (const item of menuItems) {
    const text: string = await item.getProperty('innerHTML').then(jh => jh.jsonValue());
    if (text === '创建子任务') {
      await item.click();
      break;
    }
  }

  await page.waitFor('#create-subtask-dialog', {visible: true});
  const dialog = await page.$('#create-subtask-dialog');
  if (!dialog)
    throw new Error('Adding issue dialog not found');

  await dialog.$('input[name=summary]')
    .then(input => input!.type(task.name.startsWith('FE ') ? task.name : 'FE - ' + task.name));

  const input = await dialog.$('#fixVersions-textarea');
  await input!.click();
  log.info('version:', task.ver[0]);
  await input!.type(task.ver[0], {delay: 100});
  await page.keyboard.press('Enter');
  await dialog.$('#description-wiki-edit').then(el => el!.click());
  await page.keyboard.type(task.desc ? task.desc : task.name);

  const labels = await dialog.$$('.field-group > label');

  const texts = await Promise.all(
    labels.map(label => label.getProperty('innerText').then(v => v.jsonValue() as Promise<string>)));
  const labelMap: {[name: string]: pup.ElementHandle} = {};
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
    'End date': dates[1],
    // tslint:disable-next-line: object-literal-key-quotes
    '初始预估': duration,
    剩余的估算: duration,
    经办人: task.assignee || '刘晶'
  };

  for (const name of Object.keys(labelMap)) {
    if (!_.has(formValues, name))
      continue;
    await labelMap[name].click({delay: 50});
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.keyboard.type(formValues[name], {delay: 50});
    if (name === '经办人') {
      await new Promise(resolve => setTimeout(resolve, 500)); // wait for JIRA searching user
      await page.keyboard.press('Enter', {delay: 50});
    }
  }
  await dialog.$('#create-issue-submit').then(btn => btn!.click());
  await page.waitFor('#create-subtask-dialog', {hidden: true});

  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function listSubtasks(page: pup.Page, {ver}: {ver: string[]}) {
  const tasks = await page.$$eval('#view-subtasks #issuetable > tbody > tr', (els, ver) => {
    return els.map(el => {
      const name: HTMLElement | null = el.querySelector(':scope > .stsummary > a');
      const subtask: Issue = {
        name: name ? name.innerText.trim() : '',
        id: el.getAttribute('data-issuekey')!,
        status: (el.querySelector('.status') as HTMLElement).innerText.trim(),
        ver,
        // assignee: ''
        assignee: (el.querySelector('.assignee') as HTMLElement).innerText.trim()
      };
      return subtask;
    });
  }, ver);
  return tasks;
}

export async function listParent() {
  const browser = await launch(false);
  const page = (await browser.pages())[0];

  // const topLevelIssue: Issue[] = [];
  // tslint:disable-next-line: max-line-length
  await page.goto('https://issue.bkjk-inc.com/issues/?filter=14179&jql=project%20in%20(BYJ%2C%20ZLSZB%2C%20HDECOR%2C%20BCL%2C%20ZLZB%2C%20MF)%20AND%20issuetype%20in%20(subTaskIssueTypes()%2C%20%E4%BB%BB%E5%8A%A1%2C%20%E6%95%85%E4%BA%8B%2C%20%E6%95%85%E9%9A%9C%2C%20%E6%B5%8B%E8%AF%95%E6%95%85%E9%9A%9C%2C%20%E7%94%9F%E4%BA%A7%E6%95%85%E9%9A%9C%2C%20%E8%81%94%E8%B0%83%E6%95%85%E9%9A%9C)%20AND%20status%20in%20(Open%2C%20Reopen%2C%20Developing%2C%20Testing)%20AND%20fixVersion%20in%20(EMPTY%2C%20%22%E8%B4%9D%E5%88%86%E6%9C%9FV1.1.0%2F924%22%2C%20%22%E8%B4%9D%E7%94%A8%E9%87%91v1.10%2F924%22)%20AND%20assignee%20in%20(haiz.chen001%2C%20xiang.zhang%2C%20xue.zou001%2C%20li1.yu)%20ORDER%20BY%20fixVersion%20ASC%2C%20assignee%20ASC%2C%20status%20ASC%2C%20key%20DESC%2C%20updated%20DESC',
    {waitUntil: 'networkidle2'});
  const issues = await domToIssues(page, async rows => {
    for (const [issue, tr] of rows) {
      if (issue.parentId) {
        const links = await tr.$$(':scope > td.summary a.issue-link');
        await links[0].click();
        await page.waitForNavigation({waitUntil: 'networkidle2'});
        await page.goBack();
      }
    }
  });
  console.log(issues);
  browser.close();
}

function date(): [string, string] {
  const time = moment();
  // console.log(time.format('D/MMMM/YY'), time.add(21, 'days').format('D/MMMM/YY'));
  return [time.format('D/MMMM/YY'), time.add(21, 'days').format('D/MMMM/YY')];
}
