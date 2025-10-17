import { Component, OnDestroy, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  profile: any;
  isLogin: boolean = false;
  subVar: Subscription;
  constructor(private sb: SupabaseService, private router: Router) {
    this.subVar = this.sb.isLoginCheck.subscribe(async (data) => {
      if (data) {
        this.sb.isLogin = true;
        this.isLogin = this.sb.isLogin;
        const user = await this.sb.getCurrentUser();
        if (user) {
          this.profile = await this.sb.getProfile(user.id);
          console.log('this.profile', this.profile)
        }
      }
    })
  }

  ngOnDestroy(): void {
    if (this.subVar) {
      this.subVar.unsubscribe();
    }
  }

  async ngOnInit() {
   
  }

  async logout() {
    let logOut = await this.sb.signOut();
    if (logOut) {
      this.sb.isLogin = false;
      this.isLogin = false;
      this.profile = {}
    }
    this.router.navigate(['/login']);
  }
}
