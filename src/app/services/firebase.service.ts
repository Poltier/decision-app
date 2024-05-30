import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { addDoc, collection, getFirestore, deleteDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app = initializeApp(environment.firebaseConfig);
  private auth = getAuth(this.app);
  private db = getFirestore(this.app);
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
    return this.handleAuthOperation(() => signInWithEmailAndPassword(this.auth, email, password), '/dashboard');
  }

  async signUp(email: string, password: string) {
    await this.handleAuthOperation(() => createUserWithEmailAndPassword(this.auth, email, password));
    this.router.navigate(['/dashboard']);
  }

  async signOut() {
    return this.handleAuthOperation(() => signOut(this.auth), '/home');
  }

  private async handleAuthOperation(operation: () => Promise<any>, navigatePath?: string) {
    try {
      const result = await operation();
      if (navigatePath) {
        this.router.navigate([navigatePath]);
      }
      return result;
    } catch (error) {
      console.error('Firebase operation failed:', error);
      throw error;
    }
  }

  //Profile

  async updateUserEmail(newEmail: string) {
    const user = this.auth.currentUser;
    if (user) {
      await updateEmail(user, newEmail);
    }
  }

  async updateUserPassword(newPassword: string) {
    const user = this.auth.currentUser;
    if (user) {
      await updatePassword(user, newPassword);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async reauthenticateAndChangeEmail(currentEmail: string, currentPassword: string, newEmail: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updateEmail(user, newEmail);
  }

  public formatDate(date: Date): string {
    const pad = (num: number) => (num < 10 ? `0${num}` : num);
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  //Add questions

  async submitQuestion(questionData: any): Promise<void> {
    const questionsRef = collection(this.db, 'questions');
    await addDoc(questionsRef, {
      ...questionData,
      approved: false,
      rejected: false,
      pending: true,
      createdAt: new Date()
    });
  }
  
  async getPendingQuestions(): Promise<any[]> {
    const q = query(collection(this.db, 'questions'), where('pending', '==', true), where('rejected', '==', false), where('approved', '==', false));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: this.formatDate(doc.data()['createdAt'].toDate())
    }));
  }

  async getApprovedQuestions(): Promise<any[]> {
    const q = query(collection(this.db, 'questions'), where('pending', '==', false), where('rejected', '==', false), where('approved', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: this.formatDate(doc.data()['createdAt'].toDate())
    }));
  }

  async getRejectedQuestions(): Promise<any[]> {
    const q = query(collection(this.db, 'questions'), where('pending', '==', false), where('rejected', '==', true), where('approved', '==', false));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: this.formatDate(doc.data()['createdAt'].toDate())
    }));
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

  async approveQuestion(questionId: string): Promise<void> {
    const questionRef = doc(this.db, 'questions', questionId);
    await updateDoc(questionRef, { approved: true, rejected: false, pending: false });
  }

  async rejectQuestion(questionId: string): Promise<void> {
    const questionRef = doc(this.db, 'questions', questionId);
    await updateDoc(questionRef, { approved: false, rejected: true, pending: false });
  }

  async updateQuestion(questionId: string, questionData: any): Promise<void> {
    const questionRef = doc(this.db, 'questions', questionId);
    await updateDoc(questionRef, { ...questionData, approved: false, rejected: false, pending: true });
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const questionRef = doc(this.db, 'questions', questionId);
    await deleteDoc(questionRef);
  }

  getCurrentUserId(): string {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }
}
