const pino = require('pino')();
const got = require('got');

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

module.exports = config => {
  return async (city, cities = {}) => {
    if (!city) {
      return city;
    }

    if (typeof cities[city] === 'string') {
      return cities[city];
    }

    try {
      pino.info('Sleeping...');
      await sleep(5000);

      const q = city.split('-').shift();
      const url = `https://eu1.locationiq.com/v1/search.php?key=${config.token}&q=${encodeURIComponent(q + ',SE')}&format=json&addressdetails=1`;

      const res = await got(url, {
        responseType: 'json'
      });

      if (!Array.isArray(res.body)) {
        throw new Error(`Bad result: ${city}`);
      }

      let newCity = res.body[0].address.city;
      if (!newCity) {
        if (res.body[0].address.state) {
          newCity = res.body[0].address.state.split(' ').shift();
        }

        if (!newCity) {
          throw new Error(`Bad result: ${city}`);
        }
      }

      newCity = newCity.toLowerCase();
      newCity = newCity.charAt(0).toUpperCase() + newCity.slice(1);

      pino.info(`Locationiq: ${city} => ${newCity}`);

      return newCity;
    } catch (e) {
      pino.error(e.message);
      return city;
    }
  };
};
