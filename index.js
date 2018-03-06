const program = require('commander');
const octokit = require('@octokit/rest')();
const pino = require('pino')();
const updater = require('./lib/updater');
const github = require('./lib/github');
const meetup = require('./lib/meetup');

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

// Load configuration.
const config = require(program.config);

// Authenticate against GitHub api.
octokit.authenticate(config.github.authentication);

(async () => {
  let events = await github(octokit, config.github);

  if (!(events instanceof Array)) {
    events = [];
  }

  const res = await meetup(config.meetup);
  if (res instanceof Array) {
    events = events.concat(res);
  }

  events = events.sort((a, b) => {
    return a.date - b.date;
  });

  // Update events file.
  updater(octokit, config.github, events);
})()
