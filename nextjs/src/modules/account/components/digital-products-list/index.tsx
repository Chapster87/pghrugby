"use client"

import { Table } from "@medusajs/ui"
import { DigitalProduct } from "../../../../types/global"
import { getDigitalMediaDownloadLink } from "@/lib/data/digital-products"

type Props = {
  digitalProducts: DigitalProduct[]
}

export const DigitalProductsList = ({ digitalProducts }: Props) => {
  const handleDownload = async (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    mediaId: string
  ) => {
    e.preventDefault()

    const url = await getDigitalMediaDownloadLink(mediaId)

    window.open(url)
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Name</Table.HeaderCell>
          <Table.HeaderCell>Action</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {digitalProducts.map((digitalProduct) => {
          const medias = digitalProduct.medias?.filter(
            (media) => media.type === "main"
          )
          const showMediaCount = (medias?.length || 0) > 1
          return (
            <Table.Row key={digitalProduct.id}>
              <Table.Cell>{digitalProduct.name}</Table.Cell>
              <Table.Cell>
                <ul>
                  {medias?.map((media, index) => (
                    <li key={media.id}>
                      <a href="#" onClick={(e) => handleDownload(e, media.id)}>
                        Download{showMediaCount ? ` ${index + 1}` : ``}
                      </a>
                    </li>
                  ))}
                </ul>
              </Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table>
  )
}
