export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          attributes: Json
          business_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          channel: string
          code: string
          created_at: string
          created_by: string
          currency: string
          customer_id: string
          customer_note: string | null
          deposit_required_minor: number | null
          ends_at: string
          id: string
          owner_note: string | null
          party_size: number
          price_minor: number
          quantity: number
          reminder_1h_at: string | null
          reminder_24h_at: string | null
          resource_id: string
          service_id: string
          slot: unknown
          starts_at: string
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          business_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          channel?: string
          code?: string
          created_at?: string
          created_by?: string
          currency?: string
          customer_id: string
          customer_note?: string | null
          deposit_required_minor?: number | null
          ends_at: string
          id?: string
          owner_note?: string | null
          party_size?: number
          price_minor: number
          quantity?: number
          reminder_1h_at?: string | null
          reminder_24h_at?: string | null
          resource_id: string
          service_id: string
          slot?: unknown
          starts_at: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          business_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          channel?: string
          code?: string
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string
          customer_note?: string | null
          deposit_required_minor?: number | null
          ends_at?: string
          id?: string
          owner_note?: string | null
          party_size?: number
          price_minor?: number
          quantity?: number
          reminder_1h_at?: string | null
          reminder_24h_at?: string | null
          resource_id?: string
          service_id?: string
          slot?: unknown
          starts_at?: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          ai_instructions: string | null
          attributes: Json
          business_type: string
          category: string
          clerk_user_id: string | null
          created_at: string
          default_currency: string
          hours: Json
          id: string
          khqr_account_id: string | null
          khqr_merchant_city: string | null
          khqr_merchant_name: string | null
          locale: string
          name: string
          owner_user_id: string | null
          parse_model: string | null
          parsed_at: string | null
          phone: string | null
          plan: string
          province: string | null
          quota_txn_month: number
          raw_description: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_instructions?: string | null
          attributes?: Json
          business_type?: string
          category?: string
          clerk_user_id?: string | null
          created_at?: string
          default_currency?: string
          hours?: Json
          id?: string
          khqr_account_id?: string | null
          khqr_merchant_city?: string | null
          khqr_merchant_name?: string | null
          locale?: string
          name: string
          owner_user_id?: string | null
          parse_model?: string | null
          parsed_at?: string | null
          phone?: string | null
          plan?: string
          province?: string | null
          quota_txn_month?: number
          raw_description?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_instructions?: string | null
          attributes?: Json
          business_type?: string
          category?: string
          clerk_user_id?: string | null
          created_at?: string
          default_currency?: string
          hours?: Json
          id?: string
          khqr_account_id?: string | null
          khqr_merchant_city?: string | null
          khqr_merchant_name?: string | null
          locale?: string
          name?: string
          owner_user_id?: string | null
          parse_model?: string | null
          parsed_at?: string | null
          phone?: string | null
          plan?: string
          province?: string | null
          quota_txn_month?: number
          raw_description?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      channel_connections: {
        Row: {
          business_id: string
          channel: string
          connected_at: string | null
          display_name: string | null
          external_id: string | null
          id: string
          last_error: string | null
          secret_ref: string | null
          status: string
          token_ciphertext: string | null
          webhook_secret: string | null
        }
        Insert: {
          business_id: string
          channel: string
          connected_at?: string | null
          display_name?: string | null
          external_id?: string | null
          id?: string
          last_error?: string | null
          secret_ref?: string | null
          status?: string
          token_ciphertext?: string | null
          webhook_secret?: string | null
        }
        Update: {
          business_id?: string
          channel?: string
          connected_at?: string | null
          display_name?: string | null
          external_id?: string | null
          id?: string
          last_error?: string | null
          secret_ref?: string | null
          status?: string
          token_ciphertext?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "channel_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "channel_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      closures: {
        Row: {
          business_id: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          business_id: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          business_id?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          channel: string
          created_at: string
          customer_id: string
          id: string
          last_message_at: string
          needs_owner_reason: string | null
          status: string
        }
        Insert: {
          business_id: string
          channel: string
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string
          needs_owner_reason?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          channel?: string
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string
          needs_owner_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_identities: {
        Row: {
          channel: string
          created_at: string
          customer_id: string
          external_id: string
          id: string
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id: string
          external_id: string
          id?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string
          external_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_identities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string
          display_name: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          locale: string | null
          no_show_count: number
          notes: string | null
          phone: string | null
        }
        Insert: {
          business_id: string
          display_name?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          locale?: string | null
          no_show_count?: number
          notes?: string | null
          phone?: string | null
        }
        Update: {
          business_id?: string
          display_name?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          locale?: string | null
          no_show_count?: number
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      events: {
        Row: {
          action: string
          actor: string
          actor_label: string | null
          after: Json | null
          before: Json | null
          business_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
        }
        Insert: {
          action: string
          actor: string
          actor_label?: string | null
          after?: Json | null
          before?: Json | null
          business_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
        }
        Update: {
          action?: string
          actor?: string
          actor_label?: string | null
          after?: Json | null
          before?: Json | null
          business_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      invoices: {
        Row: {
          booking_id: string | null
          business_id: string
          currency: string
          id: string
          issued_at: string
          number: number
          order_id: string | null
          total_minor: number
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          currency?: string
          id?: string
          issued_at?: string
          number: number
          order_id?: string | null
          total_minor: number
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          currency?: string
          id?: string
          issued_at?: string
          number?: number
          order_id?: string | null
          total_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_url: string | null
          body: string
          booking_id: string | null
          business_id: string
          conversation_id: string
          cost_micro_usd: number | null
          created_at: string
          id: number
          lang: string | null
          payment_id: string | null
          role: string
          tokens_in: number | null
          tokens_out: number | null
          tool_calls: Json | null
          transcribed_by: string | null
        }
        Insert: {
          audio_url?: string | null
          body: string
          booking_id?: string | null
          business_id: string
          conversation_id: string
          cost_micro_usd?: number | null
          created_at?: string
          id?: number
          lang?: string | null
          payment_id?: string | null
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
          transcribed_by?: string | null
        }
        Update: {
          audio_url?: string | null
          body?: string
          booking_id?: string | null
          business_id?: string
          conversation_id?: string
          cost_micro_usd?: number | null
          created_at?: string
          id?: number
          lang?: string | null
          payment_id?: string | null
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
          transcribed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total_minor: number
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price_minor: number
        }
        Insert: {
          id?: string
          line_total_minor: number
          name: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price_minor: number
        }
        Update: {
          id?: string
          line_total_minor?: number
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string
          channel: string
          code: string
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          note: string | null
          status: string
          total_minor: number
          updated_at: string
        }
        Insert: {
          business_id: string
          channel?: string
          code?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          note?: string | null
          status?: string
          total_minor?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          channel?: string
          code?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          note?: string | null
          status?: string
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          id: number
          payment_id: string
          raw: Json | null
          source: string
          status_reported: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          payment_id: string
          raw?: Json | null
          source: string
          status_reported?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          payment_id?: string
          raw?: Json | null
          source?: string
          status_reported?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          booking_id: string | null
          business_id: string
          check_count: number
          created_at: string
          currency: string
          customer_id: string | null
          expires_at: string | null
          id: string
          idempotency_key: string
          kind: string
          last_checked_at: string | null
          paid_at: string | null
          provider: string
          provider_account: string | null
          provider_ref: string | null
          provider_txn_id: string | null
          qr_payload: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          booking_id?: string | null
          business_id: string
          check_count?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key: string
          kind?: string
          last_checked_at?: string | null
          paid_at?: string | null
          provider?: string
          provider_account?: string | null
          provider_ref?: string | null
          provider_txn_id?: string | null
          qr_payload?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          booking_id?: string | null
          business_id?: string
          check_count?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          kind?: string
          last_checked_at?: string | null
          paid_at?: string | null
          provider?: string
          provider_account?: string | null
          provider_ref?: string | null
          provider_txn_id?: string | null
          qr_payload?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          business_id: string
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          name_en: string | null
          photo_alt: string | null
          photo_path: string | null
          price_minor: number
          sort_order: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          name_en?: string | null
          photo_alt?: string | null
          photo_path?: string | null
          price_minor: number
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          name_en?: string | null
          photo_alt?: string | null
          photo_path?: string | null
          price_minor?: number
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      resource_services: {
        Row: {
          resource_id: string
          service_id: string
        }
        Insert: {
          resource_id: string
          service_id: string
        }
        Update: {
          resource_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_services_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          active: boolean
          attributes: Json
          business_id: string
          created_at: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          active?: boolean
          attributes?: Json
          business_id: string
          created_at?: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          active?: boolean
          attributes?: Json
          business_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "resources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "resources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          attributes: Json
          buffer_min: number
          business_id: string
          capacity: number
          created_at: string
          currency: string
          deposit_minor: number | null
          description: string | null
          duration_min: number
          id: string
          name: string
          name_en: string | null
          price_minor: number
          requires_deposit: boolean
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          attributes?: Json
          buffer_min?: number
          business_id: string
          capacity?: number
          created_at?: string
          currency?: string
          deposit_minor?: number | null
          description?: string | null
          duration_min?: number
          id?: string
          name: string
          name_en?: string | null
          price_minor: number
          requires_deposit?: boolean
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          attributes?: Json
          buffer_min?: number
          business_id?: string
          capacity?: number
          created_at?: string
          currency?: string
          deposit_minor?: number | null
          description?: string | null
          duration_min?: number
          id?: string
          name?: string
          name_en?: string | null
          price_minor?: number
          requires_deposit?: boolean
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      storefronts: {
        Row: {
          created_at: string
          draft: Json | null
          generated_by: string | null
          id: string
          published: Json | null
          published_at: string | null
          seed: number
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft?: Json | null
          generated_by?: string | null
          id: string
          published?: Json | null
          published_at?: string | null
          seed?: number
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft?: Json | null
          generated_by?: string | null
          id?: string
          published?: Json | null
          published_at?: string | null
          seed?: number
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefronts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefronts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "storefronts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "storefronts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      waitlist: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          converted_business_id: string | null
          created_at: string
          email: string
          id: string
          locale: string
          note: string | null
          source: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          converted_business_id?: string | null
          created_at?: string
          email: string
          id?: string
          locale?: string
          note?: string | null
          source?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          converted_business_id?: string | null
          created_at?: string
          email?: string
          id?: string
          locale?: string
          note?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_converted_business_id_fkey"
            columns: ["converted_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_converted_business_id_fkey"
            columns: ["converted_business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "waitlist_converted_business_id_fkey"
            columns: ["converted_business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "waitlist_converted_business_id_fkey"
            columns: ["converted_business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          business_id: string | null
          channel: string
          connection_id: string | null
          error: string | null
          external_event_id: string | null
          id: number
          payload: Json
          processed_at: string | null
          received_at: string
          status: string
        }
        Insert: {
          business_id?: string | null
          channel: string
          connection_id?: string | null
          error?: string | null
          external_event_id?: string | null
          id?: number
          payload: Json
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          business_id?: string | null
          channel?: string
          connection_id?: string | null
          error?: string | null
          external_event_id?: string | null
          id?: number
          payload?: Json
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_agent_business: {
        Row: {
          address: string | null
          business_id: string | null
          business_type: string | null
          category: string | null
          default_currency: string | null
          hours: Json | null
          locale: string | null
          name: string | null
          phone: string | null
          resources: Json | null
          services: Json | null
          slug: string | null
          timezone: string | null
          upcoming_closures: Json | null
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          business_type?: string | null
          category?: string | null
          default_currency?: string | null
          hours?: Json | null
          locale?: string | null
          name?: string | null
          phone?: string | null
          resources?: never
          services?: never
          slug?: string | null
          timezone?: string | null
          upcoming_closures?: never
        }
        Update: {
          address?: string | null
          business_id?: string | null
          business_type?: string | null
          category?: string | null
          default_currency?: string | null
          hours?: Json | null
          locale?: string | null
          name?: string | null
          phone?: string | null
          resources?: never
          services?: never
          slug?: string | null
          timezone?: string | null
          upcoming_closures?: never
        }
        Relationships: []
      }
      v_bookings_agent: {
        Row: {
          balance_minor: number | null
          business_id: string | null
          channel: string | null
          code: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_name: string | null
          customer_note: string | null
          customer_phone: string | null
          ends_at: string | null
          id: string | null
          no_show_count: number | null
          owner_note: string | null
          paid_minor: number | null
          party_size: number | null
          price_minor: number | null
          quantity: number | null
          resource_kind: string | null
          resource_name: string | null
          service_name: string | null
          service_name_en: string | null
          starts_at: string | null
          status: string | null
          unit: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_agent_business"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_month_usage"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_catalog: {
        Row: {
          active: boolean | null
          business_id: string | null
          category: string | null
          currency: string | null
          description: string | null
          duration_min: number | null
          id: string | null
          kind: string | null
          name: string | null
          name_en: string | null
          photo_alt: string | null
          photo_path: string | null
          price_minor: number | null
          sort_order: number | null
          stock: number | null
          unit: string | null
        }
        Relationships: []
      }
      v_month_stats: {
        Row: {
          booked_revenue_minor: number | null
          business_id: string | null
          collected_minor: number | null
          completed: number | null
          currency: string | null
          month: string | null
          no_shows: number | null
          upcoming: number | null
        }
        Relationships: []
      }
      v_month_usage: {
        Row: {
          ai_spend_micro_usd: number | null
          business_id: string | null
          conversations_this_month: number | null
          plan: string | null
          quota_txn_month: number | null
          txn_left: number | null
          txn_used: number | null
        }
        Relationships: []
      }
      v_schema_doc: {
        Row: {
          column_comment: string | null
          column_name: unknown
          data_type: string | null
          table_comment: string | null
          table_name: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
