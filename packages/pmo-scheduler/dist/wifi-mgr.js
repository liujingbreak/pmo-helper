"use strict";
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
exports.createCmd = exports.checkCreditApplServer = exports.turnOn = exports.turnOff = void 0;
const cron_1 = require("cron");
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const axios_observable_1 = __importDefault(require("axios-observable"));
// import log4js from 'log4js';
/**
 * https://www.easycron.com/faq/What-cron-expression-does-easycron-support
 *
 */
function turnOff() {
    const sec = Math.ceil(Math.random() * 60);
    let min = 50 + Math.ceil(Math.random() * 15);
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
        `Turn on at ${chalk_1.default.cyan(startHour + '')}:${startMin}:${startSec}`);
    new cron_1.CronJob(`${sec} ${min} ${hour} * * 1,2,3,4,5`, () => {
        // tslint:disable-next-line: no-console
        console.log('Turning off');
        process_utils_1.spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'off');
    }).start();
    new cron_1.CronJob(`${startSec} ${startMin} ${startHour} * * 1,2,3,4,5`, () => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log('Turning on');
        yield process_utils_1.spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'on').promise;
        yield new Promise(resolve => setTimeout(resolve, 15000));
        axios_1.default.get('https://www.baidu.com');
    })).start();
}
exports.turnOff = turnOff;
function turnOn() {
    process_utils_1.spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'on');
}
exports.turnOn = turnOn;
function checkCreditApplServer() {
    rxjs_1.timer(0, 30 * 60000).pipe(operators_1.switchMap(() => axios_observable_1.default.get('https://credit-service.bkjk.com/byj.githash-webui.txt')), operators_1.switchMap(res => {
        console.log(res.data);
        console.log(chalk_1.default.green(new Date().toLocaleTimeString()));
        return rxjs_1.from(Promise.resolve());
    }))
        .subscribe();
}
exports.checkCreditApplServer = checkCreditApplServer;
function createCmd() {
}
exports.createCmd = createCmd;

//# sourceMappingURL=wifi-mgr.js.map
