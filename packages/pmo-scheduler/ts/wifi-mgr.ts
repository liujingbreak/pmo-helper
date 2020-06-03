import {CronJob} from 'cron';
import {spawn} from 'dr-comp-package/wfh/dist/process-utils';


/**
 * https://www.easycron.com/faq/What-cron-expression-does-easycron-support
 * 
 */
export function turnOff() {
  const sec = Math.ceil(Math.random() * 60);
  const min = 53 + Math.ceil(Math.random() * 15);

  // tslint:disable-next-line: no-console
  console.log(`Will turn off on 19:${min}:${sec}`);
  new CronJob(`${sec} ${min} 19 * * 1,2,3,4,5`, () => {
    // tslint:disable-next-line: no-console
    console.log('You will see this message every second');
    spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'off');
  }).start();
}

export function turnOn() {
  spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'On');
}
