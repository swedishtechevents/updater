# Updater

The update cli for [swedishtechevents.com](https://swedishtechevents.com) events list. The issues content has to use this format: `key: value`

Example:

```
Title: Test event
City: Stockholm
Description: The best event
Date: 2018-01-01 19:00:00
Link: http://example.com
Keywords: Example
```

## Usage

Copy `config.json.example` to `config.json` and modify the content. Then run

```
node index.js
```

and it will fetch issues from a repository, parse the content and update the file on the specified repository.

## License

MIT © [Fredrik Forsmo](https://github.com/frozzare)
