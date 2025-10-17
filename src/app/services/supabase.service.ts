import { EventEmitter, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    isLoginCheck: EventEmitter<any> = new EventEmitter();
    isLogin: boolean = false;
    private supabase: SupabaseClient;
    bodyUpdateSummary = {
        updated_buy_quantity: 0,
        updated_buy_amount: 0,
        updated_sell_quantity: 0,
        updated_sell_amount: 0
    };
    constructor() {
        this.supabase = createClient(
            'https://icjxmcnnuibkpejmmphk.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljanhtY25udWlia3Blam1tcGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzc1NTksImV4cCI6MjA3NTUxMzU1OX0.JI3idIzNNL02jH4qtEO1lbu0kqBFyGHF3mgc5mkFB9w'
        );
    }

    // ✅ Auth
    async signIn(email: string, password: string) {
        return this.supabase.auth.signInWithPassword({ email, password });
    }

    async signUp(email: string, password: string, role: string, fullName: string, avatarUrl?: string) {
        return this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: avatarUrl ?? '',
                    role: role
                }
            }
        });
    }

    async signOut() {
        return this.supabase.auth.signOut();
    }

    async getCurrentUser() {
        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }

    // === ORDERS ===
    async getOrders() {
        return await this.supabase.from('orders').select('*').order('created_at', { ascending: false });
    }

    async addCall(order: any, table: any) {
        return this.supabase.from(table).insert(order);
    }

    async deleteCall(id: string, table: any) {
        const { error } = await this.supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async updateCall(id: string, updates: any, table: any) {
        const { data, error } = await this.supabase
            .from(table)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return data;
    }

    async removeChannel(chanel: any){
        this.supabase.removeChannel(chanel);
    }

    listenOrders(callback: (payload: any) => void) {
        this.supabase
            .channel('orders-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
            .subscribe();
    }
    // === PROFILE ===
    async getProfile(userId: string) {
        const { data, error } = await this.supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) throw error;
        return data;
    }

    //== SUMMARY ===
    async getSummary() {
        return this.supabase.from('summary').select('*').order('created_at', { ascending: false });
    }
    listenSummary(callback: (payload: any) => void) {
        this.supabase
            .channel('summary-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'summary' }, callback)
            .subscribe();
    }
    // async addSummary(item: any) {
    //     return this.supabase.from('summary').insert(item)
    // }

    // async deleteSummary(id: string) {
    //     const { error } = await this.supabase
    //         .from('orders')
    //         .delete()
    //         .eq('id', id);

    //     if (error) throw error;
    // }

    // async updateSummary(item: any){
        
    // }
}
