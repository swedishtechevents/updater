const pino = require('pino')();
const parser = require('./parser');
const { filterEvents } = require('./events');

/**
 * Find events from GitHub issues.
 *
 * @param  {object} octokit
 * @param  {object} config
 *
 * @return {Promise}
 */
const github = (octokit, config) => {
  return octokit.issues.getForRepo({
    owner: config.owner,
    repo: config.fromRepo,
    labels: config.fromLabels || [],
    per_page: 100
  }).then(res => {
    pino.info('Found ' + res.data.length + ' GitHub issues');
    pino.info('Updating events');

    // Filter events.
    let events = res.data
      .map(parser)
      .map(event => {
        return filterEvents(octokit, config, event);
      });

    // Remove old events.
    events = events.filter(e => e !== false);

    return events;
  }).catch(err => {
    pino.error(err.message);
  });
};

module.exports = github;
