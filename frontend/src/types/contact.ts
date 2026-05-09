export type ContactReason = 'joueur' | 'club' | 'medias' | 'autre'

export interface ContactForm {
  reason: ContactReason
  name: string
  email: string
  phone: string
  subject: string
  message: string
  consent: boolean
}

export type ContactErrors = Partial<Record<keyof ContactForm, string>>

export type ContactStatus = 'success' | 'error' | 'throttled' | null
