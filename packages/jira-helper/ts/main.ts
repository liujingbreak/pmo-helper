// tslint:disable: no-console max-line-length
import { Builder, Capabilities } from 'selenium-webdriver';
const {Options} = require('selenium-webdriver/chrome');
import Path from 'path';
import os from 'os';

export async function main() {
  process.env.PATH = process.env.PATH + Path.delimiter + Path.resolve(__dirname, '..');
  const opt = new Options();
  if (process.platform === 'darwin') {
    console.log('mac osx');
    opt.addArguments('headless')
      .setLocalState(Path.resolve(os.homedir(), 'Library/Application Support/Google/Chrome/Local State'))
      .setChromeBinaryPath('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  }
  const cap = Capabilities.chrome();
  cap.set('chromeOptions', {args: ['--headless']});
  const builder = new Builder().forBrowser('chrome').withCapabilities(cap);
  const driver = builder.build();
  await driver.get('https://weibo.com');
  // driver.get('https://issue.bkjk-inc.com/issues/?filter=-1&jql=resolution%20%3D%20Unresolved%20AND%20assignee%20in%20(jing.liu%2C%20haiz.chen001)%20order%20by%20updated%20DESC');
  // await driver.get('https://trello.com/b/i6yaHbFX/%E8%B4%9D%E7%94%A8%E9%87%91%E8%B4%9D%E5%88%86%E6%9C%9F%E4%BA%A7%E5%93%81%E5%8E%9F%E4%BF%A1%E7%94%A8%E4%BA%8B%E4%B8%9A%E9%83%A8%E5%89%8D%E7%AB%AF%E5%9B%A2%E9%98%9F');
  process.on('SIGINT', () => {
    console.log('bye');
    driver.quit();
  });
}
