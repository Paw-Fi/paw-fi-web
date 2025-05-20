export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          is_creator: boolean
          creator_profile: Record<string, any> | null
          conversation_ids: string[] | null
          total_xp: number
          level: number
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          is_creator?: boolean
          creator_profile?: Record<string, any> | null
          conversation_ids?: string[] | null
          total_xp?: number
          level?: number
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          is_creator?: boolean
          creator_profile?: Record<string, any> | null
          conversation_ids?: string[] | null
          total_xp?: number
          level?: number
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
  }
}
