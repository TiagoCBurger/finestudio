// Tipos gerados automaticamente pelo Supabase CLI
// Execute: npx supabase gen types typescript --local > lib/database.types.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            project: {
                Row: {
                    id: string
                    name: string
                    transcription_model: string
                    vision_model: string
                    created_at: string
                    updated_at: string | null
                    content: Json | null
                    user_id: string
                    image: string | null
                    members: string[] | null
                }
                Insert: {
                    id?: string
                    name: string
                    transcription_model: string
                    vision_model: string
                    created_at?: string
                    updated_at?: string | null
                    content?: Json | null
                    user_id: string
                    image?: string | null
                    members?: string[] | null
                }
                Update: {
                    id?: string
                    name?: string
                    transcription_model?: string
                    vision_model?: string
                    created_at?: string
                    updated_at?: string | null
                    content?: Json | null
                    user_id?: string
                    image?: string | null
                    members?: string[] | null
                }
            }
            profile: {
                Row: {
                    id: string
                    created_at: string | null
                    updated_at: string | null
                    onboarded_at: string | null
                    credits: number
                    credits_used: number
                }
                Insert: {
                    id: string
                    created_at?: string | null
                    updated_at?: string | null
                    onboarded_at?: string | null
                    credits?: number
                    credits_used?: number
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    onboarded_at?: string | null
                    credits?: number
                    credits_used?: number
                }
            }
            credit_transactions: {
                Row: {
                    id: string
                    user_id: string
                    amount: number
                    type: string
                    model_used: string | null
                    description: string | null
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    amount: number
                    type: string
                    model_used?: string | null
                    description?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    amount?: number
                    type?: string
                    model_used?: string | null
                    description?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
            }
            fal_jobs: {
                Row: {
                    id: string
                    request_id: string
                    user_id: string
                    model_id: string
                    type: string
                    status: string
                    input: Json | null
                    result: Json | null
                    error: string | null
                    created_at: string
                    completed_at: string | null
                }
                Insert: {
                    id?: string
                    request_id: string
                    user_id: string
                    model_id: string
                    type: string
                    status?: string
                    input?: Json | null
                    result?: Json | null
                    error?: string | null
                    created_at?: string
                    completed_at?: string | null
                }
                Update: {
                    id?: string
                    request_id?: string
                    user_id?: string
                    model_id?: string
                    type?: string
                    status?: string
                    input?: Json | null
                    result?: Json | null
                    error?: string | null
                    created_at?: string
                    completed_at?: string | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}