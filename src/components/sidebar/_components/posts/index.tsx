import Heading from "@components/typography/heading"
import sidebarStyles from "../../sidebar.module.css"

type SidebarPost = {
  slug: string | null
  title: string | null
}

export default function SidebarPosts({ posts }: { posts: SidebarPost[] }) {
  return (
    <div className={sidebarStyles.widget}>
      <Heading level="h3" className={sidebarStyles.sidebarHeader}>
        Latest Posts
      </Heading>
      <ul className={`light ${sidebarStyles.sidebarList}`}>
        {posts.map((post) => (
          <li key={post.slug}>
            <a href={`/post/${post.slug}`}>{post.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
