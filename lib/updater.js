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
  if (file && file.indexOf('.json') !== -1) {
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
const createFile = async (octokit, config, file, content) => {
  await octokit.repos.createFile({
    owner: config.owner,
    repo: config.toRepo,
    path: file,
    branch: config.branch || 'master',
    message: 'Create ' + file,
    content: base64.encode(maybejson(file, content))
  });

  pino.info('Created file ' + file);
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
const updateFile = async (octokit, config, file, content, sha) => {
  await octokit.repos.updateFile({
    owner: config.owner,
    repo: config.toRepo,
    path: file,
    branch: config.branch || 'master',
    message: 'Update ' + file,
    content: base64.encode(maybejson(file, content)),
    sha: sha
  });

  pino.info('Updated file ' + file);
};

/**
 * Delete file.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {string} file
 * @param {string} sha
 */
const deleteFile = async (octokit, config, file, sha) => {
  await octokit.repos.updateFile({
    owner: config.owner,
    repo: config.toRepo,
    path: file,
    message: 'Delete ' + file,
    sha: sha
  });

  pino.info('Deleted file ' + file);
}

/**
 * Get file to if we should update or create the file.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {string} file
 * @param {object} content
 */
const updater = async (octokit, config, file, content) => {
  try {
    const res = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.toRepo,
      path: file,
      branch: config.branch || 'master'
    })

    if (typeof res.data === 'undefined') {
      await createFile(octokit, config, file, content);
    } else {
      await updateFile(octokit, config, file, content, res.data.sha);
    }
  } catch (err) {
    if (typeof err === 'object' && err.status && err.status.indexOf('Not Found') !== -1) {
      await createFile(octokit, config, file, content);
    } else {
      pino.error(err.message);
    }
  }
};

/**
 * Get file and delete it.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {string} file
 */
const deleter = async (octokit, config, file) => {
  try {
    const res = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.toRepo,
      path: file,
      branch: config.branch || 'master'
    })

    if (typeof res.data !== 'undefined') {
      deleteFile(octokit, config, file, res.data.sha);
    }
  } catch (err) {
    pino.error(err.message);
  }
}

module.exports = {
  updater,
  deleter
};
