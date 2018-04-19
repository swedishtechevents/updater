const ical = require('ical-generator');
const base64 = require('js-base64').Base64;
const pino = require('pino')();

module.exports = events => {
  events = events.map(event => {
    return {
      start: new Date(event.date),
      timestamp: new Date(),
      summary: event.title,
      url: event.link
    };
  });

  return ical({
    domain: 'swedishtechevents.com',
    prodid: '//swedishtechevents.com//EN',
    events: events
  }).toString();
};
