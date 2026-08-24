export const socialsQuery = `
  query socialsQuery {
    socialSettings {
      socialSiteName
      twitterHandle
      twitterUrl
      twitterCardType
      facebookUrl
      instagramUrl
      linkedinUrl
      youtubeUrl
      tiktokUrl
      socialCard {
        id
        url
      }
      ogType
      ogLocale
    }
  }
`
