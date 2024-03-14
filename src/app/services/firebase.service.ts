import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app = initializeApp(environment.firebaseConfig);
  private auth = getAuth(this.app);
  private authStatus = new BehaviorSubject<boolean>(false); // Añadido para manejar el estado de autenticación

  constructor(private router: Router) {
    onAuthStateChanged(this.auth, user => {
      this.authStatus.next(!!user);
    });
  }

  getAuthStatusListener() {
    return this.authStatus.asObservable();
  }

  // Nuevo método para verificar la autenticación de forma síncrona
  isAuthenticated(): boolean {
    return this.auth.currentUser != null;
  }

  async signIn(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error al iniciar sesión: ', error);
    }
  }

  async signUp(email: string, password: string) {
    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error al registrar usuario: ', error);
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión: ', error);
    }
  }
}
