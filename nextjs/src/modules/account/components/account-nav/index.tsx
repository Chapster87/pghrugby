"use client"

import { ArrowRightOnRectangle, Photo } from "@medusajs/icons"
import { useParams, usePathname } from "next/navigation"
import clsx from "clsx"

import ChevronDown from "@modules/common/icons/chevron-down"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import User from "@modules/common/icons/user"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { signout } from "@lib/data/customer"

import s from "./style.module.css"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <div className={s.navContainer}>
      <div className={s.mobileNav} data-testid="mobile-account-nav">
        {route !== `/${countryCode}/account` ? (
          <LocalizedClientLink
            href="/account"
            className={s.mobileMainLink}
            data-testid="account-main-link"
          >
            <>
              <ChevronDown className="transform rotate-90" />
              <span>Account</span>
            </>
          </LocalizedClientLink>
        ) : (
          <>
            <div className={s.mobileWelcome}>
              <Heading level="h2">Hello {customer?.first_name}</Heading>
            </div>
            <div>
              <ul className={s.mobileList}>
                <li>
                  <LocalizedClientLink
                    href="/account/profile"
                    className={s.mobileListItemLink}
                    data-testid="profile-link"
                  >
                    <>
                      <div className={s.mobileListItemContent}>
                        <User size={20} />
                        <Text variant="span">Profile</Text>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/addresses"
                    className={s.mobileListItemLink}
                    data-testid="addresses-link"
                  >
                    <>
                      <div className={s.mobileListItemContent}>
                        <MapPin size={20} />
                        <Text variant="span">Addresses</Text>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/orders"
                    className={s.mobileListItemLink}
                    data-testid="orders-link"
                  >
                    <div className={s.mobileListItemContent}>
                      <Package size={20} />
                      <Text variant="span">Orders</Text>
                    </div>
                    <ChevronDown className="transform -rotate-90" />
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/digital-products"
                    className={s.mobileListItemLink}
                    data-testid="digital-products-link"
                  >
                    <div className={s.mobileListItemContent}>
                      <Photo />
                      <Text variant="span">Digital Products</Text>
                    </div>
                    <ChevronDown className="transform -rotate-90" />
                  </LocalizedClientLink>
                </li>
                <li>
                  <button
                    type="button"
                    className={s.mobileLogoutButton}
                    onClick={handleLogout}
                    data-testid="logout-button"
                  >
                    <div className={s.mobileListItemContent}>
                      <ArrowRightOnRectangle />
                      <Text variant="span">Log out</Text>
                    </div>
                    <ChevronDown className="transform -rotate-90" />
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
      <div className={s.desktopNav} data-testid="account-nav">
        <div>
          <div className={s.desktopTitle}>
            <Heading level="h3">Account</Heading>
          </div>
          <div>
            <ul className={s.desktopList}>
              <li>
                <AccountNavLink
                  href="/account"
                  route={route!}
                  data-testid="overview-link"
                >
                  Overview
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/profile"
                  route={route!}
                  data-testid="profile-link"
                >
                  Profile
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/addresses"
                  route={route!}
                  data-testid="addresses-link"
                >
                  Addresses
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/orders"
                  route={route!}
                  data-testid="orders-link"
                >
                  Orders
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/digital-products"
                  route={route!}
                  data-testid="digital-products-link"
                >
                  Digital Products
                </AccountNavLink>
              </li>
              <li className={s.logoutContainer}>
                <button
                  type="button"
                  className={s.logoutButton}
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  Log out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

type AccountNavLinkProps = {
  href: string
  route: string
  children: React.ReactNode
  "data-testid"?: string
}

const AccountNavLink = ({
  href,
  route,
  children,
  "data-testid": dataTestId,
}: AccountNavLinkProps) => {
  const { countryCode }: { countryCode: string } = useParams()

  const active = route.split(countryCode)[1] === href
  return (
    <LocalizedClientLink
      href={href}
      className={clsx(s.navLink, {
        [s.navLinkActive]: active,
      })}
      data-testid={dataTestId}
    >
      {children}
    </LocalizedClientLink>
  )
}

export default AccountNav
