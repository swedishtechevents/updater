const Twitter = require('twitter');
const Redis = require('redis');
const pino = require('pino')();

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
        reject({
          message: 'Status is a duplicate'
        });
      } else {
        resolve(res === 'true');
      }
    });
  });
};

/**
 * Tweet a event.
 *
 * @param  {object} client
 * @param  {object} event
 * @param  {string} hashtag
 *
 * @return {Promise}
 */
const update = (client, event, hashtag) => {
  return new Promise((resolve, reject) => {
    client.post('statuses/update', {
      status: event.title + ' ' + event.link + ' ' + hashtag,
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
    redis = Redis.createClient(config.redis || '');
    redis.on('error', (err) => {
      pino.error(err.message);
    });
  } catch (err) {
    pino.error(err.message);
  }

  events.forEach((event, i) => {
    tweeted(redis, event).then(exists => {
      // Don't continue.
      if (exists) {
        pino.error('Status is a duplicate');

        // Quit redis if all events are done and redis connected.
        if (i + 1 === events.length && redis) {
          redis.quit();
        }

        return;
      }

      update(twitter, event, config.hashtag)
        .then(tweet => {
          pino.info('Tweeted: ' + event.title + ' => ' + tweet.url);

          if (redis) {
            const seconds = parseInt((event.date - todayTime) / 1000, 10);
            redis.set(event.link, true, 'EX', seconds);
          }

          // Quit redis if all events are done and redis connected.
          if (i + 1 === events.length && redis) {
            redis.quit();
          }
        })
        .catch(err => {
          pino.error(err instanceof Array && err.length ? err[0].message : err.message);

          // Quit redis if all events are done and redis connected.
          if (i + 1 === events.length && redis) {
            redis.quit();
          }
        });
    }).catch(err => {
      pino.error(err.message);

      // Quit redis if all events are done and redis connected.
      if (i + 1 === events.length && redis) {
        redis.quit();
      }
    })
  });
}

module.exports = {
  tweet: tweet
};
