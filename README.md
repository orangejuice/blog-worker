# On New Giscus Comment

![typescript](https://img.shields.io/badge/Typescript-3178c6?logo=typescript&logoColor=fff)
![deploy](https://img.shields.io/github/deployments/orangejuice/on-new-giscus-comment/production?logo=cloudflare-workers&label=Cloudflare%20Worker)

A utility service works alongside the OrangeJuice blog system to provide a variety of features.

## What It Does

### 1. Serve as the API service for `Cloudflare D1` database querying.

This worker serves two API `POST /api/post`<sup>1</sup> and `POST /api/post/{slug}/increment`<sup>2</sup> for 

1. Get metadata (viewCounts) of posts with the request body `{slugs: string[]}`

2. Increment the view count of the post `slug` by 1.

### 2. Integrating Giscus into a customized workflow to facilitate complete support for i18n.

This worker is invoked every time a new `discussion` or `discussion_comment` is created on GitHub. It performs the following actions:

1. Updates the body of the new discussion to include links to the original web page in multiple languages, like this:
   ```
   English: {WEBSITE_URL}/{SLUG}
   中文: {WEBSITE_URL}/zh/{SLUG}
   ```

2. Updates the title of the new discussion to `zh/{slug}` to ensure the discussion thread can be matched by both `{slug}` (English) and `zh/{slug}` (Chinese).

## How to Set Up

1. Integrate Giscus as the commenting system and use `mapping: pathname`.

2. Clone this repository and install the necessary packages, e.g., `bun i`.

3. Create a GitHub App and obtain the `App ID`, `Private Key`, and configure the required settings/permissions:
   ```
   Webhook: Active
   Webhook URL: The URL of the Cloudflare worker
   Discussions: Read and Write
   Subscribe to events: Discussion
   ```

4. Install the GitHub App on your website's repository.

5. Set up Cloudflare worker secrets with the information obtained in the previous steps by running `wrangler secret put [Secret Name]`:
   ```
   GITHUB_APP_ID: string (the App ID)
   GITHUB_PRIVATE_KEY: string (the Private Key)
   GITHUB_REPO: string (the repository name)
   WEBSITE_URL: string (the base URL of the website, e.g., https://example.com)
   ```

6. Deploy the Cloudflare worker `wrangler deploy` manually or setup Github Actions Continuous deploymeny by adding the Cloudflare API Token generated with `Edit Cloudflare Worker` template
   ```
   CLOUDFLARE_API_TOKEN: string (Github environment secrect)
   ```
