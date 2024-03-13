import { Component } from '@angular/core';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {
  constructor() { }

  onLanguageSelect(event: any) {
    const language = event.target.value;
    // Aquí usar un servicio para cambiar el idioma de la app
    console.log('Idioma seleccionado:', language);
    localStorage.setItem('language', language);
    // this.i18nService.setLanguage(language);
  }
}
