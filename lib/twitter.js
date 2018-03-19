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
 *
 * @return {Promise}
 */
const update = (client, event) => {
  return new Promise((resolve, reject) => {
    client.post('statuses/update', {
      status: event.title + ' ' + event.link,
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
  const twitter = new Twitter(config);
  const redis = Redis.createClient();

  redis.on('error', (err) => {
    pino.error(err.message);
  });

  events.forEach((event, i) => {
    tweeted(redis, event).then(exists => {
      // Don't continue.
      if (exists) {
        pino.error('Status is a duplicate');

        if (i + 1 === events.length) {
          redis.quit();
        }

        return;
      }

      update(twitter, event)
        .then(tweet => {
          pino.info('Tweeted: ' + event.title + ' => ' + tweet.url);
          redis.set(event.link, true);

          if (i + 1 === events.length) {
            redis.quit();
          }
        })
        .catch(err => {
          pino.error(err instanceof Array && err.length ? err[0].message : err.message);

          if (i + 1 === events.length) {
            redis.quit();
          }
        });
    }).catch(err => {
      pino.error(err.message);

      if (i + 1 === events.length) {
        redis.quit();
      }
    })
  });
}

module.exports = {
  tweet: tweet
};
