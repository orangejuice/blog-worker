# On New Giscus Comment

![ts](https://badgen.net/badge/-/TypeScript/blue?icon=typescript&label)

A utility cloudflare worker to automate updating the Discussion created by Giscus

**Purpose**: integrating Giscus into a customised workflow to facilitate complete support for i18n.

**What does it do**: it gets invoked everytime a new Discussion is created. It would first

1. Update the new Discussion body to contains the link to the original web page like below, and then
   ```
   English: {WEBSITE_URL}/{SLUG}
   中文: {WEBSITE_URL}/zh/{SLUG}
   ```

2. Update the new Discussion title to `zh/{slug}`, in order for this Discussion thread to be matched by both `{slug}`(En) and `zh/{slug}`(zh)

## How to set up

1. Has Giscus integrated as the commenting system and use `mapping: pathname`

2. clone this repo and install the packages e.g. `bun i`

3. Create a GitHub App and the get `App ID`, `Private key`, and the settings / permissions required are
   ```
   Webhook: Active
   Webhook URL: the URL of the cloudflare worker
   Discussions: Read and Write
   Subscribe to events: Discussion
   ```

4. Install the App on your website's repository `Repo`

5. Set up cloudflare worker secrets with the info we got in the previous steps by running `wrangler secret put [Secret Name]`
   ```
   GITHUB_APP_ID: string (the App ID)
   GITHUB_PRIVATE_KEY: string (the Private key)
   GITHUB_REPO: string (the Repo)
   WEBSITE_URL: string (URL of the basepath of the Website, e.g. https://example.com)
   ```
