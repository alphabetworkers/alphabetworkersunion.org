# Alphabet Union Site

This is the statically generated front-end code for the Alphabet Union website.  It uses [Hugo][1] to generate static HTML pages.  To run or build the site, you must [install Hugo][2].

# Setup

1. Install [NVM][4] if you haven't already.
2. Run `nvm install` to install the correct version of NodeJS
3. Run `npm i` to install the project dependencies

# Usage

To serve the site locally for development, run the start command:

```bash
$ npm start
```

# Infrastructure

While this site is designed to be deployable anywhere that can serve static files, it is currently deployed to AWS S3.  The stack is as follows:

- Github
  - Actions
    - Check
      - Runs on any pull request
    - TODO([#245](https://github.com/alphabetworkers/website/issues/245)) Publish
- AWS
  - Route53
    - alphabetworkersunion.org
      - `A`/`AAAA` Aliased to awu-website Cloudfront distribution.
      - `MX` records pointing to fastmail.com mail servers
      - `A` avatars. pointing to avatar maker tool
    - Other domains (including www)
      - `A`/`AAAA` Aliased to awu-redirect Cloudfront distribution.
  - Cloudfront
    - Website distribution
      - Redirect to HTTPS
      - Terminate SSL with matching ACM certificate
      - Configured with awu-website bucket "website" endpoint URL as origin.
    - Redirect distribution
      - Redirect to HTTPS
      - Terminate SSL with matching ACM certificate
      - Configured with awu-redirect bucket "website" point URL as origin.
  - S3
    - awu-website bucket
      - Contains static Hugo-generated site files
      - All ACLs set to public
      - Website server feature enabled
      - Configured to respond to directory requests with `index.html`
    - awu-redirect bucket
      - Website server feature enabled
      - All requests are redirected to https://alphabetworkersunion.org

# Contributing

See [CONTRIBUTING.md][3] for instructions.

[1]: https://gohugo.io/
[2]: https://gohugo.io/getting-started/installing/
[3]: ../CONTRIBUTING.md
[4]: https://github.com/nvm-sh/nvm#install--update-script
