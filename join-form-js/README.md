# README

This directory defines the join form script, which is hosted as a static JavaScript file on Cloudflare Pages.

To test the script, work in a new branch and run:

```
wrangler pages deploy .assets
```

You should then test the script by modifying the Webflow staging site. When changes are confirmed, check the code into main by running:

```
gh pr create
```

Get approval, merge your changes back to `main` locally, and then run:

```
wrangler pages deploy .assets
```
