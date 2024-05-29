import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  loginForm: FormGroup;

  currentSlideIndex = 0;
  slides = [
    {
      image: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/emojis%2Ftalk_emoji.png?alt=media&token=d3c24cfe-5b17-4d74-b928-fb0d296460c4',
      title: '1. TALKING IS BETTER',
      description: 'Invite your friends to a voice call.'
    },
    {
      image: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/emojis%2Ftopic_emoji.png?alt=media&token=72a83c95-ab05-44fc-ae79-efe6fe603de4',
      title: '2. CHOOSE A THEME',
      description: 'Select from a variety of themes.'
    },
    {
      image: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/emojis%2Flink_emoji.png?alt=media&token=e6f592cb-d2eb-414f-bafc-523b2433df6d',
      title: '3. SHARE THE CODE',
      description: 'Easily share the game code.'
    },
    {
      image: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/emojis%2Fconfetti_emoji.png?alt=media&token=c2b4e3fa-4af8-4402-aa75-1a7d30d27380',
      title: '4. HAVE FUN!',
      description: 'Enjoy playing with your friends.'
    }
  ];

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

  ngOnInit(): void {
    setInterval(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
    }, 5000); // Cambia la diapositiva cada 5 segundos
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

