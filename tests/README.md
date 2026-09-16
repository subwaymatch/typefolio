# Tests

These are development tools. **The template itself has no dependencies** and
needs no build step: `css/`, `js/`, `fonts/`, `images/` and the HTML files are
the whole product. Nothing in here ships to a visitor.

```sh
npm install
npx playwright install chromium
npm test
```

`npm test` starts a static server, then runs:

| Check | What it covers |
| --- | --- |
| `markup` | Tag balance, broken local links, duplicate ids, missing image dimensions |
| `a11y` | axe-core over every page, two viewports, light and dark. Must be zero |
| `behavior` | Menu, keyboard dropdowns, slider controls, sticky sidebar |
| `render` | Every page at eight widths in both themes: console errors, failed requests, horizontal overflow |

Run one at a time with `npm run test:a11y`, and so on. Each expects a server
already running on port 8099; `npm test` handles that for you.
