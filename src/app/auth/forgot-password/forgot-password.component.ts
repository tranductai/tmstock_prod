import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email = '';
  message = '';
  error = '';

  constructor(private sb: SupabaseService, private router: Router) {}

  async onSubmit() {
    this.message = '';
    this.error = '';
    const { error } = await this.sb.resetPassword(this.email);
    if (error) this.error = error.message;
    else this.message = '✅ Password reset link sent! Check your email.';
  }
}
