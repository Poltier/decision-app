import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(private firebaseService: FirebaseService, private router: Router) {}

  ngOnInit() {
    this.firebaseService.getAuthStatusListener().subscribe(isAuthenticated => {
      if (isAuthenticated && (this.router.url === '/' || this.router.url === '/register' || this.router.url === '/home')) {
        this.router.navigate(['/dashboard']);
      }
    });
  }
}

