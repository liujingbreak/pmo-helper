import {CronJob} from 'cron';
import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
import axios from 'axios';

/**
 * https://www.easycron.com/faq/What-cron-expression-does-easycron-support
 * 
 */
export function turnOff() {
  const sec = Math.ceil(Math.random() * 60);
  const min = 53 + Math.ceil(Math.random() * 15);

  const startSec = Math.ceil(Math.random() * 60);
  const startMin = 55 + Math.ceil(Math.random() * 5);

  // tslint:disable-next-line: no-console
  console.log(`Will turn off at 19:${min}:${sec} and\n` +
  `Turn on at 9:${startMin}:${startSec}`);
  new CronJob(`${sec} ${min} 19 * * 1,2,3,4,5`, () => {
    // tslint:disable-next-line: no-console
    console.log('Turning off');
    spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'off');
  }).start();

  new CronJob(`${startSec} ${startMin} 9 * * 1,2,3,4,5`, async () => {
    // tslint:disable-next-line: no-console
    console.log('Turning on');
    await spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'off').promise;
    await new Promise(resolve => setTimeout(resolve, 15000));
    axios.get('https://www.baidu.com');
  }).start();
}

export function turnOn() {
  spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'On');
}
