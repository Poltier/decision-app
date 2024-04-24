import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showHeader = true;

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showHeader = !(
          event.url === '/' || 
          event.url === '/register' || 
          event.url === '/home' || 
          event.url.startsWith('/lobby') || 
          event.url.startsWith('/game-thematic') || 
          event.url.startsWith('/game-room')
        );
      }
    });
  }
}