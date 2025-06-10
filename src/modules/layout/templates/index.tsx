import React from "react"

import Header from "@/modules/layout/templates/header"
import Footer from "@modules/layout/templates/footer"

const Layout: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <div>
      <Header />
      <main className="relative">{children}</main>
      <Footer />
    </div>
  )
}

export default Layout
