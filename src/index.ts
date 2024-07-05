/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {incrementPostViews, notifyGithubUpdate, postMetadata, updateGithub} from "./api"


async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const payload: any = await request.json()
  const githubEvent = request.headers.get("X-GitHub-Event")

  if (url.pathname.startsWith("/api/post") && request.method == "POST") {
    if (url.pathname.endsWith("/increment")) return await incrementPostViews({url, db: env.blog})
    return await postMetadata({slugs: payload.slugs, db: env.blog})
  }

  if (githubEvent == "discussion" && payload.discussion && request.method == "POST") {
    const appId = request.headers.get("x-github-hook-installation-target-id") ?? ""
    if (payload.action == "created") {
      await updateGithub({
        appId, privateKey: env.GITHUB_PRIVATE_KEY, websiteUrl: env.WEBSITE_URL, payload
      })
      await notifyGithubUpdate({url: env.WEBSITE_URL, payload})
    }
    return Response.json("success")
  }

  throw Error("unsupported operation")
}


export default {fetch}
