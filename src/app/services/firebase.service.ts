import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, updatePassword, updateEmail, sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, getFirestore, deleteDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';


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

  getAuthCurrentUser() {
    return this.auth.currentUser;
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
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const avatars = await this.getAvatars();
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
      if (userCredential.user) {
        await updateProfile(userCredential.user, { photoURL: randomAvatar });
      }
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
  
  async updateUserProfile( photoURL: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await updateProfile(user, { photoURL });
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

  async reauthenticateAndChangeEmail(currentEmail: string, currentPassword: string, newEmail: string): Promise<void> {
    const user = this.getAuthCurrentUser();
    if (!user) throw new Error('User not authenticated');
  
    // Reautenticación
    const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
    await reauthenticateWithCredential(user, credential);
  
    // Cambio de email
    await updateEmail(user, newEmail);
  }
  
  async sendPasswordResetEmail(email: string): Promise<void> {
    await firebaseSendPasswordResetEmail(this.auth, email);
  }

  // Función para formatear fechas
  public formatDate(date: Date): string {
    const pad = (num: number) => (num < 10 ? `0${num}` : num);
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  //Add questions

  async submitQuestion(questionData: any): Promise<void> {
  const db = getFirestore(this.app);
  const questionsRef = collection(db, 'questions');
  await addDoc(questionsRef, {
    ...questionData,
    approved: false,
    createdAt: new Date()
  });
  }
  
  async getPendingQuestions(): Promise<any[]> {
    const db = getFirestore(this.app);
    const q = query(collection(db, 'questions'), where('approved', '==', false));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: this.formatDate(doc.data()['createdAt'].toDate()),
    }));
  }

  async approveQuestion(questionId: string): Promise<void> {
  const db = getFirestore(this.app);
  const questionRef = doc(db, 'questions', questionId);
  await updateDoc(questionRef, {
    approved: true
  });
  }

  getCurrentUserId(): string {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }
  

  async getUserQuestions(userId: string): Promise<any[]> {
    const db = getFirestore(this.app);
    const q = query(collection(db, "questions"), where("submittedBy", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateQuestion(questionId: string, questionData: any): Promise<void> {
    const db = getFirestore(this.app);
    const questionRef = doc(db, 'questions', questionId);
    await updateDoc(questionRef, questionData);
  }

  async rejectQuestion(questionId: string): Promise<void> {
    const db = getFirestore(this.app);
    const questionRef = doc(db, 'questions', questionId);
    await deleteDoc(questionRef);
  }

  async getApprovedQuestions(): Promise<any[]> {
    const db = getFirestore(this.app);
    const q = query(collection(db, 'questions'), where('approved', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: this.formatDate(doc.data()['createdAt'].toDate()),
    }));
  }
  
  
}
