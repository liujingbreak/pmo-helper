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
exports.checkCreditApplServer = exports.turnOn = exports.turnOff = void 0;
const cron_1 = require("cron");
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const axios_observable_1 = __importDefault(require("axios-observable"));
const child_process_1 = require("child_process");
const cd_server_1 = require("@wfh/assets-processer/dist/content-deployer/cd-server");
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
    const endDate = new Date(2021, 0, 12, 18, 0);
    rxjs_1.timer(15 * 60000, 30 * 60000)
        .pipe(operators_1.takeWhile(() => {
        return new Date().getTime() < endDate.getTime();
    }), operators_1.switchMap(() => axios_observable_1.default.get('https://credit-service.bkjk.com/byj.githash-webui.txt')
        .pipe(operators_1.catchError(err => {
        console.error(chalk_1.default.red(err.message), err);
        return rxjs_1.timer(5000).pipe(operators_1.map(() => { throw err; }));
    }), operators_1.retry(3), operators_1.catchError(err => {
        console.error(chalk_1.default.yellow('Failed to retry'), err);
        return rxjs_1.of(null);
    }))), operators_1.switchMap(res => {
        if (res == null)
            return rxjs_1.of();
        // tslint:disable-next-line: no-console
        console.log(res.data);
        if (res.data.indexOf('user who has no balance applied can not go backward in introdcution page') < 0) {
            return new rxjs_1.Observable(sub => {
                const worker = child_process_1.fork(require.resolve('@wfh/plink/bin/dr'), `send --env prod --con 2 --nodes 2 --secret ${cd_server_1.generateToken()} -c packages/pmo-scheduler/deploy-credit.yaml byj install-prod/byj.zip`.split(/\s+/), { serialization: 'advanced', stdio: 'inherit' });
                worker.on('error', () => { sub.next(); sub.complete(); });
                worker.on('exit', (err) => { sub.error(err); });
            }).pipe(operators_1.retry(1), operators_1.catchError(err => {
                console.error(chalk_1.default.yellow('Failed to retry'), err);
                return rxjs_1.of();
            }));
        }
        const now = new Date();
        // tslint:disable-next-line: no-console
        console.log(chalk_1.default.green(now.toLocaleTimeString() + ' ' + now.toLocaleDateString()));
        return rxjs_1.of();
    }))
        .subscribe();
}
exports.checkCreditApplServer = checkCreditApplServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lmaS1tZ3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3aWZpLW1nci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBNkI7QUFDN0IscUVBQXdEO0FBQ3hELGtEQUEwQjtBQUMxQixrREFBMEI7QUFDMUIsOENBQTRFO0FBQzVFLCtCQUEyQztBQUMzQyx3RUFBdUM7QUFDdkMsaURBQW1DO0FBQ25DLHFGQUFvRjtBQUNwRiwrQkFBK0I7QUFFL0I7OztHQUdHO0FBQ0gsU0FBZ0IsT0FBTztJQUNyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMxQyxJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDN0MsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2QsSUFBSSxHQUFHLElBQUksRUFBRSxFQUFFO1FBQ2IsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZixJQUFJLEVBQUUsQ0FBQztLQUNSO0lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDL0MsSUFBSSxRQUFRLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2pELElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNsQixJQUFJLFFBQVEsSUFBSSxFQUFFLEVBQUU7UUFDbEIsUUFBUSxHQUFHLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDekIsU0FBUyxFQUFFLENBQUM7S0FDYjtJQUVELHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9C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QixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE9BQU8sU0FBRSxFQUFFLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FDSDtTQUNBLFNBQVMsRUFBRSxDQUFDO0FBQ2YsQ0FBQztBQWxERCxzREFrREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Nyb25Kb2J9IGZyb20gJ2Nyb24nO1xuaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtzd2l0Y2hNYXAsIHJldHJ5LCBjYXRjaEVycm9yLCBtYXAsIHRha2VXaGlsZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtvZiwgdGltZXIsIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IGF4aW9zb2IgZnJvbSAnYXhpb3Mtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge2Zvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtnZW5lcmF0ZVRva2VufSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlcic7XG4vLyBpbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5cbi8qKlxuICogaHR0cHM6Ly93d3cuZWFzeWNyb24uY29tL2ZhcS9XaGF0LWNyb24tZXhwcmVzc2lvbi1kb2VzLWVhc3ljcm9uLXN1cHBvcnRcbiAqIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHVybk9mZigpIHtcbiAgY29uc3Qgc2VjID0gTWF0aC5jZWlsKE1hdGgucmFuZG9tKCkgKiA2MCk7XG4gIGxldCBtaW4gPSA1MCArIE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTUpO1xuICBsZXQgaG91ciA9IDE5O1xuICBpZiAobWluID49IDYwKSB7XG4gICAgbWluID0gbWluIC0gNjA7XG4gICAgaG91cisrO1xuICB9XG5cbiAgY29uc3Qgc3RhcnRTZWMgPSBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIDYwKTtcbiAgbGV0IHN0YXJ0TWluID0gNTUgKyBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIDUpO1xuICBsZXQgc3RhcnRIb3VyID0gOTtcbiAgaWYgKHN0YXJ0TWluID49IDYwKSB7XG4gICAgc3RhcnRNaW4gPSBzdGFydE1pbiAtIDYwO1xuICAgIHN0YXJ0SG91cisrO1xuICB9XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGBXaWxsIHR1cm4gb2ZmIGF0ICR7aG91cn06JHttaW59OiR7c2VjfSBhbmRcXG5gICtcbiAgYFR1cm4gb24gYXQgJHtjaGFsay5jeWFuKHN0YXJ0SG91ciArICcnKX06JHtzdGFydE1pbn06JHtzdGFydFNlY31gKTtcbiAgbmV3IENyb25Kb2IoYCR7c2VjfSAke21pbn0gJHtob3VyfSAqICogMSwyLDMsNCw1YCwgKCkgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdUdXJuaW5nIG9mZicpO1xuICAgIHNwYXduKCduZXR3b3Jrc2V0dXAnLCAnLXNldG5ldHdvcmtzZXJ2aWNlZW5hYmxlZCcsICdXaS1GaScsICdvZmYnKTtcbiAgfSkuc3RhcnQoKTtcblxuICBuZXcgQ3JvbkpvYihgJHtzdGFydFNlY30gJHtzdGFydE1pbn0gJHtzdGFydEhvdXJ9ICogKiAxLDIsMyw0LDVgLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1R1cm5pbmcgb24nKTtcbiAgICBhd2FpdCBzcGF3bignbmV0d29ya3NldHVwJywgJy1zZXRuZXR3b3Jrc2VydmljZWVuYWJsZWQnLCAnV2ktRmknLCAnb24nKS5wcm9taXNlO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxNTAwMCkpO1xuICAgIGF4aW9zLmdldCgnaHR0cHM6Ly93d3cuYmFpZHUuY29tJyk7XG4gIH0pLnN0YXJ0KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0dXJuT24oKSB7XG4gIHNwYXduKCduZXR3b3Jrc2V0dXAnLCAnLXNldG5ldHdvcmtzZXJ2aWNlZW5hYmxlZCcsICdXaS1GaScsICdvbicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDcmVkaXRBcHBsU2VydmVyKCkge1xuICBjb25zdCBlbmREYXRlID0gbmV3IERhdGUoMjAyMSwgMCwgMTIsIDE4LCAwKTtcbiAgdGltZXIoMTUgKiA2MDAwMCwgMzAgKiA2MDAwMClcbiAgLnBpcGUoXG4gICAgdGFrZVdoaWxlKCgpID0+IHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSA8IGVuZERhdGUuZ2V0VGltZSgpO1xuICAgIH0pLFxuICAgIHN3aXRjaE1hcCgoKSA9PiBheGlvc29iLmdldDxzdHJpbmc+KCdodHRwczovL2NyZWRpdC1zZXJ2aWNlLmJramsuY29tL2J5ai5naXRoYXNoLXdlYnVpLnR4dCcpXG4gICAgICAucGlwZShcbiAgICAgICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKGVyci5tZXNzYWdlKSwgZXJyKTtcbiAgICAgICAgICByZXR1cm4gdGltZXIoNTAwMCkucGlwZShcbiAgICAgICAgICAgIG1hcCgoKSA9PiB7dGhyb3cgZXJyO30pXG4gICAgICAgICAgKTtcbiAgICAgICAgfSksXG4gICAgICAgIHJldHJ5KDMpLFxuICAgICAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihjaGFsay55ZWxsb3coJ0ZhaWxlZCB0byByZXRyeScpLCBlcnIpO1xuICAgICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgICAgfSlcbiAgICAgICkpLFxuICAgIHN3aXRjaE1hcChyZXMgPT4ge1xuICAgICAgaWYgKHJlcyA9PSBudWxsKVxuICAgICAgICByZXR1cm4gb2YoKTtcblxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhyZXMuZGF0YSk7XG4gICAgICBpZiAocmVzLmRhdGEuaW5kZXhPZigndXNlciB3aG8gaGFzIG5vIGJhbGFuY2UgYXBwbGllZCBjYW4gbm90IGdvIGJhY2t3YXJkIGluIGludHJvZGN1dGlvbiBwYWdlJykgPCAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShzdWIgPT4ge1xuICAgICAgICAgIGNvbnN0IHdvcmtlciA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL2Jpbi9kcicpLFxuICAgICAgICAgICAgYHNlbmQgLS1lbnYgcHJvZCAtLWNvbiAyIC0tbm9kZXMgMiAtLXNlY3JldCAke2dlbmVyYXRlVG9rZW4oKX0gLWMgcGFja2FnZXMvcG1vLXNjaGVkdWxlci9kZXBsb3ktY3JlZGl0LnlhbWwgYnlqIGluc3RhbGwtcHJvZC9ieWouemlwYC5zcGxpdCgvXFxzKy8pLFxuICAgICAgICAgICAge3NlcmlhbGl6YXRpb246ICdhZHZhbmNlZCcsIHN0ZGlvOiAnaW5oZXJpdCd9KTtcbiAgICAgICAgICB3b3JrZXIub24oJ2Vycm9yJywgKCkgPT4ge3N1Yi5uZXh0KCk7IHN1Yi5jb21wbGV0ZSgpO30pO1xuICAgICAgICAgIHdvcmtlci5vbignZXhpdCcsIChlcnIpID0+IHtzdWIuZXJyb3IoZXJyKTt9KTtcbiAgICAgICAgfSkucGlwZShcbiAgICAgICAgICByZXRyeSgxKSxcbiAgICAgICAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGNoYWxrLnllbGxvdygnRmFpbGVkIHRvIHJldHJ5JyksIGVycik7XG4gICAgICAgICAgICByZXR1cm4gb2YoKTtcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5ncmVlbihub3cudG9Mb2NhbGVUaW1lU3RyaW5nKCkgKyAnICcgKyBub3cudG9Mb2NhbGVEYXRlU3RyaW5nKCkpKTtcbiAgICAgIHJldHVybiBvZigpO1xuICAgIH0pXG4gIClcbiAgLnN1YnNjcmliZSgpO1xufVxuXG4iXX0=