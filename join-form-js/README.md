# README

This directory defines the join form script, which is hosted as a static JavaScript file on Cloudflare Pages.

To test the script, work in a new branch and run:

```
npm run start
```

Then head to [http://localhost:8000/](http://localhost:8000/) to test a local version of the form.

Once your changes are tested locally, check with Stephen to modify Webflow staging site. When changes are confirmed there, check the code into main by running:

```
gh pr create
```

Get approval, merge your changes back to `main` locally, and then run:

```
npm run deploy
```
