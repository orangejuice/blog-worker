import {drizzle} from "drizzle-orm/d1"
import {posts} from "./schema"
import {eq, or, sql} from "drizzle-orm"
import {graphql} from "@octokit/graphql"

export async function incrementPostViews({url, db: blog}: {url: URL, db: Env["blog"]}) {
  const db = drizzle(blog)
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

export async function postMetadata({slugs, db: blog}: {slugs: string[]; db: D1Database}) {
  const db = drizzle(blog)

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


export async function updateGithub({appId, privateKey, websiteUrl, payload: {discussion, installation: {id: installationId}}}: {appId: string; privateKey: string; websiteUrl: string; payload: any}) {
  try {
    const id = discussion.node_id
    const title = discussion.title
    const {createAppAuth} = await import("@octokit/auth-app")
    const auth = createAppAuth({appId, privateKey, installationId})
    const graphqlWithAuth = graphql.defaults({request: {hook: auth.hook}})

    await graphqlWithAuth(`
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
  } catch (error) {
    console.error(error)
    throw (error)
  }

  return new Response("Success!", {status: 200})
}


export async function notifyGithubUpdate({url, payload}: {url: string, payload: any}) {
  const slug = payload.discussion.title.slice(2)
  return await fetch(url.concat("/api/event"), {
    method: "POST",
    body: JSON.stringify({slug})
  })
}
