const api = require('meetup-api');
const pino = require('pino')();

/**
 * Find cities.
 *
 * @param  {number} category
 * @param  {string} country
 *
 * @return {Promise}
 */
const findCities = (category, country) => {
  return new Promise((resolve, reject) => {
    api().getCities({
      category: category,
      country: country,
      page: 200,
    }, (err, data) => {
      if (err) {
        pino.error(err.message);
        resolve([]);
      } else {
        resolve(data.results.filter(city => {
          return city.member_count >= 10;
        }));
      }
    });
  });
};

/**
 * Find events from meetup.com.
 *
 * @param  {object} config
 * @param  {number} category
 * @param  {string} country
 *
 * @return {Promise}
 */
const getEvents = async (config, category, country) => {
  const events = [];
  const cities = await findCities(category, country);

  if (!cities.length) {
    return Promise.resolve(events);
  }

  pino.info('Meetup cities count: ' + cities.length);

  const client = api({
    key: config.key,
  });

  return new Promise((resolve, reject) => {
    cities.forEach((city, i) => {
      client.getOpenEvents({
        city: city.city,
        country: city.country,
        category: category,
        page: 200
      }, (err, data) => {
        if (err) {
          if (i + 1 === cities.length) {
            resolve(events);
          } else {
            pino.error(err.message);
          }

          return;
        }

        data.results.map(event => {
          // Bail if event has passed.
          if (event.time < Date.now()) {
            return;
          }

          // Bail if no venue.
          if (typeof event.venue === 'undefined') {
            return;
          }

          // Bail if event country don't match.
          if (event.venue.country.toLowerCase() !== country) {
            return;
          }

          events.push({
            title: event.name,
            date: event.time,
            city: event.venue.city.replace(/\d+(\s|)\d+/, '').trim(), // remove numbers in city, ex: 111 22 stochkolm.
            link: event.event_url,
            description: event.description,
          });
        });

        if (i + 1 === cities.length) {
          resolve(events);
        }
      });
    });
  });
};

module.exports = {
  getEvents,
};
