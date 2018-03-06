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

      const result = {};
      data.forEach(group => {
        if ((config.exclude || []).indexOf(group.urlname) !== -1) {
          pino.info('Excluding: ' + group.urlname);
          return;
        }

        result[group.id] = group.urlname;
      });

      resolve(result);
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
        group_id: Object.keys(groups).join(','),
        text_format: config.text_format || 'html',
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        pino.info('Found ' + data.results.length + ' events from meetup.com');

        data.results.forEach(event => {
          if (event.time < Date.now()) {
            return;
          }

          if (typeof event.venue === 'undefined') {
            return;
          }

          const urlname = groups[event.group.id];

          events.push({
            title: event.name,
            date: event.time,
            city: event.venue.city,
            link: 'https://www.meetup.com/' + urlname + '/events/' + event.id,
            description: event.description,
          });
        });

        resolve(events);
      });
  }).catch(err => {
    pino.error(err.message);
  });
};

module.exports = {
  getEvents,
  findGroups
};
