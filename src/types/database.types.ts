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
      homepage_testimonials: {
        Row: {
          id: string
          name: string
          quote: string
          avatar_url: string | null
          rating: number | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          quote: string
          avatar_url?: string | null
          rating?: number | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          quote?: string
          avatar_url?: string | null
          rating?: number | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          type: 'bug' | 'feedback' | 'feature_request' | 'other'
          status: 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed'
          is_resolved: boolean
          priority: string | null
          source: string
          message: string
          diagnostics: Record<string, any> | null
          metadata: Record<string, any>
          app_version: string | null
          platform: string | null
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: 'bug' | 'feedback' | 'feature_request' | 'other'
          status?: 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed'
          is_resolved?: boolean
          priority?: string | null
          source?: string
          message: string
          diagnostics?: Record<string, any> | null
          metadata?: Record<string, any>
          app_version?: string | null
          platform?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'bug' | 'feedback' | 'feature_request' | 'other'
          status?: 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed'
          is_resolved?: boolean
          priority?: string | null
          source?: string
          message?: string
          diagnostics?: Record<string, any> | null
          metadata?: Record<string, any>
          app_version?: string | null
          platform?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      support_ticket_attachments: {
        Row: {
          id: string
          ticket_id: string
          file_path: string
          file_url: string | null
          content_type: string | null
          file_size_bytes: number | null
          width: number | null
          height: number | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          file_path: string
          file_url: string | null
          content_type?: string | null
          file_size_bytes?: number | null
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          file_path?: string
          content_type?: string | null
          file_size_bytes?: number | null
          width?: number | null
          height?: number | null
          created_at?: string
        }
      }
      // Add other tables as needed
    }
  }
}
