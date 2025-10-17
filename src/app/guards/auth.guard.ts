import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  let sb = inject(SupabaseService);
  const router = inject(Router);
  const user = await sb.getCurrentUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }else{
    sb.isLoginCheck.emit(true)
  }
  return true;
};
