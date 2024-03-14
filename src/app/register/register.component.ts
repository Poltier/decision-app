import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(private fb: FormBuilder, private firebaseService: FirebaseService, private router: Router) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onRegister() {
    if (this.registerForm.valid) {
      const { email, password } = this.registerForm.value;
      this.firebaseService.signUp(email, password)
        .then(() => {
          // Navegar al dashboard o mostrar un mensaje de éxito
          this.router.navigate(['/dashboard']);
        })
        .catch(error => {
          console.error("Error en el registro: ", error);
          // Manejo de errores, por ejemplo, mostrar un mensaje de error al usuario
        });
    }
  }
}
