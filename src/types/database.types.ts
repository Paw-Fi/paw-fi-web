export type Database = {
  public: {
    Tables: {
      subscription_cancel_reasons: {
        Row: {
          id: string;
          user_id: string | null;
          reason_id: string;
          reason_label: string;
          detail_text: string | null;
          provider: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          reason_id: string;
          reason_label: string;
          detail_text?: string | null;
          provider?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          reason_id?: string;
          reason_label?: string;
          detail_text?: string | null;
          provider?: string | null;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          is_creator: boolean;
          creator_profile: Record<string, any> | null;
          conversation_ids: string[] | null;
          total_xp: number;
          level: number;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_creator?: boolean;
          creator_profile?: Record<string, any> | null;
          conversation_ids?: string[] | null;
          total_xp?: number;
          level?: number;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_creator?: boolean;
          creator_profile?: Record<string, any> | null;
          conversation_ids?: string[] | null;
          total_xp?: number;
          level?: number;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      homepage_testimonials: {
        Row: {
          id: string;
          name: string;
          quote: string;
          avatar_url: string | null;
          rating: number | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          quote: string;
          avatar_url?: string | null;
          rating?: number | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          quote?: string;
          avatar_url?: string | null;
          rating?: number | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          type: "bug" | "feedback" | "feature_request" | "other";
          status:
            | "open"
            | "in_progress"
            | "waiting_on_user"
            | "resolved"
            | "closed";
          is_resolved: boolean;
          priority: string | null;
          source: string;
          message: string;
          diagnostics: Record<string, any> | null;
          metadata: Record<string, any>;
          app_version: string | null;
          platform: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: "bug" | "feedback" | "feature_request" | "other";
          status?:
            | "open"
            | "in_progress"
            | "waiting_on_user"
            | "resolved"
            | "closed";
          is_resolved?: boolean;
          priority?: string | null;
          source?: string;
          message: string;
          diagnostics?: Record<string, any> | null;
          metadata?: Record<string, any>;
          app_version?: string | null;
          platform?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "bug" | "feedback" | "feature_request" | "other";
          status?:
            | "open"
            | "in_progress"
            | "waiting_on_user"
            | "resolved"
            | "closed";
          is_resolved?: boolean;
          priority?: string | null;
          source?: string;
          message?: string;
          diagnostics?: Record<string, any> | null;
          metadata?: Record<string, any>;
          app_version?: string | null;
          platform?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      support_ticket_attachments: {
        Row: {
          id: string;
          ticket_id: string;
          file_path: string;
          file_url: string | null;
          content_type: string | null;
          file_size_bytes: number | null;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          file_path: string;
          file_url: string | null;
          content_type?: string | null;
          file_size_bytes?: number | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          file_path?: string;
          content_type?: string | null;
          file_size_bytes?: number | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
      };
      download_attribution_sessions: {
        Row: {
          id: string;
          session_id: string;
          visitor_id: string | null;
          source: string | null;
          first_source: string | null;
          last_source: string | null;
          first_landing_url: string | null;
          last_url: string | null;
          first_path: string | null;
          last_path: string | null;
          referrer: string | null;
          referrer_domain: string | null;
          first_query_params: Record<string, any>;
          last_query_params: Record<string, any>;
          all_query_params: Record<string, any>;
          page_view_count: number;
          download_click_count: number;
          downloaded: boolean;
          clicked_platforms: string[];
          ios_clicked_at: string | null;
          android_clicked_at: string | null;
          first_downloaded_at: string | null;
          last_downloaded_at: string | null;
          user_agent: string | null;
          language: string | null;
          timezone: string | null;
          viewport: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          visitor_id?: string | null;
          source?: string | null;
          first_source?: string | null;
          last_source?: string | null;
          first_landing_url?: string | null;
          last_url?: string | null;
          first_path?: string | null;
          last_path?: string | null;
          referrer?: string | null;
          referrer_domain?: string | null;
          first_query_params?: Record<string, any>;
          last_query_params?: Record<string, any>;
          all_query_params?: Record<string, any>;
          page_view_count?: number;
          download_click_count?: number;
          downloaded?: boolean;
          clicked_platforms?: string[];
          ios_clicked_at?: string | null;
          android_clicked_at?: string | null;
          first_downloaded_at?: string | null;
          last_downloaded_at?: string | null;
          user_agent?: string | null;
          language?: string | null;
          timezone?: string | null;
          viewport?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          visitor_id?: string | null;
          source?: string | null;
          first_source?: string | null;
          last_source?: string | null;
          first_landing_url?: string | null;
          last_url?: string | null;
          first_path?: string | null;
          last_path?: string | null;
          referrer?: string | null;
          referrer_domain?: string | null;
          first_query_params?: Record<string, any>;
          last_query_params?: Record<string, any>;
          all_query_params?: Record<string, any>;
          page_view_count?: number;
          download_click_count?: number;
          downloaded?: boolean;
          clicked_platforms?: string[];
          ios_clicked_at?: string | null;
          android_clicked_at?: string | null;
          first_downloaded_at?: string | null;
          last_downloaded_at?: string | null;
          user_agent?: string | null;
          language?: string | null;
          timezone?: string | null;
          viewport?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Add other tables as needed
    };
    Functions: {
      [key: string]: {
        Args: Record<string, any>;
        Returns: any;
      };
      track_download_attribution_session: {
        Args: {
          p_session_id: string;
          p_visitor_id?: string | null;
          p_event_type?: string | null;
          p_platform?: string | null;
          p_source?: string | null;
          p_url?: string | null;
          p_path?: string | null;
          p_referrer?: string | null;
          p_referrer_domain?: string | null;
          p_query_params?: Record<string, any> | null;
          p_user_agent?: string | null;
          p_language?: string | null;
          p_timezone?: string | null;
          p_viewport?: string | null;
        };
        Returns: Record<string, any>;
      };
    };
  };
};
