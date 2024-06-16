import {sqliteTable, text, integer} from "drizzle-orm/sqlite-core"
import {InferSelectModel, sql} from "drizzle-orm"

export const posts = sqliteTable("posts", {
  slug: text("slug").primaryKey(),
  view: integer("view").notNull().default(0),
  last: text("last").notNull().default(sql`CURRENT_TIMESTAMP`)
})

export type PostMetadata = InferSelectModel<typeof posts>
