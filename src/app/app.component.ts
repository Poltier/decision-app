import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  
  showHeader: boolean = true; // Presupone que el header se mostrará por defecto

  constructor(private router: Router) {
    // Escucha los eventos del router para ajustar la visibilidad del header
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Actualiza showHeader basado en la URL después de las redirecciones
        this.showHeader = !event.urlAfterRedirects.includes('welcome');
      }
    });
  }
}

