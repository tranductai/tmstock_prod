import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';
  eye_icon = 'assets/images/eye.svg'
  constructor(private sb: SupabaseService, private router: Router) { }

  async login() {
    if (this.email != '' && this.password != '') {
      const { error } = await this.sb.signIn(this.email, this.password);
      if (error) {
        alert('Please enter correct Email and Password!')
        this.sb.isLogin = false;
      } else {
        const user = await this.sb.getCurrentUser();
        if (user) {
          const profile = await this.sb.getProfile(user.id);
          localStorage.setItem('user', JSON.stringify({ ...user, profile }));
        }
        this.sb.isLogin = true;
        this.router.navigate(['/trading']);
      }
    } else if (this.email == '' && this.password == '') {
      alert('Please enter Email and Password!')
    } else if(this.email == '') {
      alert('Please enter Email!')
    }else{
      alert('Please enter Password!')
    }
  }
}
