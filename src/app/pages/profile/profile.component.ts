import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  avatars: string[] = [];
  selectedAvatar: string = '';

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.minLength(8)]],
      displayName: [''],
      avatar: ['']
    });
  }

  ngOnInit(): void {
    this.firebaseService.getAvatars().then((avatars) => {
      this.avatars = avatars;
      this.selectedAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    }).catch(error => {
      console.error("Failed to get avatars:", error);
    });
  }

  updateProfile(): void {
    if (this.profileForm.valid) {
      const { displayName, email, password, avatar } = this.profileForm.value;
      // Update the user's profile data
      this.firebaseService.updateProfileData(displayName, avatar).then(() => {
        console.log('Profile data updated');
      });

      if (email) {
        this.firebaseService.updateUserEmail(email).then(() => {
          console.log('Email updated');
        });
      }

      if (password) {
        this.firebaseService.updateUserPassword(password).then(() => {
          console.log('Password updated');
        });
      }
    }
  }

  selectAvatar(avatarUrl: string): void {
    this.selectedAvatar = avatarUrl;
  }

}
