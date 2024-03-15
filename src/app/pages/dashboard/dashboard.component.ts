
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  
  constructor(private router: Router) { }

  goToGame(gameType: string) {
    // Aquí, redireccionar a la ruta del juego basado en el tipo de juego
    // Por ejemplo, si tienes una ruta '/game-tematic' para el juego de temática:
    if (gameType === 'tematic') {
      this.router.navigate(['/game-thematic']);
    }
    // Añade más condiciones para otros juegos
  }
}
