const pino = require('pino')();
const base64 = require('js-base64').Base64;

/**
 * Create file.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {array}  events
 */
const createFile = (octokit, config, events) => {
  octokit.repos.createFile({
    owner: config.owner,
    repo: config.toRepo,
    path: config.file,
    message: 'Create ' + config.file,
    content: base64.encode(JSON.stringify(events)),
  }).then(res => {
    pino.info('Created file ' + config.file);
  }).catch(err => {
    pino.error(err.message);
  });
};

/**
 * Update file.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {array}  events
 * @param {string} sha
 */
const updateFile = (octokit, config, events, sha) => {
  octokit.repos.updateFile({
    owner: config.owner,
    repo: config.toRepo,
    path: config.file,
    message: 'Update ' + config.file,
    content: base64.encode(JSON.stringify(events)),
    sha: sha,
  }).then(res => {
    pino.info('Updated file ' + config.file);
  }).catch(err => {
    pino.error(err.message);
  });
};

/**
 * Get file to if we should update or create the file.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {array}  events
 */
const updater = (octokit, config, events) => {
  octokit.repos.getContent({
    owner: config.owner,
    repo: config.toRepo,
    path: config.file
  }).then(res => {
    if (typeof res.data === 'undefined') {
      createFile(octokit, config, events);
    } else {
      updateFile(octokit, config, events, res.data.sha);
    }
  }).catch(err => {
    if (err.message.indexOf('Not Found') !== -1) {
      createFile(octokit, config, events);
    } else {
      pino.error(err.message);
    }
  });
}

module.exports = updater;
