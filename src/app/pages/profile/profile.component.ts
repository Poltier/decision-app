import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ReauthenticateDialogComponent } from '../../components/reauthenticate-dialog/reauthenticate-dialog.component';
import { Router, NavigationExtras } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  userQuestions: any[] = [];
  userId: any;
  displayedColumns: string[] = ['question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt', 'status', 'actions'];
  thematics = ['Science', 'Geography', 'History', 'Sports', 'Literature'];

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.minLength(8), Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
    this.userId = this.firebaseService.getCurrentUserId();
    this.loadUserQuestions();
  }

  loadUserQuestions(): void {
    if (this.firebaseService.isAuthenticated()) {
      const userId = this.firebaseService.getCurrentUserId();
      if (userId) {
        this.firebaseService.getUserQuestions(userId)
          .then(questions => {
            this.userQuestions = questions.map(question => {
              const createdAtDate = question.createdAt.toDate();
              return {
                ...question,
                createdAt: this.firebaseService.formatDate(createdAtDate)
              };
            });
          }).catch(error => {
            console.error("Failed to get user's questions:", error);
          });
      }
    }
  }

  updateProfile(): void {
    if (this.profileForm.valid) {
      const { newEmail, newPassword } = this.profileForm.value;
      let updateOperations = [];
      const user = this.firebaseService.getAuthCurrentUser();

      if (user) {
        if (newEmail && newEmail !== user.email) {
          updateOperations.push(this.firebaseService.updateUserEmail(newEmail));
        }
        if (newPassword) {
          updateOperations.push(this.firebaseService.updateUserPassword(newPassword));
        }
        Promise.all(updateOperations)
          .then(() => {
            this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
          })
          .catch(error => {
            console.error('Error updating profile:', error);
            this.snackBar.open('Failed to update profile.', 'Close', { duration: 3000 });
          });
      } else {
        this.snackBar.open('User not authenticated.', 'Close', { duration: 3000 });
      }
    } else {
      this.snackBar.open('Please fill in all required fields correctly.', 'Close', { duration: 3000 });
    }
  }

  getCorrectOptionText(options: any[]): string {
    const correctOption = options.find(option => option.isCorrect);
    return correctOption ? correctOption.text : 'N/A';
  }

  getIncorrectOptionText(options: any[]): string {
    const incorrectOption = options.find(option => !option.isCorrect);
    return incorrectOption ? incorrectOption.text : 'N/A';
  }

  editQuestion(question: any): void {
    const navigationExtras: NavigationExtras = {
      queryParams: {
        id: question.id,
        questionText: question.questionText,
        option1: question.options[0].text,
        option2: question.options[1].text,
        correctOption: question.options[0].isCorrect ? 'option1' : 'option2',
        imageUrl: question.imageUrl,
        thematic: question.thematic
      }
    };
    this.router.navigate(['/submit-question'], navigationExtras);
  }

  updateEmail(): void {
    const dialogRef = this.dialog.open(ReauthenticateDialogComponent, {
      width: '250px'
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        try {
          await this.firebaseService.reauthenticateAndChangeEmail(result.email, result.password, this.profileForm.value.newEmail);
          this.snackBar.open('Email updated successfully', 'Close', { duration: 3000 });
        } catch (error) {
          console.error('Error updating email:', error);
          this.snackBar.open(`Failed to update email: ${error}`, 'Close', { duration: 3000 });
        }
      }
    });
  }

  updatePassword(): void {
    const email = this.profileForm.value.newEmail || this.firebaseService.getAuthCurrentUser()?.email;
    if (email) {
      const confirmationMessage = 'Are you sure you want to reset your password? A new password will be sent to your email and you will be logged out.';

      if (confirm(confirmationMessage)) {
        this.firebaseService.sendPasswordResetEmail(email)
          .then(() => {
            this.snackBar.open('Password reset email sent successfully. You will be logged out.', 'Close', { duration: 3000 });
            this.firebaseService.signOut().then(() => {
              this.router.navigate(['/home']);
            });
          })
          .catch(error => {
            console.error('Error sending password reset email:', error);
            this.snackBar.open('Failed to send password reset email. ' + error, 'Close', { duration: 3000 });
          });
      }
    }
  }
}


