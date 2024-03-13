import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';

  constructor(private firebaseService: FirebaseService) { }

  onRegister() {
    this.firebaseService.signUp(this.email, this.password).then(() => {
      // Navegar al dashboard o mostrar un mensaje de éxito
    }).catch(error => {
      console.error("Error en el registro: ", error);
    });
  }
}
