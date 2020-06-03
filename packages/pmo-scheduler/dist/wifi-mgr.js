"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cron_1 = require("cron");
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
/**
 * https://www.easycron.com/faq/What-cron-expression-does-easycron-support
 *
 */
function turnOff() {
    const sec = Math.ceil(Math.random() * 60);
    const min = 53 + Math.ceil(Math.random() * 15);
    // tslint:disable-next-line: no-console
    console.log(`Will turn off on 19:${min}:${sec}`);
    new cron_1.CronJob(`${sec} ${min} 19 * * 1,2,3,4,5`, () => {
        // tslint:disable-next-line: no-console
        console.log('You will see this message every second');
        process_utils_1.spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'off');
    }).start();
}
exports.turnOff = turnOff;
function turnOn() {
    process_utils_1.spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'On');
}
exports.turnOn = turnOn;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvcG1vLXNjaGVkdWxhci90cy93aWZpLW1nci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUE2QjtBQUM3QiwwRUFBNkQ7QUFHN0Q7OztHQUdHO0FBQ0gsU0FBZ0IsT0FBTztJQUNyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMxQyxNQUFNLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFFL0MsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2pELElBQUksY0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ2pELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFDdEQscUJBQUssQ0FBQyxjQUFjLEVBQUUsMkJBQTJCLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2IsQ0FBQztBQVhELDBCQVdDO0FBRUQsU0FBZ0IsTUFBTTtJQUNwQixxQkFBSyxDQUFDLGNBQWMsRUFBRSwyQkFBMkIsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDcEUsQ0FBQztBQUZELHdCQUVDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvcG1vLXNjaGVkdWxhci9kaXN0L3dpZmktbWdyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDcm9uSm9ifSBmcm9tICdjcm9uJztcbmltcG9ydCB7c3Bhd259IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcblxuXG4vKipcbiAqIGh0dHBzOi8vd3d3LmVhc3ljcm9uLmNvbS9mYXEvV2hhdC1jcm9uLWV4cHJlc3Npb24tZG9lcy1lYXN5Y3Jvbi1zdXBwb3J0XG4gKiBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR1cm5PZmYoKSB7XG4gIGNvbnN0IHNlYyA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogNjApO1xuICBjb25zdCBtaW4gPSA1MyArIE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTUpO1xuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgV2lsbCB0dXJuIG9mZiBvbiAxOToke21pbn06JHtzZWN9YCk7XG4gIG5ldyBDcm9uSm9iKGAke3NlY30gJHttaW59IDE5ICogKiAxLDIsMyw0LDVgLCAoKSA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1lvdSB3aWxsIHNlZSB0aGlzIG1lc3NhZ2UgZXZlcnkgc2Vjb25kJyk7XG4gICAgc3Bhd24oJ25ldHdvcmtzZXR1cCcsICctc2V0bmV0d29ya3NlcnZpY2VlbmFibGVkJywgJ1dpLUZpJywgJ29mZicpO1xuICB9KS5zdGFydCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHVybk9uKCkge1xuICBzcGF3bignbmV0d29ya3NldHVwJywgJy1zZXRuZXR3b3Jrc2VydmljZWVuYWJsZWQnLCAnV2ktRmknLCAnT24nKTtcbn1cbiJdfQ==
