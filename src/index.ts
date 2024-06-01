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
    const payload = await request.json()
    validateRequest(request, payload)

    const discussion = (payload as any).discussion

    try {
      const installationIdResponse = await getInstallationId(env.GITHUB_REPO, {appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_PRIVATE_KEY})
      if (!installationIdResponse.ok) {
        const errorText = await installationIdResponse.text()
        console.error(errorText)
        return new Response(`Failed: ${errorText}`, {status: installationIdResponse.status})
      }

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

    return new Response("Discussion title processed", {status: 200})
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
**中文**: ${title.startsWith("zh/") ? websiteUrl.concat("/", title) : title.concat("/zh/", title)}
`
  })
}

const validateRequest = (request: Request, payload: any): Response | void => {
  if (request.method !== "POST") {
    return new Response("Only POST requests are accepted", {status: 405})
  }

  const contentType = request.headers.get("content-type")
  if (!contentType || contentType !== "application/json") {
    return new Response("Invalid content type", {status: 400})
  }

  const githubEvent = request.headers.get("X-GitHub-Event")
  if (githubEvent !== "discussion" || payload.action !== "created") {
    return new Response("Event not handled", {status: 200})
  }
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

export default handler