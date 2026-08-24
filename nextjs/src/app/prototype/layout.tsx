import styles from "./prototype.module.css"

import "@styles/globals.css"

/**
 * PROTOTYPE — minimal layout for the spike pages, deliberately independent of
 * the site chrome (no Medusa/Sanity/ForgeCMS data dependencies), so the spike
 * runs standalone. Delete together with the wayfinder ticket.
 */
export default function PrototypeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className={styles.banner}>
          PROTOTYPE spike — throwaway code for wayfinder ticket “Prototype: Cart
          to Checkout Session to webhook spike”. Delete after the verdict lands.
        </div>
        <main className={styles.main}>{children}</main>
      </body>
    </html>
  )
}
