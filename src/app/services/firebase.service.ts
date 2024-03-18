import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, updatePassword, updateEmail } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app = initializeApp(environment.firebaseConfig);
  private auth = getAuth(this.app);
  private storage = getStorage(this.app);
  private authStatus = new BehaviorSubject<boolean>(false);

  constructor(private router: Router) {
    onAuthStateChanged(this.auth, user => {
      this.authStatus.next(!!user);
    });
  }

  //Autenticación / Registro / Login

  getAuthStatusListener() {
    return this.authStatus.asObservable();
  }

  isAuthenticated(): boolean {
    return this.auth.currentUser != null;
  }

  async signIn(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error al iniciar sesión: ', error);
      throw error;
    }
  }

  async signUp(email: string, password: string) {
    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error al registrar usuario: ', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión: ', error);
      throw error;
    }
  }

  //Profile
  
  async updateProfileData(displayName: string | null, photoURL: string | null) {
    if (this.auth.currentUser) {
      await updateProfile(this.auth.currentUser, { displayName, photoURL });
    }
  }

  async updateUserProfile(displayName: string, photoURL: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await updateProfile(user, { displayName, photoURL });
    }
  }

  async updateUserEmail(newEmail: string) {
    if (this.auth.currentUser) {
      await updateEmail(this.auth.currentUser, newEmail);
    }
  }

  async updateUserPassword(newPassword: string) {
    if (this.auth.currentUser) {
      await updatePassword(this.auth.currentUser, newPassword);
    }
  }

  getAvatars(): Promise<string[]> {
    const avatarsRef = ref(this.storage, 'avatars/');
    return listAll(avatarsRef).then((listResult) => {
      const promises = listResult.items.map((itemRef) => getDownloadURL(itemRef));
      return Promise.all(promises);
    });
  }

  updateUserAvatar(photoURL: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return updateProfile(user, { photoURL });
  }
}
