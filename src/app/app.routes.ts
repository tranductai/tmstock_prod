import { Routes } from '@angular/router';
import { LoginComponent } from '../app/auth/login/login.component'
import { RegisterComponent } from '../app/auth/register/register.component';
import { TradingComponent } from '../app/partial/Trade/trading/trading.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'trading', component: TradingComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
