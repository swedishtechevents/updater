const RSS = require('rss');
const tinydate = require('tinydate');

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
    const eventDate = new Date(event.date);
    const eventTitleDate = tinydate('{YYYY}-{MM}-{DD} {HH}:{mm}');

    feed.item({
      title: `${eventTitleDate(eventDate)} ${event.title}`,
      description: event.description,
      url: event.link,
      language: 'en'
    });
  });

  return feed.xml();
};

module.exports = createFeed;
