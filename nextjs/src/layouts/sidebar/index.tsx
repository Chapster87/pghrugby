import Sidebar from "@/components/sidebar"
import contentStyles from "@/styles/content.module.css"

export default function SidebarLayout({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`${contentStyles.mainWithSidebar} ${className || ""}`}>
      <div className={`${contentStyles.primary}`}>{children}</div>
      <Sidebar />
    </div>
  )
}
