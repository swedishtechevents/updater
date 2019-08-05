const pino = require('pino')();
const stripHtml = require('string-strip-html');

/**
 * Fix events data.
 *
 * @param  {array} events
 *
 * @return {array}
 */
const fixEventsData = (events) => {
  const cities = [];

  events.forEach(event => {
    const a = event.city;
    const b = event.city
      .replace('Å', 'A')
      .replace('Ä', 'A')
      .replace('Ö', 'O')
      .replace('å', 'a')
      .replace('ä', 'a')
      .replace('ö', 'o');

    if (typeof cities[b] === 'undefined') {
      cities[b] = a;
    }
  });

  return events.map(event => {
    if (typeof cities[event.city] !== 'undefined') {
      event.city = cities[event.city];
    }

    if (typeof event.free === 'undefined') {
      event.free = true;
    }

    event.description = stripHtml(event.description);

    if (event.city.toLowerCase() === 'gothenburg') {
      event.city = 'Göteborg';
    }

    return event;
  });
}

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
};

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
  fixEventsData,
  uniqEvents
};
