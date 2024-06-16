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
import {invokeRevalidate, postClick, postMetadata, updateGithub} from "./api"


async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const payload: any = await request.json()
  const githubEvent = request.headers.get("X-GitHub-Event")

  if (url.pathname.startsWith("/api/post") && request.method == "POST") {
    if (url.pathname.startsWith("/api/post-click") && request.method == "POST") {
      return await postClick(url, env)
    }
    return await postMetadata(payload, env)
  }

  if (githubEvent == "discussion" || githubEvent == "discussion_comment") {
    void invokeRevalidate(env)
  }

  if (githubEvent == "discussion" && payload.discussion && request.method == "POST" && payload.action == "created") {
    return await updateGithub(request, env, payload)
  }

  return Response.json({message: "ok"})
}


export default {fetch}
