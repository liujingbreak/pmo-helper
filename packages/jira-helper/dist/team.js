"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.listIssues = void 0;
// import {Page, Browser} from 'puppeteer-core';
const jsYaml = __importStar(require("js-yaml"));
const jira_1 = require("./jira");
const puppeteer_1 = require("./puppeteer");
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const log = require('log4js').getLogger('jira-helper.team');
const allowedPrefix = 'HDECOR, BYJ, BCL, MF, ZLZB'.split(/\s*,\s*/).reduce((set, prefix) => {
    set.add(prefix);
    return set;
}, new Set());
function listIssues() {
    return __awaiter(this, void 0, void 0, function* () {
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
