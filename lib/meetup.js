const api = require('meetup-api');
const pino = require('pino')();

/**
 * Find events from meetup.com.
 *
 * @param  {object} config
 *
 * @return {Promise}
 */
const meetup = (config) => {
  const events = [];
  const client = api({
    key: config.key,
  });

  return new Promise((resolve, reject) => {
    config.groups.forEach((group, i) => {
      client.getEvents({
        group_urlname: group
      }, (err, data) => {
        if (err) {
          pino.error(err.message);
          return;
        }

        pino.info('Found ' + data.results.length + ' meetup events from ' + group);

        data.results.forEach(event => {
          if (event.time < Date.now()) {
            return;
          }

          events.push({
            title: event.name,
            date: event.time,
            city: event.venue.city,
            link: 'https://www.meetup.com/' + group + '/events/' + event.id,
            description: event.description,
          });
        });

        if (i + 1 === config.groups.length) {
          resolve(events);
        }
      });
    });
  });
};

module.exports = meetup;
