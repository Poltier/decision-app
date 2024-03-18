import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  pendingQuestions: any[] = [];
  approvedQuestions: any[] = [];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    this.loadPendingQuestions();
    this.loadApprovedQuestions();
  }

  loadPendingQuestions(): void {
    this.firebaseService.getPendingQuestions().then(questions => {
      this.pendingQuestions = questions;
    }).catch(error => {
      console.error('Error loading pending questions', error);
    });
  }

  loadApprovedQuestions(): void {
    this.firebaseService.getApprovedQuestions().then(questions => {
      this.approvedQuestions = questions;
    }).catch(error => {
      console.error('Error loading approved questions', error);
    });
  }
  

  approveQuestion(questionId: string): void {
    this.firebaseService.approveQuestion(questionId).then(() => {
      // Espera a que ambas funciones asincrónicas se completen antes de imprimir en consola
      Promise.all([this.loadPendingQuestions(), this.loadApprovedQuestions()]).then(() => {
        console.log('Question approved and lists updated');
      });
    }).catch(error => console.error('Error approving question:', error));
  }
  
  rejectQuestion(questionId: string): void {
    this.firebaseService.rejectQuestion(questionId).then(() => {
      // Similar al aprobar, espera a que ambas actualizaciones se completen
      Promise.all([this.loadPendingQuestions(), this.loadApprovedQuestions()]).then(() => {
        console.log('Question rejected and lists updated');
      });
    }).catch(error => console.error('Error rejecting question:', error));
  }
  
  getCorrectOptionText(options: any[]): string {
    const correctOption = options.find(option => option.isCorrect);
    return correctOption ? correctOption.text : 'N/A';
  }
  
  getIncorrectOptionText(options: any[]): string {
    const incorrectOption = options.find(option => !option.isCorrect);
    return incorrectOption ? incorrectOption.text : 'N/A';
  }
}
