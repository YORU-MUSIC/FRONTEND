import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface User { id: number; username: string; email: string; avatar_url?: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiUrl}/auth`;
  user = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('yoru_user');
    if (stored) this.user.set(JSON.parse(stored));
  }

  get token(): string | null { return localStorage.getItem('yoru_token'); }

  register(data: { username: string; email: string; password: string }) {
    return this.http.post<{ token: string; user: User }>(`${this.base}/register`, data)
      .pipe(tap(res => this.saveSession(res.token, res.user)));
  }

  login(data: { email: string; password: string }) {
    return this.http.post<{ token: string; user: User }>(`${this.base}/login`, data)
      .pipe(tap(res => this.saveSession(res.token, res.user)));
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, { email });
  }

  verifyCode(email: string, code: string) {
    return this.http.post<{ valid: boolean }>(`${this.base}/verify-code`, { email, code });
  }

  resetPassword(email: string, code: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${this.base}/reset-password`, { email, code, newPassword });
  }

  me() {
    return this.http.get<{ user: User }>(`${this.base}/me`)
      .pipe(tap(res => this.user.set(res.user)));
  }

  logout() {
    localStorage.removeItem('yoru_token');
    localStorage.removeItem('yoru_user');
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private saveSession(token: string, user: User) {
    localStorage.setItem('yoru_token', token);
    localStorage.setItem('yoru_user', JSON.stringify(user));
    this.user.set(user);
  }
}