# On New Giscus Comment

![ts](https://badgen.net/badge/-/TypeScript/blue?icon=typescript&label)

A utility Cloudflare worker to automate updating Discussions created by Giscus.

**Purpose**: Integrating Giscus into a customized workflow to facilitate complete support for i18n.

## What It Does

This worker is invoked every time a new discussion is created. It performs the following actions:

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

6. Deploy the Cloudflare worker `wrangler deploy` 
