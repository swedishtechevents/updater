const pino = require('pino')();
const request = require('request');
const fs = require('fs');
const path = require('path');
const { uniqEvents } = require('./events');
const oauthPath = path.join(__dirname, '..', 'meetup.json');

/**
 * Get access token from meetup.com.
 *
 * @param  {object} config
 *
 * @return {Promise}
 */
const getAccessToken = (config) => {
  pino.info('Refreshing meetup.com oauth2 token');

  const file = require(oauthPath);
  const body = 'client_id=' + config.oauth.key + '&client_secret=' + config.oauth.secret + '&grant_type=refresh_token&refresh_token=' + file.refresh_token;

  return new Promise((resolve, reject) => {
    request('https://secure.meetup.com/oauth2/access', {
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body,
      method: 'POST'
    }, (err, res, body) => {
      if (err) {
        reject(err.message);
        return;
      }

      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      if (typeof body.error !== 'undefined') {
        reject(body.error);
        return;
      }

      fs.writeFileSync(oauthPath, JSON.stringify(body, null, 2));
      resolve(body);
    });
  });
};

/**
 * Request meetup.com api.
 *
 * @param {object} config
 * @param {string} path
 * @param {function} fn
 */
const requestApi = (config, path, fn) => {
  getAccessToken(config).then(body => {
    request('https://api.meetup.com/' + path, {
      json: true,
      headers: {
        Authorization: 'Bearer ' + body.access_token
      }
    }, fn);
  }).catch(err => {
    pino.error(err);
  });
};

/**
 * Sleep for milliseconds.
 *
 * @param  {number} ms
 *
 * @return {Promise}
 */
const sleep = (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

/**
 * Create event title.
 *
 * @param  {object} event
 *
 * @return {string}
 */
const eventTitle = (event) => {
  if (event.name.indexOf(event.group.name) !== -1) {
    return event.name;
  }

  return event.name + ' - ' + event.group.name;
};

/**
 * Get open events from meetup.com from latitude and longitude with a radius of 100.
 *
 * @param  {object} config
 * @param  {number} lat
 * @param  {number} long
 * @param  {string} city
 *
 * @return {Promise}
 */
const getOpenEvents = (config, lat, lon, city) => {
  const exclude = (config.exclude || []).map(s => s.toLowerCase());

  return new Promise(resolve => {
    requestApi(config, 'find/upcoming_events?lat=' + lat + '&lon=' + lon + '&radius=100&page=1000&topic_category=' + config.category, (err, res, body) => {
      if (err) {
        resolve([]);
        pino.error(err.message);
        return;
      }

      if (typeof body.errors !== 'undefined') {
        resolve([]);
        pino.error(body.errors[0].message);
        return;
      }

      const events = body.events.map(event => {
        // Bail if event has passed.
        if (event.time < Date.now()) {
          return;
        }

        // Bail if no venue.
        if (typeof event.venue === 'undefined') {
          return;
        }

        // Bail if event country don't match.
        if (event.venue.country.toLowerCase() !== config.country.toLowerCase()) {
          return;
        }

        // Bail if group should be excluded.
        if (exclude.indexOf(event.group.urlname.toLowerCase()) !== -1) {
          return;
        }

        return {
          title: eventTitle(event),
          date: event.time,
          city: city ? city : event.venue.city.replace(/\d+(\s|)\d+/, '').trim(), // remove numbers in city, ex: 111 22 stochkolm.
          link: event.link,
          description: event.description,
          free: !event.member_pay_fee
        };
      }).filter(event => {
        return typeof event === 'object';
      });

      resolve(events);
    });
  });
};

/**
 * Find events from meetup.com api v3.
 *
 * @param  {object} config
 *
 * @return {Promise}
 */
const getEvents = async (config) => {
  if (!config.category || !config.country || !config.cities) {
    pino.error('Missing category, country or cities value');
    return Promise.resolve([]);
  }

  const cities = config.cities;
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

      await sleep(10000);
      next = true;

      const events2 = await getOpenEvents(config, city[0], city[1], city[3]);

      if (events2 instanceof Array) {
        events = events.concat(events2);
      }

      if (i + 1 === cities.length) {
        pino.info('Found ' + events.length + ' events from meetup.com');
        resolve(uniqEvents(events));
        break;
      } else {
        i++;
      }
    }
  });
};

module.exports = getEvents;
