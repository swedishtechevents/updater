const RSS = require('rss');

/**
 * Create RSS feed.
 *
 * @param  {array} events
 *
 * @return {string}
 */
const createFeed = (events, file, extraTitle = '') => {
  extraTitle = extraTitle ? ` ${'(' + extraTitle + ')'}` : '';

  const feed = new RSS({
    title: `Swedish Tech Events${extraTitle}`,
    description: 'Events for developers, technologists, and other geeks in Sweden',
    feed_url: 'https://swedishtechevents.com/' + file,
    site_url: 'https://swedishtechevents.com',
    language: 'en',
    date: new Date(),
  });

  events.forEach(event => {
    feed.item({
      title: `${event.date} ${event.title}`,
      description: event.description,
      url: event.link,
      language: 'en'
    });
  });

  return feed.xml();
};

module.exports = createFeed;
