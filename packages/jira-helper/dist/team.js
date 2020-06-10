"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIssues = void 0;
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

//# sourceMappingURL=team.js.map
