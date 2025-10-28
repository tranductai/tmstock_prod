import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '..//../services/supabase.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
    templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  newPassword = '';
  message = '';
  error = '';

  constructor(private sb: SupabaseService, private router: Router) {}

  async onSubmit() {
    this.message = '';
    this.error = '';
    const { error } = await this.sb.updatePassword(this.newPassword);
    if (error) this.error = error.message;
    else {
      this.message = '✅ Password updated successfully!';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }
}
