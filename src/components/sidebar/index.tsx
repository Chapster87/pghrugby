import { client } from "@/sanity/client"
import { latestContentQuery } from "./_data/content.query"
import MatchBlock from "./_components/matches"
import SidebarPosts from "./_components/posts"
import s from "./sidebar.module.css"

export default async function Sidebar() {
  const latestPosts = await client.fetch(latestContentQuery)
  return (
    <div className={s.sidebar}>
      <MatchBlock />
      <SidebarPosts posts={latestPosts} />
    </div>
  )
}
