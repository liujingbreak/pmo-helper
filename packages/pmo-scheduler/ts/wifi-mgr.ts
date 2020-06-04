import {CronJob} from 'cron';
import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
import axios from 'axios';

/**
 * https://www.easycron.com/faq/What-cron-expression-does-easycron-support
 * 
 */
export function turnOff() {
  const sec = Math.ceil(Math.random() * 60);
  let min = 55 + Math.ceil(Math.random() * 15);
  let hour = 19;
  if (min >= 60) {
    min = min - 60;
    hour++;
  }

  const startSec = Math.ceil(Math.random() * 60);
  let startMin = 55 + Math.ceil(Math.random() * 5);
  let startHour = 9;
  if (startMin >= 60) {
    startMin = startMin - 60;
    startHour++;
  }

  // tslint:disable-next-line: no-console
  console.log(`Will turn off at ${hour}:${min}:${sec} and\n` +
  `Turn on at ${startHour}:${startMin}:${startSec}`);
  new CronJob(`${sec} ${min} ${hour} * * 1,2,3,4,5`, () => {
    // tslint:disable-next-line: no-console
    console.log('Turning off');
    spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'off');
  }).start();

  new CronJob(`${startSec} ${startMin} ${startHour} * * 1,2,3,4,5`, async () => {
    // tslint:disable-next-line: no-console
    console.log('Turning on');
    await spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'on').promise;
    await new Promise(resolve => setTimeout(resolve, 15000));
    axios.get('https://www.baidu.com');
  }).start();
}

export function turnOn() {
  spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'on');
}
