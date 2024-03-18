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
  questionForm: FormGroup;
  avatars: string[] = [];
  selectedAvatar: string = '';
  userQuestions: any[] = [];
  userId: any;
  isEditing = false;
  editingQuestionId: string | null = null;

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
    this.questionForm = this.fb.group({
      questionText: ['', [Validators.required]],
      imageUrl: ['', [Validators.required]], // Campo para la URL de la imagen
      option1: ['', [Validators.required]],
      option2: ['', [Validators.required]],
      correctOption: ['', [Validators.required]]
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
        this.firebaseService.getUserQuestions()
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
      imageUrl: question.imageUrl || '' // Asegúrate de que imageUrl tenga un valor predeterminado en caso de ser undefined
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
        imageUrl: this.questionForm.value.imageUrl
      };
      this.firebaseService.updateQuestion(this.editingQuestionId, questionData).then(() => {
        console.log('Question updated successfully');
        this.isEditing = false;
        this.editingQuestionId = null;
        // Recarga las preguntas del usuario para reflejar los cambios
        this.loadUserQuestions();
      }).catch(error => {
        console.error('Error updating question', error);
      });
    }
  }
}
