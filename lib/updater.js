const pino = require('pino')();
const base64 = require('js-base64').Base64;

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
};

/**
 * Create file.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {string} file
 * @param {object} content
 */
const createFile = (octokit, config, file, content) => {
  octokit.repos.createFile({
    owner: config.owner,
    repo: config.toRepo,
    path: file,
    branch: config.branch || 'master',
    message: 'Create ' + file,
    content: base64.encode(maybejson(file, content))
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
 * @param {string} file
 * @param {object} content
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
    sha: sha
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
 * @param {string} file
 * @param {object} content
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
      updateFile(octokit, config, file, content, res.data.sha);
    }
  }).catch(err => {
    if (err.message.indexOf('Not Found') !== -1) {
      createFile(octokit, config, file, content);
    } else {
      pino.error(err.message);
    }
  });
};

module.exports = updater;
