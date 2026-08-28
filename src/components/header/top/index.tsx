import { ThemeSwitcher } from "@/components/theme-switcher"
import s from "./style.module.css"

export default function HeaderTop() {
  return (
    <div className={s.headerTop}>
      <div className={s.container}>
        <nav>
          <ul className={s.navList}>
            <li className={s.navItemSmHidden}>
              <ThemeSwitcher />
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
