const program = require('commander');
const octokit = require('@octokit/rest')();
const pino = require('pino')();

// Create program.
program
  .version('1.0.0')
  .option('-c, --config [config]', 'Config file', './config.json')
  .parse(process.argv);

// Bail if no config file.
if (!program.config) {
  pino.error('Missing config path');
  process.exit(1);
}

// Custom modules.
const config = require(program.config);
const parser = require('./parser');
const updateFile = require('./updater');
const filterEvents = require('./events');

// Authenticate against GitHub api.
octokit.authenticate({
  type: 'token',
  token: config.token
});

// Fetch issues.
octokit.issues.getForRepo({
  owner: config.owner,
  repo: config.fromRepo,
  labels: config.fromLabels || [],
  per_page: 100
}).then(res => {
  pino.info('Found ' + res.data.length + ' issues');
  pino.info('Updating events');

  // Filter events.
  let events = res.data
    .map(parser)
    .map(event => {
      return filterEvents(octokit, config, event);
    });

  // Remove old events.
  events = events.filter(e => e !== false);

  // Update file with new events.
  updateFile(octokit, config, events);
}).catch(err => {
  pino.error(err.message);
});
