const program = require('commander');
const octokit = require('@octokit/rest')();
const pino = require('pino')();
const { updater, deleter } = require('./lib/updater');
const github = require('./lib/github');
const meetup = require('./lib/meetup');
const eventbrite = require('./lib/eventbrite-html');
const rss = require('./lib/rss');
const twitter = require('./lib/twitter');
const ical = require('./lib/ical');
const locationiq = require('./lib/locationiq');
const { fixEventsData, uniqEvents } = require('./lib/events');
const cities = require('./data/cities');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

const slug = s => {
  s = s.replace(/[*+~.()'"!:@_]/g, '-');
  return slugify(s, {
    lower: true
  });
};

// Create program.
program
  .version('1.0.0')
  .option('-c, --config [config]', 'Config file', './config.json')
  .option('-e, --eventbrite', 'Enable Eventbrite')
  .option('-m, --meetup', 'Enable Meetup')
  .option('-u, --update', 'Enable update of api')
  .option('-t, --twitter', 'Enable Twitter')
  .option('-i, --ical', 'Enable ical')
  .option('-r, --rss', 'Enable rss')
  .parse(process.argv);

// Bail if no config file.
if (!program.config) {
  pino.error('Missing config path');
  process.exit(1);
}

// Load configuration.
const config = require(program.config);

// Authenticate against GitHub api.
octokit.authenticate(config.github.authentication);

(async () => {
  let events = await github(octokit, config.github);

  if (!(events instanceof Array)) {
    events = [];
  }

  // Fetch meetup events.
  if (program.meetup) {
    const eventsMeetup = await meetup(config.meetup);
    if (eventsMeetup instanceof Array) {
      events = events.concat(eventsMeetup);
    }
  }

  // Fetch eventbrite events.
  if (program.eventbrite) {
    const eventsEventbrite = await eventbrite(config.eventbrite);
    if (eventsEventbrite instanceof Array) {
      events = events.concat(eventsEventbrite);
    }
  }

  // Sort events by date.
  events = events.sort((a, b) => {
    return a.date - b.date;
  });

  // Remove undefined events.
  events = events.filter(event => {
    return typeof event === 'object';
  });

  // Limit events description length to 280.
  events = events.map(event => {
    let description = (event.description || '').substring(0, 280);

    if ((event.description || '').length > 280) {
      description += '...';
    }

    event.description = description.trim();

    return event;
  });

  events = uniqEvents(events);
  events = fixEventsData(events);

  // Use a better city name for events.
  const skipCities = config.meetup.cities.map(p => p[2]);
  const findCity = locationiq(config.locationiq);

  for (let i = 0, l = events.length; i < l; i++) {
    const event = events[i];
    let newCity = event.city;

    if (skipCities.indexOf(event.city) === -1) {
      newCity = await findCity(event.city, cities);
    }

    if (typeof cities[event.city] !== 'string' && newCity) {
      cities[event.city] = newCity;
    }

    events[i].city = newCity;
  }

  fs.writeFileSync(path.join(__dirname, 'data', 'cities.json'), JSON.stringify(cities, null, 2));

  // Update events file.
  if (program.update) {
    await updater(octokit, config.github, config.github.files.events, events);
  }

  // Update ical file.
  if (program.ical) {
    await updater(octokit, config.github, config.github.files.ical, ical(events));
  }

  // Update rss file.
  if (program.rss) {
    await updater(octokit, config.github, config.github.files.rss, rss(events, config.github.files.rss));

    const citiesArr = Object.values(cities).filter((value, index, self) => self.indexOf(value) === index);
    for (let i = 0, l = citiesArr.length; i < l; i++) {
      const city = citiesArr[i];
      const cityFile = `feeds/${slug(city.toLowerCase())}.xml`;
      const cityEvents = events.filter(e => e.city.toLowerCase() === city.toLowerCase());
      if (cityEvents.length) {
        await updater(octokit, config.github, cityFile, rss(cityEvents, cityFile, city));
      } else {
        await deleter(octokit, config.github, cityFile);
      }
    }
  }

  // Tweet events.
  if (program.twitter) {
    twitter.tweet(config.twitter, events);
  }
})();
