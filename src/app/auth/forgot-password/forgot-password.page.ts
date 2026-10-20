import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent],
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPage {
  email = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.email) { this.error = 'Introduce tu email'; return; }
    this.loading = true; this.error = '';

    this.auth.forgotPassword(this.email).subscribe({
      next: () => this.router.navigate(['/reset-password'], { queryParams: { email: this.email } }),
      error: (err) => {
        this.error = err.error?.error || 'No se pudo enviar el código';
        this.loading = false;
      }
    });
  }
}