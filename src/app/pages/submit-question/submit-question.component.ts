import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-submit-question',
  templateUrl: './submit-question.component.html',
  styleUrls: ['./submit-question.component.scss']
})
export class SubmitQuestionComponent {
  questionForm: FormGroup;
  userId: any;
  isLoading = false;
  thematics = ['Science', 'Geography', 'History', 'Sports', 'Literature']; 
  defaultImageUrl = 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/default%2Fgame_default.jpg?alt=media&token=0bf0098b-3893-46f4-85a2-ae4a8d8ad8a7';

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar
  ) {
    this.userId = this.firebaseService.getCurrentUserId();
    this.questionForm = this.fb.group({
      questionText: ['', [Validators.required, Validators.maxLength(120)]],
      imageUrl: [''],
      // imageUrl: ['', [Validators.required]],
      option1: ['', [Validators.required, Validators.maxLength(40)]],
      option2: ['', [Validators.required, Validators.maxLength(40)]],
      correctOption: ['', [Validators.required]],
      thematic: ['', [Validators.required]]
    });
  }

  submitQuestion(): void {
    if (this.questionForm.valid && this.userId) {
      this.isLoading = true;
      const formData = this.questionForm.value;

      this.firebaseService.submitQuestion({
        questionText: formData.questionText,
        imageUrl: formData.imageUrl || this.defaultImageUrl,
        options: [
          { text: formData.option1, isCorrect: formData.correctOption === 'option1' },
          { text: formData.option2, isCorrect: formData.correctOption === 'option2' }
        ],
        thematic: formData.thematic,
        submittedBy: this.userId,
        approved: false
      }).then(() => {
        this.isLoading = false;
        this.questionForm.reset();
        this.snackBar.open('Question submitted successfully!', 'Close', {
          duration: 3000 
        });
        console.log('Question submitted for approval');
      }).catch((error) => {
        this.isLoading = false;
        this.snackBar.open('Failed to submit question. Try again.', 'Close', {
          duration: 3000
        });
        console.error('Error submitting question', error);
      });
    }
  }
}
