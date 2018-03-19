const pino = require('pino')();
const base64 = require('js-base64').Base64;
const fetch = require('node-fetch').default;
const { filterEventsDate, uniqEvents } = require('./events');

/**
 * Stringify to JSON maybe.
 *
 * @param  {string} file
 * @param  {string} content
 *
 * @return {string}
 */
const maybejson = (file, content) => {
  if (file.indexOf('.json') !== -1) {
    return JSON.stringify(content);
  }

  return content;
}

/**
 * Create file.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {array}  events
 */
const createFile = (octokit, config, file, content) => {
  octokit.repos.createFile({
    owner: config.owner,
    repo: config.toRepo,
    path: file,
    branch: config.branch || 'master',
    message: 'Create ' + file,
    content: base64.encode(maybejson(file, content)),
  }).then(res => {
    pino.info('Created file ' + file);
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
const updateFile = (octokit, config, file, content, sha) => {
  octokit.repos.updateFile({
    owner: config.owner,
    repo: config.toRepo,
    path: file,
    branch: config.branch || 'master',
    message: 'Update ' + file,
    content: base64.encode(maybejson(file, content)),
    sha: sha,
  }).then(res => {
    pino.info('Updated file ' + file);
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
const updater = (octokit, config, file, content) => {
  octokit.repos.getContent({
    owner: config.owner,
    repo: config.toRepo,
    path: file,
    branch: config.branch || 'master'
  }).then(res => {
    if (typeof res.data === 'undefined') {
      createFile(octokit, config, file, content);
    } else {
      if (res.data.download_url.indexOf('.json') !== -1) {
        fetch(res.data.download_url)
        .then(res => res.json())
        .then(events2 => {
          events = events.concat(events2);
          events = uniqEvents(events);
          events = filterEventsDate(events);
          updateFile(octokit, config, file, content, res.data.sha);
        }).catch(err => {
          pino.error(err.message);
        });
      } else {
        updateFile(octokit, config, file, content, res.data.sha);
      }
    }
  }).catch(err => {
    if (err.message.indexOf('Not Found') !== -1) {
      createFile(octokit, config, file, content);
    } else {
      pino.error(err.message);
    }
  });
}

module.exports = updater;
