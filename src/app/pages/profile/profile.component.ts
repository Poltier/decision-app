import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  questionForm: FormGroup;
  avatars: string[] = [];
  selectedAvatar: string = '';
  userQuestions: any[] = [];
  userId: any;
  isEditing = false;
  editingQuestionId: string | null = null;
  displayedColumns: string[] = ['question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt', 'status', 'actions'];
  thematics = ['Science', 'Geography', 'History', 'Sports', 'Literature']; 

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.minLength(8), Validators.maxLength(20)]],
      avatar: ['']
    });
    this.questionForm = this.fb.group({
      questionText: ['', [Validators.required, Validators.maxLength(120)]],
      imageUrl: ['', [Validators.required]],
      option1: ['', [Validators.required, Validators.maxLength(40)]],
      option2: ['', [Validators.required, Validators.maxLength(40)]],
      correctOption: ['', [Validators.required]],
      thematic: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    //logica avatares
    this.firebaseService.getAvatars().then((avatars) => {
      this.avatars = avatars;
      this.selectedAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    }).catch(error => {
      console.error("Failed to get avatars:", error);
    });
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
      const { newEmail, newPassword, avatar } = this.profileForm.value;
      let promises = [];

      if ( avatar) {
        promises.push(this.firebaseService.updateUserProfile(this.selectedAvatar));
      }

      if (newEmail) {
        promises.push(this.firebaseService.updateUserEmail(newEmail));
      }

      if (newPassword) {
        promises.push(this.firebaseService.updateUserPassword(newPassword));
      }
  
      Promise.all(promises).then(() => {
        this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
      }).catch(error => {
        console.error('Error updating profile:', error);
        this.snackBar.open('Failed to update profile.', 'Close', { duration: 3000 });
      });
    } else {
      this.snackBar.open('Please fill in all required fields correctly.', 'Close', { duration: 3000 });
    }
  }
  

  selectAvatar(avatarUrl: string): void {
    this.selectedAvatar = avatarUrl;
    this.profileForm.patchValue({ avatar: avatarUrl });
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
    this.isEditing = true;
    this.editingQuestionId = question.id;
    // Carga los datos de la pregunta en el formulario de pregunta
    this.questionForm.setValue({
      questionText: question.questionText,
      option1: question.options[0].text,
      option2: question.options[1].text,
      correctOption: question.options[0].isCorrect ? 'option1' : 'option2',
      imageUrl: question.imageUrl || '',
      thematic: question.thematic
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingQuestionId = null;
    this.questionForm.reset();
  }

  saveEditedQuestion(): void {
    if (this.questionForm.valid && this.editingQuestionId) {
      // Actualiza la pregunta en Firebase usando el ID de la pregunta
      const questionData = {
        questionText: this.questionForm.value.questionText,
        options: [
          { text: this.questionForm.value.option1, isCorrect: this.questionForm.value.correctOption === 'option1' },
          { text: this.questionForm.value.option2, isCorrect: this.questionForm.value.correctOption === 'option2' },
        ],
        imageUrl: this.questionForm.value.imageUrl,
        thematic: this.questionForm.value.thematic
      };
      
      this.firebaseService.updateQuestion(this.editingQuestionId, questionData).then(() => {
        this.snackBar.open('Question updated successfully!', 'Close', { duration: 3000 });
        this.isEditing = false;
        this.editingQuestionId = null;
        // Recarga las preguntas del usuario para reflejar los cambios
        this.loadUserQuestions();
      }).catch(error => {
        console.error('Error updating question', error);
        this.snackBar.open('Error updating question. Try again later.', 'Close', { duration: 3000 });
      });
    }
  }
}
