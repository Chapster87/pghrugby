export const homepageQuery = `
  *[_type == "homepage"][0]{
    pageBuilder[] {
      ...,
      _type == "linkGroup" => {
        ...,
        links[] {
          _type,
          text,
          openInNewTab,
          customLink,
          route,
          asButton,
          style,
          reference-> {
            _id, title, slug, _type
          }
        }
      }
    }
  }
`
