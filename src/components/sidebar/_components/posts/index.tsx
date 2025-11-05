import Heading from "@components/typography/heading"
import sidebarStyles from "../../sidebar.module.css"

export default function SidebarPosts({ posts }: { posts: any[] }) {
  return (
    <div className={sidebarStyles.widget}>
      <Heading level="h3" className={sidebarStyles.sidebarHeader}>
        Latest Posts
      </Heading>
      <ul className={sidebarStyles.sidebarList}>
        {posts.map((post) => (
          <li key={post._id}>
            <a href={`/post/${post.slug.current}`}>{post.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
