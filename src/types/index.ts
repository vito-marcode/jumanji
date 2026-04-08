export interface Session {
  id: string
  code: string
  created_at: string
}

export interface Collection {
  id: string
  session_id: string
  name: string
  created_at: string
  options?: Option[]
}

export interface Option {
  id: string
  collection_id: string
  text: string
  position: number
  created_at: string
}

export interface DisplayMessage {
  id: string
  session_id: string
  text: string
  sent_at: string
}
