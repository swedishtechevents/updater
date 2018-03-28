const Twitter = require('twitter');
const Redis = require('redis');
const pino = require('pino')();

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
 * Test if tweet is tweeted.
 *
 * @param {object} redis
 * @param {object} event
 *
 * @return {Promise}
 */
const tweeted = (redis, event) => {
  return new Promise((resolve, reject) => {
    if (!redis) {
      resolve(false);
      return;
    }

    redis.get(event.link, (err, res) => {
      if (err) {
        reject(new Error('Status is a duplicate'));
      } else {
        resolve(res === 'true');
      }
    });
  });
};

/**
 * Create status with events info and custom hashtags.
 *
 * @param  {object} event
 * @param  {object} config
 *
 * @return {string}
 */
const createStatus = (event, config) => {
  let tweetLen = 280;
  let status = event.title.substring(0, 177);
  const city = (typeof event.city === 'string' ? event.city : '').toLowerCase();

  // Add dots to event title if event title is longer than 177 characters.
  if (event.title.length > status.length) {
    status += '...';
  }

  tweetLen -= status.length;

  // Add event link.
  if (typeof event.link === 'string' && event.link.length && tweetLen >= event.link.length + 1) {
    status += ' ' + event.link;
    tweetLen -= event.link.length + 1;
  }

  if (typeof event.free === 'boolean' && event.free === false && tweetLen >= 4) {
    status += ' ($)';
    tweetLen -= 4;
  }

  // Add city as a hashtag.
  if (city.length && tweetLen >= city.length + 2) {
    status += ' #' + city;
    tweetLen -= city.length + 2;
  }

  // Add custom hashtag.
  if (typeof config.hashtag === 'string' && config.hashtag.length && tweetLen >= config.hashtag.length + 2) {
    const hashtag = config.hashtag.replace(/^#/, '');
    status += ' #' + hashtag;
    tweetLen -= hashtag.length + 2;
  }

  // Add custom hashtag for a city.
  if (typeof config.cities === 'object' && typeof config.cities[city] === 'string' && tweetLen >= config.cities[city].length + 1) {
    status += ' ' + config.cities[city];
    tweetLen -= config.cities[city].length + 1;
  }

  return status;
};

/**
 * Tweet a event.
 *
 * @param  {object} client
 * @param  {object} event
 * @param  {object} config
 *
 * @return {Promise}
 */
const update = (client, event, config) => {
  return new Promise((resolve, reject) => {
    client.post('statuses/update', {
      status: createStatus(event, config)
    }, (err, tweet) => {
      if (err) {
        reject(err);
      } else {
        resolve(tweet);
      }
    });
  });
};

/**
 * Tweet a event.
 *
 * @param  {object} config
 * @param  {array}  events
 */
const tweet = (config, events) => {
  const todayTime = +new Date();
  const twitter = new Twitter(config);
  let redis;

  try {
    if (typeof config.redis !== 'boolean') {
      redis = Redis.createClient(config.redis || '');
      redis.on('error', (err) => {
        pino.error(err.message);
      });
      pino.info('redis connected');
    }
  } catch (err) {
    pino.error(err.message);
  }

  events.forEach(async (event, i) => {
    tweeted(redis, event).then(exists => {
      // Don't continue.
      if (exists) {
        pino.error('Status is a duplicate');

        // Quit redis if all events are done and redis connected.
        if (i + 1 === events.length && redis) {
          const seconds = parseInt((event.date - todayTime) / 1000, 10);
          redis.set(event.link, true, 'EX', seconds);
          redis.quit();
        }

        return;
      }

      update(twitter, event, config)
        .then(tweet => {
          pino.info('Tweeted: ' + event.title + ' => ' + tweet.id);

          // Quit redis if all events are done and redis connected.
          if (i + 1 === events.length && redis) {
            const seconds = parseInt((event.date - todayTime) / 1000, 10);
            redis.set(event.link, true, 'EX', seconds);
            redis.quit();
          } else if (redis) {
            const seconds = parseInt((event.date - todayTime) / 1000, 10);
            redis.set(event.link, true, 'EX', seconds);
          }
        })
        .catch(err => {
          pino.error(err instanceof Array && err.length ? err[0].message : err.message);
        });
    }).catch(err => {
      pino.error(err.message);

      // Quit redis if all events are done and redis connected.
      if (i + 1 === events.length && redis) {
        const seconds = parseInt((event.date - todayTime) / 1000, 10);
        redis.set(event.link, true, 'EX', seconds);
        redis.quit();
      }
    });
  });
};

module.exports = {
  tweet: tweet
};
