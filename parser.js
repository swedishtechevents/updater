/**
 * Parse GitHub issue to create a JSON object from issue.
 *
 * @param  {object} issue
 *
 * @return {object}
 */
const parser = (issue) => {
  let body = issue.body.split('\n');
  let json = {};

  body.forEach(row => {
    const parts = row.split(/\:(.+)/);
    const key = parts[0];
    json[key.toLowerCase()] = parts.slice(1).join('').trim();
  });

  json.number = issue.number;

  return json;
};

module.exports = parser;
