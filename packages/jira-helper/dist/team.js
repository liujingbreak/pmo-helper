"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// import {Page, Browser} from 'puppeteer-core';
const jsYaml = tslib_1.__importStar(require("js-yaml"));
const jira_1 = require("./jira");
const puppeteer_1 = require("./puppeteer");
const fs_1 = tslib_1.__importDefault(require("fs"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const log = require('log4js').getLogger('jira-helper.team');
const allowedPrefix = 'HDECOR, BYJ, BCL, MF, ZLZB'.split(/\s*,\s*/).reduce((set, prefix) => {
    set.add(prefix);
    return set;
}, new Set());
function listIssues() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch();
        const page = (yield browser.pages())[0];
        yield page.goto('https://issue.bkjk-inc.com/issues/?filter=14126', { waitUntil: 'networkidle2' });
        const issues = yield jira_1.domToIssues(page);
        const filtered = issues.filter(issue => {
            const prefix = issue.id.slice(0, issue.id.indexOf('-'));
            return allowedPrefix.has(prefix);
        });
        log.info(`${filtered.length} issues.`);
        const grouped = lodash_1.default.groupBy(filtered, issue => issue.assignee);
        fs_1.default.writeFileSync('dist/team-issues.yaml', jsYaml.safeDump(grouped));
        log.info('Result has been written to dist/team-issues.yaml');
        // log.info('Issue prefixes:', Array.from(prefixSet.values()).join(', '));
        yield browser.close();
    });
}
exports.listIssues = listIssues;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvdHMvdGVhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxnREFBZ0Q7QUFDaEQsd0RBQWtDO0FBQ2xDLGlDQUFtQztBQUNuQywyQ0FBbUM7QUFDbkMsb0RBQW9CO0FBQ3BCLDREQUF1QjtBQUN2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFNUQsTUFBTSxhQUFhLEdBQUcsNEJBQTRCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUN6RixHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQztBQUl0QixTQUFzQixVQUFVOztRQUU5QixNQUFNLE9BQU8sR0FBRyxNQUFNLGtCQUFNLEVBQUUsQ0FBQztRQUMvQixNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEVBQUMsU0FBUyxFQUFFLGNBQWMsRUFBQyxDQUFDLENBQUM7UUFFaEcsTUFBTSxNQUFNLEdBQUcsTUFBTSxrQkFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXZDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDckMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEQsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sT0FBTyxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3RCxZQUFFLENBQUMsYUFBYSxDQUFDLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNwRSxHQUFHLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUM7UUFFN0QsMEVBQTBFO1FBQzFFLE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FBQTtBQXJCRCxnQ0FxQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci9qaXJhLWhlbHBlci9kaXN0L3RlYW0uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQge1BhZ2UsIEJyb3dzZXJ9IGZyb20gJ3B1cHBldGVlci1jb3JlJztcbmltcG9ydCAqIGFzIGpzWWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCB7ZG9tVG9Jc3N1ZXN9IGZyb20gJy4vamlyYSc7XG5pbXBvcnQge2xhdW5jaH0gZnJvbSAnLi9wdXBwZXRlZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2ppcmEtaGVscGVyLnRlYW0nKTtcblxuY29uc3QgYWxsb3dlZFByZWZpeCA9ICdIREVDT1IsIEJZSiwgQkNMLCBNRiwgWkxaQicuc3BsaXQoL1xccyosXFxzKi8pLnJlZHVjZSgoc2V0LCBwcmVmaXgpID0+IHtcbiAgc2V0LmFkZChwcmVmaXgpO1xuICByZXR1cm4gc2V0O1xufSwgbmV3IFNldDxzdHJpbmc+KCkpO1xuXG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RJc3N1ZXMoKSB7XG5cbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaCgpO1xuICBjb25zdCBwYWdlID0gKGF3YWl0IGJyb3dzZXIucGFnZXMoKSlbMF07XG4gIGF3YWl0IHBhZ2UuZ290bygnaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz9maWx0ZXI9MTQxMjYnLCB7d2FpdFVudGlsOiAnbmV0d29ya2lkbGUyJ30pO1xuXG4gIGNvbnN0IGlzc3VlcyA9IGF3YWl0IGRvbVRvSXNzdWVzKHBhZ2UpO1xuXG4gIGNvbnN0IGZpbHRlcmVkID0gaXNzdWVzLmZpbHRlcihpc3N1ZSA9PiB7XG4gICAgY29uc3QgcHJlZml4ID0gaXNzdWUuaWQuc2xpY2UoMCwgaXNzdWUuaWQuaW5kZXhPZignLScpKTtcbiAgICByZXR1cm4gYWxsb3dlZFByZWZpeC5oYXMocHJlZml4KTtcbiAgfSk7XG5cbiAgbG9nLmluZm8oYCR7ZmlsdGVyZWQubGVuZ3RofSBpc3N1ZXMuYCk7XG5cbiAgY29uc3QgZ3JvdXBlZCA9IF8uZ3JvdXBCeShmaWx0ZXJlZCwgaXNzdWUgPT4gaXNzdWUuYXNzaWduZWUpO1xuICBmcy53cml0ZUZpbGVTeW5jKCdkaXN0L3RlYW0taXNzdWVzLnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoZ3JvdXBlZCkpO1xuICBsb2cuaW5mbygnUmVzdWx0IGhhcyBiZWVuIHdyaXR0ZW4gdG8gZGlzdC90ZWFtLWlzc3Vlcy55YW1sJyk7XG5cbiAgLy8gbG9nLmluZm8oJ0lzc3VlIHByZWZpeGVzOicsIEFycmF5LmZyb20ocHJlZml4U2V0LnZhbHVlcygpKS5qb2luKCcsICcpKTtcbiAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xufVxuIl19
