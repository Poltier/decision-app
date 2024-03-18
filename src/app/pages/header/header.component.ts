import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  showAuthSection: boolean = false;
  private authListenerSubs: Subscription | undefined;

  constructor(private firebaseService: FirebaseService, private router: Router) { }

  ngOnInit() {
    this.authListenerSubs = this.firebaseService.getAuthStatusListener().subscribe(isAuthenticated => {
      this.showAuthSection = isAuthenticated;
    });
  }

  ngOnDestroy() {
    if (this.authListenerSubs) {
      this.authListenerSubs.unsubscribe();
    }
  }
  

  logout() {
    this.firebaseService.signOut();
  }

  // Añade aquí los métodos de navegación si es necesario
}

