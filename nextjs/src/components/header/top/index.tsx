import { ThemeSwitcher } from "@/components/theme-switcher"
import s from "./style.module.css"

export default function HeaderTop() {
  return (
    <div className={s.headerTop}>
      <div className="container mx-auto flex items-center justify-end px-4">
        <nav>
          <ul className="flex space-x-4">
            <li className="hidden sm:block">
              <ThemeSwitcher />
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
