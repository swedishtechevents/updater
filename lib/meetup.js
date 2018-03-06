const api = require('meetup-api');
const pino = require('pino')();

const findGroups = (config, category, country) => {
  const client = api({
    key: config.key,
  });

  return new Promise((resolve, reject) => {
    client.findGroups({
      category: category,
      country: country,
      page: 200,
    }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      // Only group id is needed.
      data = data.map(group => {
        return group.id;
      });

      resolve(data);
    });
  }).catch(err => {
    pino.error(err.message);
  });
}

/**
 * Find events from meetup.com.
 *
 * @param  {object} config
 *
 * @return {Promise}
 */
const getEvents = (config, groups) => {
  const events = [];
  const client = api({
    key: config.key,
  });

  return new Promise((resolve, reject) => {
      client.getEvents({
        group_id: groups.join(',')
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        pino.info('Found ' + data.results.length + ' meetup events from ' + group);

        data.results.forEach(event => {
          if (event.time < Date.now()) {
            return;
          }

          if (typeof event.venue === 'undefined') {
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
  }).catch(err => {
    pino.error(err.message);
  });
};

module.exports = {
  getEvents,
  findGroups
};
