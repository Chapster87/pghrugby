"use server"

import { DigitalProduct } from "../../types/global"
import { sdk } from "../config"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export const getCustomerDigitalProducts = async () => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }
  const { digital_products } = await sdk.client.fetch<{
    digital_products: DigitalProduct[]
  }>(`/store/customers/me/digital-products`, {
    headers,
    next,
    cache: "no-cache",
  })

  return digital_products as DigitalProduct[]
}

export const getDigitalMediaDownloadLink = async (mediaId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }
  const { url } = await sdk.client.fetch<{
    url: string
  }>(`/store/customers/me/digital-products/${mediaId}/download`, {
    method: "POST",
    headers,
    next,
    cache: "no-cache",
  })

  return url
}
