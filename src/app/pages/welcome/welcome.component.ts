import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
      
    });
  }

  onLogin() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.firebaseService.signIn(email, password)
        .then(() => this.router.navigate(['/dashboard']))
        .catch(error => this.snackBar.open('Error durante el login: ' + (error.message || 'Por favor, intenta nuevamente.'), 'Cerrar', { duration: 5000 }));
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  continueAsGuest() {
    this.router.navigate(['/dashboard']);
  }

  selectLanguage(language: string) {
    console.log('Idioma seleccionado:', language);
    localStorage.setItem('language', language);
  }
}

