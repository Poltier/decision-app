// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { UserService } from '../services/user.service'; // Asegúrate de tener la ruta correcta

// @Component({
//   selector: 'app-profile',
//   templateUrl: './profile.component.html',
//   styleUrls: ['./profile.component.css']
// })
// export class ProfileComponent implements OnInit {
//   profileForm: FormGroup;
//   avatars = ['avatar1.jpg', 'avatar2.jpg', 'avatar3.jpg']; // Agrega los nombres de archivo de tus avatares
//   selectedAvatar = 'default-avatar.jpg'; // Un avatar por defecto

//   constructor(
//     private fb: FormBuilder,
//     private userService: UserService // Inyecta tu UserService
//   ) {
//     this.profileForm = this.fb.group({
//       email: ['', [Validators.required, Validators.email]],
//       newPassword: ['', [Validators.minLength(8)]], // Hacer que la contraseña sea opcional
//       avatar: ['']
//     });
//   }

//   ngOnInit(): void {
//     this.loadUserProfile();
//   }

//   loadUserProfile(): void {
//     // Aquí deberías cargar la información del usuario, incluido el avatar actual
//     // Por ejemplo, podrías tener algo así:
//     // this.selectedAvatar = userInfo.avatar;
//   }

//   updateProfile(): void {
//     if (this.profileForm.valid) {
//       const formData = this.profileForm.value;
//       // Asegúrate de manejar el cambio de avatar junto con otros datos del perfil aquí
//       this.userService.updateUserProfile(formData).subscribe(
//         response => {
//           console.log('Perfil actualizado', response);
//         },
//         error => {
//           console.error('Error al actualizar perfil', error);
//         }
//       );
//     }
//   }

//   selectAvatar(avatar: string): void {
//     this.selectedAvatar = avatar;
//     this.profileForm.get('avatar')?.setValue(avatar);
//   }
// }
