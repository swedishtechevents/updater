const RSS = require('rss');

/**
 * Create RSS feed.
 *
 * @param  {array} events
 *
 * @return {string}
 */
const createFeed = events => {
  const feed = new RSS({
    title: 'Swedish Tech Events',
    description: 'Events for developers, technologists, and other geeks in Sweden',
    feed_url: 'https://swedishtechevents.com/rss.xml',
    site_url: 'https://swedishtechevents.com',
    language: 'en',
    date: new Date(),
  });

  events.forEach(event => {
    feed.item({
      title: event.title,
      description: 'Event date: ' + new Date(event.date).toUTCString() + ' ' + event.description,
      url: event.link,
      language: 'en'
    });
  });

  return feed.xml();
};

module.exports = createFeed;
