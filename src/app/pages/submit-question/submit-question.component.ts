import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-submit-question',
  templateUrl: './submit-question.component.html',
  styleUrls: ['./submit-question.component.scss']
})
export class SubmitQuestionComponent implements OnInit {
  questionForm: FormGroup;
  userId: any;
  isLoading = false;
  thematics = ['Science', 'Geography', 'History', 'Sports', 'Literature']; 
  defaultImageUrl = 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/default%2Fgame_default.jpg?alt=media&token=0bf0098b-3893-46f4-85a2-ae4a8d8ad8a7';
  editingQuestionId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.userId = this.firebaseService.getCurrentUserId();
    this.questionForm = this.fb.group({
      questionText: ['', [Validators.required, Validators.maxLength(120)]],
      imageUrl: [''],
      option1: ['', [Validators.required, Validators.maxLength(40)]],
      option2: ['', [Validators.required, Validators.maxLength(40)]],
      correctOption: ['', [Validators.required]],
      thematic: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { question: any };

    if (state && state.question) {
      this.populateForm(state.question);
    } else {
      this.route.queryParams.subscribe(params => {
        if (params['id']) {
          this.populateForm({
            id: params['id'],
            questionText: params['questionText'],
            imageUrl: params['imageUrl'],
            option1: params['option1'],
            option2: params['option2'],
            correctOption: params['correctOption'],
            thematic: params['thematic']
          });
        }
      });
    }
  }

  populateForm(question: any): void {
  
    this.editingQuestionId = question.id;
  
    const option1Text = question.option1 || '';
    const option2Text = question.option2 || '';
   
    this.questionForm.setValue({
      questionText: question.questionText || '',
      imageUrl: question.imageUrl || this.defaultImageUrl,
      option1: option1Text,
      option2: option2Text,
      correctOption: question.correctOption || 'option1',
      thematic: question.thematic || ''
    });
  }

  submitQuestion(): void {
    if (this.questionForm.valid && this.userId) {
      this.isLoading = true;
      const formData = this.questionForm.value;

      const questionData = {
        questionText: formData.questionText,
        imageUrl: formData.imageUrl || this.defaultImageUrl,
        options: [
          { text: formData.option1, isCorrect: formData.correctOption === 'option1' },
          { text: formData.option2, isCorrect: formData.correctOption === 'option2' }
        ],
        thematic: formData.thematic,
        submittedBy: this.userId,
        approved: false
      };

      this.firebaseService.submitQuestion(questionData).then(() => {
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

  updateQuestion(): void {
    if (this.questionForm.valid && this.userId && this.editingQuestionId) {
      this.isLoading = true;
      const formData = this.questionForm.value;

      const questionData = {
        questionText: formData.questionText,
        imageUrl: formData.imageUrl || this.defaultImageUrl,
        options: [
          { text: formData.option1, isCorrect: formData.correctOption === 'option1' },
          { text: formData.option2, isCorrect: formData.correctOption === 'option2' }
        ],
        thematic: formData.thematic,
        submittedBy: this.userId,
        approved: false
      };

      this.firebaseService.updateQuestion(this.editingQuestionId, questionData).then(() => {
        this.isLoading = false;
        this.questionForm.reset();
        this.snackBar.open('Question updated successfully!', 'Close', {
          duration: 3000 
        });
        this.router.navigate(['/profile']);
      }).catch((error) => {
        this.isLoading = false;
        this.snackBar.open('Failed to update question. Try again.', 'Close', {
          duration: 3000
        });
        console.error('Error updating question', error);
      });
    }
  }

  cancelEdit(): void {
    this.editingQuestionId = null;
    this.questionForm.reset();
    this.router.navigate(['/profile']);
  }
}



