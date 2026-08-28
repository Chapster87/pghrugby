import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-[30px] leading-[48px] font-semibold">
        Page not found
      </h1>
      <p>The page you tried to access does not exist.</p>
      <Link href="/">Go to frontpage</Link>
    </div>
  )
}
