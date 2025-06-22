import { ThemeSwitcher } from "@/components/ThemeSwitcher"

export default function HeaderTop() {
  return (
    <div className="flex h-[50px] w-full">
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
