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
import {graphql} from "@octokit/graphql"
import {importPKCS8, SignJWT} from "jose"

export interface Env {
  GITHUB_APP_ID: string
  GITHUB_PRIVATE_KEY: string
  GITHUB_REPO: string
  WEBSITE_URL: string
}

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return new Response("ok", {status: 200})
    const payload: any = await request.json()

    if (payload.discussion || payload.discussion_comment) {
      void revalidateRequest(env.WEBSITE_URL)
      if (payload.discussion_comment) {
        return new Response("Success!", {status: 200})
      }
    }

    const githubEvent = request.headers.get("X-GitHub-Event")
    if (githubEvent !== "discussion" || payload.action !== "created") {
      return new Response("Event not handled", {status: 200})
    }

    const discussion = payload.discussion

    const installationIdResponse = await getInstallationId(env.GITHUB_REPO, {appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_PRIVATE_KEY})
    if (!installationIdResponse.ok) {
      const errorText = await installationIdResponse.text()
      console.error(errorText)
      return new Response(`Failed: ${errorText}`, {status: installationIdResponse.status})
    }

    try {
      const installationId = String((await installationIdResponse.json() as {id: number}).id)
      await updateDiscussion(discussion.node_id, discussion.title, {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_PRIVATE_KEY,
        websiteUrl: env.WEBSITE_URL,
        installationId
      })
    } catch (error) {
      console.error(error)
      throw (error)
    }

    return new Response("Success!", {status: 200})
  }
}

async function updateDiscussion(id: string, title: string, {appId, privateKey, installationId, websiteUrl}: {appId: string, privateKey: string, installationId: string, websiteUrl: string}) {
  const {createAppAuth} = await import("@octokit/auth-app")
  const auth = createAppAuth({appId, privateKey, installationId})
  const graphqlWithAuth = graphql.defaults({request: {hook: auth.hook}})

  return await graphqlWithAuth(`
    mutation UpdateDiscussion($id: ID!, $title: String!, $newBody: String!)  {
      updateDiscussion(input: {discussionId: $id, title: $title, body: $newBody}) {
        discussion {
          id
          title
          body
        }
      }
    }`, {
    id,
    title: title.startsWith("zh/") ? title : "zh/".concat(title),
    newBody: `
**English**: ${title.startsWith("zh/") ? websiteUrl.concat(title.slice(2)) : websiteUrl.concat("/", title)}
**中文**: ${title.startsWith("zh/") ? websiteUrl.concat("/", title) : websiteUrl.concat("/zh/", title)}
`
  })
}

export const getInstallationId = async (repo: string, {appId, privateKey}: {appId: string, privateKey: string}) => {
  const now = Math.floor(Date.now() / 1000)
  const token = await new SignJWT()
    .setProtectedHeader({alg: "RS256"})
    .setIssuedAt(now)
    .setIssuer(appId)
    .setExpirationTime(now + 600)
    .sign(await importPKCS8(privateKey.replaceAll("\\n", "\n"), "RS256"))

  const url = `https://api.github.com/repos/${repo}/installation`

  return await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "node-fetch",
      Accept: "application/vnd.github.v3+json"
    }
  })
}

async function revalidateRequest(url: string) {
  console.log(new Date().toISOString(), "[cache]send revalidate message to", `${url}/api/revalidate`)
  return await fetch(`${url}/api/revalidate`, {method: "POST"})
}

export default handler
