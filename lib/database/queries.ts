import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

// Type helpers
type Tables = Database['public']['Tables'];
type Project = Tables['project']['Row'];
type ProjectInsert = Tables['project']['Insert'];
type ProjectUpdate = Tables['project']['Update'];

type Profile = Tables['profile']['Row'];
type ProfileInsert = Tables['profile']['Insert'];
type ProfileUpdate = Tables['profile']['Update'];

type CreditTransaction = Tables['credit_transactions']['Row'];
type CreditTransactionInsert = Tables['credit_transactions']['Insert'];

type FalJob = Tables['fal_jobs']['Row'];
type FalJobInsert = Tables['fal_jobs']['Insert'];
type FalJobUpdate = Tables['fal_jobs']['Update'];

// Project queries
export const projectQueries = {
    // Get all projects for a user
    async getByUserId(userId: string): Promise<Project[]> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('project')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get single project
    async getById(id: string): Promise<Project | null> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('project')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        return data;
    },

    // Create project
    async create(project: ProjectInsert): Promise<Project> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('project')
            .insert(project)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update project
    async update(id: string, updates: ProjectUpdate): Promise<Project> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('project')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete project
    async delete(id: string): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase
            .from('project')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// Profile queries
export const profileQueries = {
    // Get profile by ID
    async getById(id: string): Promise<Profile | null> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('profile')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    // Create or update profile
    async upsert(profile: ProfileInsert): Promise<Profile> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('profile')
            .upsert(profile)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update credits
    async updateCredits(id: string, credits: number, creditsUsed: number): Promise<Profile> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('profile')
            .update({
                credits,
                credits_used: creditsUsed,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// Credit transaction queries
export const creditTransactionQueries = {
    // Get transactions for user
    async getByUserId(userId: string, limit = 50): Promise<CreditTransaction[]> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    // Create transaction
    async create(transaction: CreditTransactionInsert): Promise<CreditTransaction> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('credit_transactions')
            .insert(transaction)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// Fal job queries
export const falJobQueries = {
    // Get job by request ID
    async getByRequestId(requestId: string): Promise<FalJob | null> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('fal_jobs')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    // Get jobs by user
    async getByUserId(userId: string, status?: string): Promise<FalJob[]> {
        const supabase = createClient();
        let query = supabase
            .from('fal_jobs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Create job
    async create(job: FalJobInsert): Promise<FalJob> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('fal_jobs')
            .insert(job)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update job
    async update(id: string, updates: FalJobUpdate): Promise<FalJob> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('fal_jobs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update job by request ID
    async updateByRequestId(requestId: string, updates: FalJobUpdate): Promise<FalJob> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('fal_jobs')
            .update(updates)
            .eq('request_id', requestId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// Export types for use in other files
export type {
    Project,
    ProjectInsert,
    ProjectUpdate,
    Profile,
    ProfileInsert,
    ProfileUpdate,
    CreditTransaction,
    CreditTransactionInsert,
    FalJob,
    FalJobInsert,
    FalJobUpdate
};