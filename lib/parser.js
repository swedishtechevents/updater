/**
 * Parse GitHub issue to create a JSON object from issue.
 *
 * @param  {object} issue
 *
 * @return {object}
 */
const parser = (issue) => {
  let body = issue.body.split('\-\-\>');
  let json = {};

  body = body[body.length-1];
  body = body.trim().split('\n');

  body.forEach(row => {
    const parts = row.split(/\:(.+)/);
    const key = parts[0];
    json[key.toLowerCase()] = parts.slice(1).join('').trim();
  });

  json.number = issue.number;
  json.date = +new Date(json.date);

  return json;
};

module.exports = parser;
