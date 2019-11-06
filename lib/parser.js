/**
 * Parse GitHub issue to create a JSON object from issue.
 *
 * @param  {object} issue
 *
 * @return {object}
 */
const parser = (issue) => {
  let body = issue.body.split('-->');
  const json = {};

  body = body[body.length - 1];
  body = body.trim().split('\n');

  for (var i = 0, l = body.length; i < l; i++) {
    if (!/^\w+:/.test(body[i])) {
      body[i - 1] += body[i];
      delete body[i];
    }
  }

  body.forEach(row => {
    const parts = row.split(/:(.+)/);
    const key = parts[0];
    json[key.toLowerCase()] = parts.slice(1).join('').trim().replace('http//', 'http://').replace('https//', 'https://');
  });

  if (typeof json.free === 'string') {
    json.free = json.free.toLocaleLowerCase() !== 'false';
  } else {
    json.free = true;
  }

  json.number = issue.number;
  json.date = +new Date(json.date);

  return json;
};

module.exports = parser;
