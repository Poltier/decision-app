import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: any;
  private analytics: any;
  private auth: any;

  constructor(private router: Router) {
    // Initialize Firebase with environment config
    this.app = initializeApp(environment.firebaseConfig);
    this.analytics = getAnalytics(this.app);
    this.auth = getAuth(this.app);
  }

  async signIn(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Usuario inició sesión con éxito');
      this.router.navigate(['/dashboard']); // Navega al dashboard
    } catch (error) {
      console.error('Error al iniciar sesión: ', error);
    }
  }

  async signUp(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('Usuario registrado con éxito', userCredential);
      // El usuario ya está logueado en este punto, redirigimos al dashboard
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error al registrar usuario: ', error);
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      console.log('Sesión cerrada con éxito');
      this.router.navigate(['/login']); // Navega al login
    } catch (error) {
      console.error('Error al cerrar sesión: ', error);
    }
  }

  isAuthenticated(): Promise<boolean> {
    return new Promise(resolve => {
      onAuthStateChanged(this.auth, user => {
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }
}
