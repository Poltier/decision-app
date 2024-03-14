import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {
  constructor(private router: Router) { }

  selectLanguage(language: string) {
    console.log('Idioma seleccionado:', language);
    localStorage.setItem('language', language);
    // Redirigir al dashboard después de seleccionar el idioma
    this.router.navigate(['/dashboard']);
  }
}
