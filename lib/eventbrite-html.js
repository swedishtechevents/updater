const got = require('got');
const cheerio = require('cheerio');
const pino = require('pino')();

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

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
 * Fetch events from eventbrite html page.
 *
 * @param {string} url
 * @param {string} qs
 *
 * @return
 */
const fetch = async (url, qs = '') => {
  try {
    pino.info('Requesting ' + url + qs);
    const response = await got(url + qs);
    const $ = cheerio.load(response.body);
    const next = $('link[rel=next]').attr('href');
    const events = [];
    const $list = $('.search-main-content__events-list > li');
    const year = (new Date).getFullYear();
    let dateTomorrow = new Date();
    dateTomorrow.setDate(dateTomorrow.getDate() + 1);

    $list.each(function () {
      const $this = $(this);
      const title = $this.find('.eds-media-card-content__title .eds-is-hidden-accessible').text();
      const date = $this.find('.eds-media-card-content__primary-content > div').first().text();
      const link = $this.find('.eds-media-card-content__action-link').attr('href');
      const free = $this.find('.eds-media-card-content__sub-content > div').last().text().trim().toLowerCase() === 'free';
      const city = $this.find('.card-text--truncated__one').text().split(' • ').pop();

      // fix some dates.
      const tomorrowString = monthNames[dateTomorrow.getMonth()] + ' ' + dateTomorrow.getDay();
      const rightDate = date.replace('Tomorrow at', tomorrowString) + ' ' + year;

      events.push({
        title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
        date: Date.parse(rightDate),
        link: link.split('?')[0],
        city: city,
        description: 'Read more about this event at Eventbrite',
        free: free,
      });
    });

    if (next) {
     await sleep(10000);
     return events.concat(await fetch(url, next));
    }

    return events;
  } catch(error) {
    pino.error(error);
    return [];
  }
}

/**
 * Get events from eventbrite.com.
 *
 * @param  {object} config
 *
 * @return {Promise}
 */
module.exports = config => {
  return new Promise(resolve => {
    fetch(config.url).then(events => {
      events = events.filter(event => {
        if (isNaN(event.date)) {
          return false;
        }

        if (config.exclude instanceof Array && config.exclude.indexOf(event.link.split('?')[0]) !== -1) {
          return false;
        }

        return true;
      });
      pino.info('Found ' + events.length + ' events from eventbrite.com');
      resolve(events);
    });
  });
};
