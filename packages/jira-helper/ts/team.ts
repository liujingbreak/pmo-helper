// import {Page, Browser} from 'puppeteer-core';
import * as jsYaml from 'js-yaml';
import {domToIssues} from './jira';
import {launch} from './puppeteer';
const log = require('log4js').getLogger('jira-helper.team');

export async function listIssues() {
  const browser = await launch();
  const page = (await browser.pages())[0];
  await page.goto('https://issue.bkjk-inc.com/issues/?filter=14109', {waitUntil: 'networkidle2'});
  await page.waitFor(10000);
  const issues = await domToIssues(page);
  log.info(jsYaml.safeDump(issues));
  log.info(`${issues.length} issues.`);
  await browser.close();
}
