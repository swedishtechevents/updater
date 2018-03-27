# Updater

CLI to update [swedishtechevents.com](https://swedishtechevents.com) events list. The issues content has to use this format: `key: value`

Example:

```
Title: Test event
Description: The best event
City: Stockholm
Date: 2018-01-01 19:00:00
Link: http://example.com
```

The updater also support:

- [meetup.com](https://www.meetup.com/meetup_api/)
- [eventbrite.com](https://www.eventbrite.com/developer/)

## Usage

Copy `config.json.example` to `config.json` and modify the content. Then run

```
node index.js
```

and it will fetch issues from a repository, parse the content and update the file on the specified repository.

Example output:

```
{"level":30,"time":1520275235349,"msg":"Updating events","pid":45300,"hostname":"hostname.lan","v":1}
{"level":30,"time":1520275237592,"msg":"Created file api/events.json","pid":45300,"hostname":"hostname.lan","v":1}
```

## Docker

```
docker build . -t updater
docker run --name updater-redis -d redis redis-server --appendonly yes
docker run --rm --link updater-redis:redis updater --twitter
```

Redis url `redis://redis:6379`

## License

MIT © [Fredrik Forsmo](https://github.com/frozzare)
