const RSS = require('rss');

/**
 * Create RSS feed.
 *
 * @param  {array} events
 *
 * @return {string}
 */
const createFeed = (events) => {
  const date = new Date();
  const feed = new RSS({
    title: 'title',
    description: 'description',
    feed_url: 'https://swedishtechevents.com/rss.xml',
    site_url: 'https://swedishtechevents.com',
    language: 'en',
    date: date
  });

  events.forEach(event => {
    feed.item({
      title: event.title,
      description: 'Event date: ' + new Date(event.date).toUTCString() + ' ' + event.description,
      url: event.link,
      date: date,
      language: 'en'
    });
  });

  return feed.xml();
};

module.exports = createFeed;
