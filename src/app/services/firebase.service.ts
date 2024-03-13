import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: any;
  private analytics: any;

  constructor() {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyA_-S8wbjql8LU8B7skR74Q7_-z0W3kWVY",
      authDomain: "decisiondevelopmentapp.firebaseapp.com",
      projectId: "decisiondevelopmentapp",
      storageBucket: "decisiondevelopmentapp.appspot.com",
      messagingSenderId: "438831122426",
      appId: "1:438831122426:web:fb677169dc5ee2bf42c643",
      measurementId: "G-QFVJW2JJPQ"
    };

    // Initialize Firebase
    this.app = initializeApp(firebaseConfig);
    this.analytics = getAnalytics(this.app);
  }
}
