const pino = require('pino')();

/**
 * Get uniq events.
 *
 * @param  {array} events
 *
 * @return {array}
 */
const uniqEvents = (events) => {
  const events2 = {};
  events.forEach(event => {
    if (typeof event === 'object' && !events2[event.link]) {
      events2[event.link] = event;
    }
  });
  return Object.values(events2);
};

/**
 * Filter events date.
 *
 * @param  {array} events
 *
 * @return {array}
 */
const filterEventsDate = events => {
  return events.filter(event => {
    return event.date >= Date.now();
  });
}

/**
 * Filter event and close GitHub isse if event has passed.
 *
 * @param {object} octokit
 * @param {object} config
 * @param {object} event
 *
 * @return {object|bool}
 */
const filterEvents = (octokit, config, event) => {
  const date = new Date(event.date);

  if (date >= Date.now()) {
    return event;
  }

  octokit.issues.edit({
    owner: config.owner,
    repo: config.fromRepo,
    number: event.number,
    state: 'closed'
  }).then(res => {
    pino.info('Updated issue #' + event.number);
  }).catch(err => {
    pino.error(err.message);
  });

  return false;
};

module.exports = {
  filterEvents,
  filterEventsDate,
  uniqEvents
};
