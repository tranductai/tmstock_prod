import { EventEmitter, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    isLoginCheck: EventEmitter<any> = new EventEmitter();
    isLogin: boolean = false;
    private supabase: SupabaseClient;
    private resetPass_Url = environment.ResetPass_url;
    bodyUpdatePortfolio = {
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
    async getOrders(page: any, pageSize: any) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, count, error } = await this.supabase.from('orders').select('*').order('created_at', { ascending: false }).range(from, to);
        if(error) throw error;
        return {data, count}
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

    //RESET PASSWORD
    async resetPassword(email: string) {
        return await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: this.resetPass_Url + `/reset-password` // Trang app bạn sẽ xử lý reset
        });
    }

    //UPDATE PASSWORD
    async updatePassword(newPassword: string) {
        return await this.supabase.auth.updateUser({ password: newPassword });
    }

    async removeChannel(chanel: any) {
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

    //== portfolio ===
    async getPortfolio() {
        return this.supabase.from('portfolio').select('*').order('created_at', { ascending: false });
    }

    listenPortfolio(callback: (payload: any) => void) {
        this.supabase
            .channel('portfolio-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio' }, callback)
            .subscribe();
    }

     //== CASH FLOW ===
    async getCashFlow() {
        return this.supabase.from('cash_flow').select('*').order('created_at', { ascending: false });
    }
  
    listenCashFlow(callback: (payload: any) => void) {
        this.supabase
            .channel('cash-Flow-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_flow' }, callback)
            .subscribe();
    }

    //==Summary ===
     //== CASH FLOW ===
    async getSummaries() {
        return this.supabase.from('summary').select('*').order('created_at', { ascending: false });
    }

    listenSummary(callback: (payload: any) => void) {
        this.supabase
            .channel('summary-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'summary' }, callback)
            .subscribe();
    }
    // async addPortfolio(item: any) {
    //     return this.supabase.from('portfolio').insert(item)
    // }

    // async deletePortfolio(id: string) {
    //     const { error } = await this.supabase
    //         .from('orders')
    //         .delete()
    //         .eq('id', id);

    //     if (error) throw error;
    // }

    // async updatePortfolio(item: any){
        
    // }
}
