import { Metadata } from "next"

import NotFoundContent from "@/components/not-found"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

/**
 * 404 for the `(checkout)` group. The chrome comes from `(checkout)/layout.tsx`,
 * so this renders only the body.
 */
export default function NotFound() {
  return <NotFoundContent />
}
