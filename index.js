const program = require('commander');
const octokit = require('@octokit/rest')();
const pino = require('pino')();
const updater = require('./lib/updater');
const github = require('./lib/github');
const meetup = require('./lib/meetup');
const eventbrite = require('./lib/eventbrite');
const rss = require('./lib/rss');
const twitter = require('./lib/twitter');
const ical = require('./lib/ical');
const { fixEventsData, uniqEvents } = require('./lib/events');

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

  // Update events file.
  if (program.update) {
    updater(octokit, config.github, config.github.files.events, events);
  }

  // Update ical file.
  if (program.ical) {
    updater(octokit, config.github, config.github.files.ical, ical(events));
  }

  // Update rss file.
  if (program.rss) {
    updater(octokit, config.github, config.github.files.rss, rss(events));
  }

  // Tweet events.
  if (program.twitter) {
    twitter.tweet(config.twitter, events);
  }
})();
