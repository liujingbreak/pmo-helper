/* eslint no-console: 0 */
const cluster = require('cluster');
const os = require('os');
const pm2InstanceId = process.env.NODE_APP_INSTANCE;
var isPm2 = cluster.isWorker && pm2InstanceId != null;
const SLACK_API_TOKEN = '<paste your token>';

const patterns = {
	fileDate: '%d [%p] %c - %m',
	colorfulOutput: '%[[%p]%c%] - %m',
	clusterFileDate: '%d (PID:%z)[%p] %c - %m'
};

if (isPm2) {
	// log4js requires special treatment for cluster or PM2 environment
	console.log(`(PID:${process.pid})[log4js.js] process is worker? ${cluster.isWorker}, is master? ${cluster.isMaster}`);
	console.log(`(PID:${process.pid})[log4js.js] worker id`, cluster.worker.id);
	console.log(`(PID:${process.pid})[log4js.js] process.env.NODE_APP_INSTANCE`, pm2InstanceId);
	if (pm2InstanceId === '0') {
		// Refer to https://github.com/liujingbreak/log4js-pm2-intercom
		process.send({topic: 'log4js:master'});
	}
}

var config = {
	pm2: isPm2,
	appenders: {
		out: {
			type: 'stdout',
			layout: {type: 'pattern', pattern: cluster.isWorker ? patterns.clusterFileDate : patterns.colorfulOutput}
		},
		infoOut: {type: 'logLevelFilter', appender: 'out', level: 'info'},
		errorOut: {type: 'logLevelFilter', appender: 'out', level: 'error'},
		file: {
			type: 'file',
			filename: 'logs/credit-nodejs-server.log',
			keepFileExt: true,
			layout: {type: 'pattern', pattern: cluster.isWorker ? patterns.clusterFileDate : patterns.fileDate},
			maxLogSize: 500 * 1024,
			backups: 2
		},
		errorSlack: {type: 'logLevelFilter', appender: 'slack', level: 'error'}
	},
	categories: {
		'default': {appenders: ['out', 'file'], level: 'info'},
		'@bk/credit-appl': {appenders: ['out', 'file'], level: 'info'},
		'dr-comp-package': {appenders: ['file'], level: 'debug'},
		'@dr-core/assets-processer': {appenders: ['infoOut', 'file'], level: 'debug'},
		'wfh.module-dep-helper': {appenders: ['infoOut', 'file'], level: 'info'},
		'wfh.ManualChunkPlugin': {appenders: ['infoOut', 'file'], level: 'debug'},
		'wfh.ManualChunkPlugin-m': {appenders: ['out', 'file'], level: 'error'},
		'wfh.moreWebpackOptions.js': {appenders: ['infoOut', 'file'], level: 'debug'}
	}
};

module.exports = config;

module.exports.setup = function(options) {
	var {logger} = options;
	if (logger == null || pm2InstanceId !== '0')
		return config;
	if (logger.noFileLimit) {
		console.log('[log4js.js] No file max log size limitation');
		delete config.appenders.file.maxLogSize;
		delete config.appenders.file.backups;
	}
	if (logger.onlyFileOut) {
		for (let cat of Object.values(config.categories)) {
			cat.appenders = ['file'];
		}
		console.log('[log4js.js] only file out');
	}
	if (logger.slackChannelId) {
		var slackInstalled = true;
		try {
			require.resolve('@log4js-node/slack');
		} catch (ex) {
			slackInstalled = false;
			console.log('[log4js.js] slack is not installed yet.');
		}
		if (slackInstalled) {
			config.appenders.slack = {
				type: '@log4js-node/slack',
				token: SLACK_API_TOKEN,
				channel_id: logger.slackChannelId,
				username: os.hostname() + ' ' + os.userInfo().username
			};
			config.appenders.errorSlack = {type: 'logLevelFilter', appender: 'slack', level: 'error'};
			config.categories['@bk/credit-appl'].appenders.push('slack');
		}
	}
	return config;
};
