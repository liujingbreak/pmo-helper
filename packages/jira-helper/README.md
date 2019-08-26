
### Chrome driver version: 76.0.3809.68
1. First time run:
```bash
drcp run ts/puppeteer.ts#login jira-helper
```
Login from opened Browser.

2. Sync up
```bash
drcp run ts/puppeteer.ts#run jira-helper [--no-headless]
```

<!-- ### Puppeteer

Environment variables:
- PUPPETEER_SKIP_CHROMIUM_DOWNLOAD - do not download bundled Chromium during installation step. -->
<!-- 
### Selenium doc
[https://seleniumhq.github.io/selenium/docs/api/javascript](https://seleniumhq.github.io/selenium/docs/api/javascript)

### Reference

https://developers.google.com/web/updates/2017/04/headless-chrome

```bash
chrome --headless --disable-gpu --dump-dom https://www.chromestatus.com/
``` -->
