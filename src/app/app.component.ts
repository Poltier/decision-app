import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  showHeader = true;

  constructor(private firebaseService: FirebaseService, private router: Router) {
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

  ngOnInit() {
    this.firebaseService.getAuthStatusListener().subscribe(isAuthenticated => {
      if (isAuthenticated && (this.router.url === '/' || this.router.url === '/register' || this.router.url === '/home')) {
        this.router.navigate(['/dashboard']);
      }
    });
  }
}
