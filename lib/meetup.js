const api = require('meetup-api');
const pino = require('pino')();

/**
 * Sleep for milliseconds.
 *
 * @param  {number} ms
 *
 * @return {Promise}
 */
const sleep = (ms) => {
  return new Promise(resolve=>{
      setTimeout(resolve, ms)
  })
};

/**
 * Find cities.
 *
 * @param  {number} category
 * @param  {string} country
 *
 * @return {Promise}
 */
const findCities = (category, country) => {
  return new Promise(resolve => {
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
 * Get open events from meetup.com for a city.
 *
 * @param  {object} config
 * @param  {number} category
 * @param  {object} city
 * @param  {string} country
 *
 * @return {Promise}
 */
const getOpenEvents = (config, category, city, country) => {
  const client = api({
    key: config.key,
  });

  return new Promise(resolve => {
    client.getOpenEvents({
      city: city.city,
      country: city.country,
      category: category,
      page: 200
    }, (err, data) => {
      if (err) {
        resolve([]);
        pino.error(err.message);
        return;
      }

      const events = data.results.map(event => {
        // Bail if event has passed.
        if (event.time < Date.now()) {
          return;
        }

        // Bail if no venue.
        if (typeof event.venue === 'undefined') {
          return;
        }

        // Bail if event country don't match.
        if (event.venue.country.toLowerCase() !== country.toLowerCase()) {
          return;
        }

        // Bail if group should be excluded.
        if ((config.exclude || []).map(s => s.toLowerCase()).indexOf(event.group.urlname.toLowerCase()) !== -1) {
          return;
        }

        return {
          title: event.name,
          date: event.time,
          city: event.venue.city.replace(/\d+(\s|)\d+/, '').trim(), // remove numbers in city, ex: 111 22 stochkolm.
          link: event.event_url,
          description: event.description,
        };
      }).filter(event => {
        return typeof event === 'object';
      });

      pino.info('Found ' + events.length + ' events for ' + city.city);

      resolve(events);
    });
  });
}

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
  const cities = await findCities(category, country);

  if (!cities.length) {
    return Promise.resolve([]);
  }

  pino.info('Found ' + cities.length + ' cities from meetup.com');

  let events = [];
  let i = 0;
  let next = true;

  return new Promise(async (resolve, reject) => {
    while (next) {
      next = false;

      const city = cities[i];
      if (typeof city === 'undefined') {
        resolve(events);
        break;
      }

      await sleep(3000);
      next = true;

      const events2 = await getOpenEvents(config, category, city, country);

      if (events2 instanceof Array) {
        events = events.concat(events2);
      }

      if (i + 1 === cities.length) {
        resolve(events);
        break;
      } else {
        i++;
      }
    }
  });
};

module.exports = {
  getEvents,
};
