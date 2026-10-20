import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent],
  templateUrl: './reset-password.page.html',
})
export class ResetPasswordPage {
  email = '';
  code = '';
  newPassword = '';
  confirm = '';
  step: 'code' | 'password' = 'code';
  loading = false;
  error = '';
  info = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  verify() {
    if (!this.email || this.code.length !== 6) {
      this.error = 'Introduce el código de 6 dígitos'; return;
    }
    this.loading = true; this.error = '';

    this.auth.verifyCode(this.email, this.code).subscribe({
      next: () => {
        this.step = 'password';
        this.info = 'Código verificado. Introduce tu nueva contraseña.';
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Código inválido';
        this.loading = false;
      }
    });
  }

  reset() {
    if (this.newPassword.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres'; return;
    }
    if (this.newPassword !== this.confirm) {
      this.error = 'Las contraseñas no coinciden'; return;
    }
    this.loading = true; this.error = '';

    this.auth.resetPassword(this.email, this.code, this.newPassword).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.error = err.error?.error || 'No se pudo cambiar la contraseña';
        this.loading = false;
      }
    });
  }
}