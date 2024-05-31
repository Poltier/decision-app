import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  showAuthSection: boolean = false;
  isAdmin: boolean = false;
  private authListenerSubs: Subscription | undefined;
  private adminUID: string = 'V6RbdTAJn1ZWJwfsq8xzwoH8Ygn2'; // UID del administrador

  constructor(private firebaseService: FirebaseService, private router: Router) { }

  ngOnInit() {
    this.authListenerSubs = this.firebaseService.getAuthStatusListener().subscribe(isAuthenticated => {
      this.showAuthSection = isAuthenticated;
      if (isAuthenticated) {
        const currentUser = this.firebaseService.getAuthCurrentUser();
        if (currentUser && currentUser.uid === this.adminUID) {
          this.isAdmin = true;
        } else {
          this.isAdmin = false;
        }
      }
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
}


