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

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar
  ) {
    this.userId = this.firebaseService.getCurrentUserId();
    this.questionForm = this.fb.group({
      questionText: ['', [Validators.required, Validators.maxLength(120)]],
      imageUrl: ['', [Validators.required]],
      option1: ['', [Validators.required, Validators.maxLength(40)]],
      option2: ['', [Validators.required, Validators.maxLength(40)]],
      correctOption: ['', [Validators.required]]
    });
  }

  submitQuestion(): void {
    if (this.questionForm.valid && this.userId) {
      this.isLoading = true;
      const formData = this.questionForm.value;
      this.firebaseService.submitQuestion({
        questionText: formData.questionText,
        imageUrl: formData.imageUrl,
        options: [
          { text: formData.option1, isCorrect: formData.correctOption === 'option1' },
          { text: formData.option2, isCorrect: formData.correctOption === 'option2' }
        ],
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
