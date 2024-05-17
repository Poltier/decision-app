import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private adminUID = 'V6RbdTAJn1ZWJwfsq8xzwoH8Ygn2'; // UID del administrador

  constructor(private firebaseService: FirebaseService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const currentUser = this.firebaseService.getAuthCurrentUser();
    if (currentUser && currentUser.uid === this.adminUID) {
      return true;
    } else {
      this.router.navigate(['/dashboard']);
      return false;
    }
  }
}
