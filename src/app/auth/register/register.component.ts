import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Import FormsModule

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  email = '';
  password = '';
  fullName = '';
  avatarUrl = '';
  error = '';
  success = '';
  role = ''

  constructor(private sb: SupabaseService, private router: Router) { }

  async register() {
    this.error = '';
    const { error } = await this.sb.signUp(this.email, this.password, this.role, this.fullName, this.avatarUrl);
    if (error) {
      this.error = error.message;
    } else {
      this.success = 'Đăng ký thành công! Hãy đăng nhập.';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }
}
