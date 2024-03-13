import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private firebaseService: FirebaseService) { }

  onLogin() {
    this.firebaseService.signIn(this.email, this.password);
  }
}
