# @thumbsup/theme-classic with tagging support

Theme for thumbsup with tagging support based on theme-classic.

*Note:* this project is in early development stage.

---

## Usage

* Install [thumbsup](https://thumbsup.github.io/)
* Clone [thumsup-tagger-server](https://github.com/Peter-Sh/thumbsup-tagger-server)
* Clone this repo
* Start server

Prepare a config file config.js.
For example:

```
{
	"input": "/path/to/dir/with/photos",
	"output": "/path/to/output/album",
	"albums-from": ["Yearly/{YYYY}", "%path", "file://../path/to/thumbsup-tagger-server/tag.js"],
	"theme-path": "/path/to/thumbsup-classic-tag"
}
```

Run album generation
```bash
./node_modules/thumbsup/bin/thumbsup.js --config test.json
```

