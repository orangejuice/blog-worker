import {drizzle} from "drizzle-orm/d1"
import {posts} from "./schema"
import {eq, or, sql} from "drizzle-orm"
import {graphql} from "@octokit/graphql"
import {importPKCS8, SignJWT} from "jose"

export async function incrementPostViews(url: URL, env: Env) {
  const db = drizzle(env.blog)
  const slug = url.pathname.split("/")[3]
  if (!slug) return Response.json({message: "slug is missing"})
  const data = await db
    .insert(posts)
    .values({slug, view: 1})
    .onConflictDoUpdate({target: posts.slug, set: {view: sql`${posts.view} + 1`}})
    .returning({slug: posts.slug, view: posts.view})
  console.log(new Date().toISOString(), `[view]${url}`, "viewed", data[0].view, "times")
  return Response.json({data})
}

export async function postMetadata(payload: any, env: Env) {
  const db = drizzle(env.blog)
  const slugs = payload.slugs

  if (!Array.isArray(slugs)) return Response.json({message: "`slugs` cannot be empty"}, {status: 400})

  const metadata = await db
    .select({slug: posts.slug, view: posts.view})
    .from(posts)
    .where(or(...slugs.map(slug => eq(posts.slug, slug))))

  let created: {slug: string, view: number}[] = []
  if (metadata.length < slugs.length) {
    const toCreate = new Set(slugs)
    metadata.forEach(({slug}) => toCreate.delete(slug))
    created = await db.insert(posts).values([...toCreate].map(slug => ({slug, view: 0}))).returning({slug: posts.slug, view: posts.view})
  }

  return Response.json({data: metadata.concat(created)})
}


export async function updateGithub(env: Env, payload: any) {
  const discussion = payload.discussion

  const installationIdResponse = await getInstallationId(env.GITHUB_REPO, {appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_PRIVATE_KEY})
  if (!installationIdResponse.ok) {
    const errorText = await installationIdResponse.text()
    throw Error(`${installationIdResponse.status}: ${errorText}`)
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


export async function updateDiscussion(id: string, title: string, {appId, privateKey, installationId, websiteUrl}: {appId: string, privateKey: string, installationId: string, websiteUrl: string}) {
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
