"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console max-line-length
const selenium_webdriver_1 = require("selenium-webdriver");
const path_1 = tslib_1.__importDefault(require("path"));
function main() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        process.env.PATH = process.env.PATH + path_1.default.delimiter + path_1.default.resolve(__dirname, '..');
        const builder = new selenium_webdriver_1.Builder().forBrowser('chrome');
        debugger;
        console.log(builder.getChromeOptions());
        // const driver = builder.build();
        // driver.get('https://issue.bkjk-inc.com/issues/?filter=-1&jql=resolution%20%3D%20Unresolved%20AND%20assignee%20in%20(jing.liu%2C%20haiz.chen001)%20order%20by%20updated%20DESC');
        // await driver.get('https://trello.com/b/i6yaHbFX/%E8%B4%9D%E7%94%A8%E9%87%91%E8%B4%9D%E5%88%86%E6%9C%9F%E4%BA%A7%E5%93%81%E5%8E%9F%E4%BF%A1%E7%94%A8%E4%BA%8B%E4%B8%9A%E9%83%A8%E5%89%8D%E7%AB%AF%E5%9B%A2%E9%98%9F');
        // process.on('SIGINT', () => {
        //   console.log('bye');
        //   driver.quit();
        // });
    });
}
exports.main = main;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvdHMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBNkM7QUFDN0MsMkRBQTZDO0FBQzdDLHdEQUF3QjtBQUV4QixTQUFzQixJQUFJOztRQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxjQUFJLENBQUMsU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sT0FBTyxHQUFHLElBQUksNEJBQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxRQUFRLENBQUM7UUFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDeEMsa0NBQWtDO1FBRWxDLG1MQUFtTDtRQUNuTCx3TkFBd047UUFDeE4sK0JBQStCO1FBQy9CLHdCQUF3QjtRQUN4QixtQkFBbUI7UUFDbkIsTUFBTTtJQUNSLENBQUM7Q0FBQTtBQWJELG9CQWFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvZGlzdC9tYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgeyBCdWlsZGVyIH0gZnJvbSAnc2VsZW5pdW0td2ViZHJpdmVyJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcbiAgcHJvY2Vzcy5lbnYuUEFUSCA9IHByb2Nlc3MuZW52LlBBVEggKyBQYXRoLmRlbGltaXRlciArIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicpO1xuICBjb25zdCBidWlsZGVyID0gbmV3IEJ1aWxkZXIoKS5mb3JCcm93c2VyKCdjaHJvbWUnKTtcbiAgZGVidWdnZXI7XG4gIGNvbnNvbGUubG9nKGJ1aWxkZXIuZ2V0Q2hyb21lT3B0aW9ucygpKTtcbiAgLy8gY29uc3QgZHJpdmVyID0gYnVpbGRlci5idWlsZCgpO1xuXG4gIC8vIGRyaXZlci5nZXQoJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2lzc3Vlcy8/ZmlsdGVyPS0xJmpxbD1yZXNvbHV0aW9uJTIwJTNEJTIwVW5yZXNvbHZlZCUyMEFORCUyMGFzc2lnbmVlJTIwaW4lMjAoamluZy5saXUlMkMlMjBoYWl6LmNoZW4wMDEpJTIwb3JkZXIlMjBieSUyMHVwZGF0ZWQlMjBERVNDJyk7XG4gIC8vIGF3YWl0IGRyaXZlci5nZXQoJ2h0dHBzOi8vdHJlbGxvLmNvbS9iL2k2eWFIYkZYLyVFOCVCNCU5RCVFNyU5NCVBOCVFOSU4NyU5MSVFOCVCNCU5RCVFNSU4OCU4NiVFNiU5QyU5RiVFNCVCQSVBNyVFNSU5MyU4MSVFNSU4RSU5RiVFNCVCRiVBMSVFNyU5NCVBOCVFNCVCQSU4QiVFNCVCOCU5QSVFOSU4MyVBOCVFNSU4OSU4RCVFNyVBQiVBRiVFNSU5QiVBMiVFOSU5OCU5RicpO1xuICAvLyBwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiB7XG4gIC8vICAgY29uc29sZS5sb2coJ2J5ZScpO1xuICAvLyAgIGRyaXZlci5xdWl0KCk7XG4gIC8vIH0pO1xufVxuIl19
