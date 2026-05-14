export type CloudinaryUser = {
  type: string
  id: string
}

export type CloudinaryImage = {
  bytes: number
  created_at: string
  created_by: CloudinaryUser
  duration: number | null
  format: string
  width: number
  height: number
  metadata: Record<string, unknown> // Using Record<string, unknown> for flexible metadata
  public_id: string
  id: string
  resource_type: string
  secure_url: string
  tags: string[]
  type: string
  uploaded_by: CloudinaryUser
  url: string
  version: number
}
