// import { Injectable } from '@angular/core';
// import { AngularFireDatabase } from '@angular/fire/database'; // Para Firestore
// import { AngularFireStorage } from '@angular/fire/storage'; // Para Storage
// import { AngularFireAuth } from '@angular/fire/auth'; // Para Auth
// import { last, switchMap } from 'rxjs/operators';

// @Injectable({
//   providedIn: 'root'
// })
// export class UserService {
//   constructor(
//     private afAuth: AngularFireAuth,
//     private db: AngularFireDatabase, // Asegúrate de inyectar estos servicios en el constructor de tu módulo
//     private storage: AngularFireStorage
//   ) {}

//   // Actualiza el perfil del usuario en Firestore
//   updateUserProfile(userId: string, userData: any) {
//     return this.db.object(`/users/${userId}`).update(userData);
//   }

//   // Sube un nuevo avatar a Firebase Storage y actualiza la URL en Firestore
//   uploadAvatar(userId: string, file: File) {
//     const filePath = `avatars/${userId}/${file.name}`;
//     const ref = this.storage.ref(filePath);
//     return this.storage.upload(filePath, file).snapshotChanges().pipe(
//       last(), // Emite el último valor una vez que se completa la carga
//       switchMap(() => ref.getDownloadURL()), // Obtiene la URL de descarga
//       switchMap((url) => this.updateUserProfile(userId, { avatar: url })) // Actualiza el perfil del usuario con la nueva URL del avatar
//     );
//   }

//   // Ejemplo de cómo actualizar el correo electrónico del usuario
//   updateUserEmail(newEmail: string) {
//     return this.afAuth.currentUser.then(user => user?.updateEmail(newEmail));
//   }

//   // Ejemplo de cómo actualizar la contraseña del usuario
//   updateUserPassword(newPassword: string) {
//     return this.afAuth.currentUser.then(user => user?.updatePassword(newPassword));
//   }
// }
