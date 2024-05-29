import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Question, QuestionOption } from '../../models/question';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, AfterViewInit {
  dataSourcePending = new MatTableDataSource<Question>();
  dataSourceApproved = new MatTableDataSource<Question>();

  @ViewChild('paginatorPending', { static: false }) paginatorPending!: MatPaginator;
  @ViewChild('paginatorApproved', { static: false }) paginatorApproved!: MatPaginator;

  pendingDisplayedColumns: string[] = ['userId', 'question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt', 'status', 'actions'];
  approvedDisplayedColumns: string[] = ['userId', 'question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt', 'actions'];

  constructor(private firebaseService: FirebaseService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadPendingQuestions();
    this.loadApprovedQuestions();

    this.dataSourcePending.filterPredicate = this.createFilter();
    this.dataSourceApproved.filterPredicate = this.createFilter();
  }

  ngAfterViewInit(): void {
    this.dataSourcePending.paginator = this.paginatorPending;
    this.dataSourceApproved.paginator = this.paginatorApproved;
  }

  loadPendingQuestions(): void {
    this.firebaseService.getPendingQuestions().then(questions => {
      this.dataSourcePending.data = questions;
      setTimeout(() => this.dataSourcePending.paginator = this.paginatorPending);
    }).catch(error => {
      console.error('Error loading pending questions', error);
    });
  }

  loadApprovedQuestions(): void {
    this.firebaseService.getApprovedQuestions().then(questions => {
      this.dataSourceApproved.data = questions;
      setTimeout(() => this.dataSourceApproved.paginator = this.paginatorApproved);
    }).catch(error => {
      console.error('Error loading approved questions', error);
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSourcePending.filter = filterValue.trim().toLowerCase();
    this.dataSourceApproved.filter = filterValue.trim().toLowerCase();
  }

  createFilter(): (data: Question, filter: string) => boolean {
    return (data: Question, filter: string): boolean => {
      const searchStr = (
        data.id + 
        data.questionText + 
        data.options.map((option: QuestionOption) => option.text).join(' ') + 
        data.imageUrl + 
        data.thematic + 
        data.approved +
        (data.approved ? 'approved' : 'pending')
      ).toLowerCase();
      return searchStr.indexOf(filter) !== -1;
    };
  }

  approveQuestion(questionId: string): void {
    this.firebaseService.approveQuestion(questionId).then(() => {
      this.snackBar.open('Question approved successfully!', 'Close', { duration: 3000 });
      this.loadPendingQuestions();
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error approving question:', error);
      this.snackBar.open('Failed to approve question. Try again.', 'Close', { duration: 3000 });
    });
  }

  rejectQuestion(questionId: string): void {
    this.firebaseService.rejectQuestion(questionId).then(() => {
      this.snackBar.open('Question rejected successfully!', 'Close', { duration: 3000 });
      this.loadPendingQuestions();
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error rejecting question:', error);
      this.snackBar.open('Failed to reject question. Try again.', 'Close', { duration: 3000 });
    });
  }

  deleteApprovedQuestion(questionId: string): void {
    this.firebaseService.deleteQuestion(questionId).then(() => {
      this.snackBar.open('Question deleted successfully!', 'Close', { duration: 3000 });
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error deleting approved question:', error);
      this.snackBar.open('Failed to delete question. Try again.', 'Close', { duration: 3000 });
    });
  }

  getCorrectOptionText(options: QuestionOption[]): string {
    const correctOption = options.find(option => option.isCorrect);
    return correctOption ? correctOption.text : 'N/A';
  }

  getIncorrectOptionText(options: QuestionOption[]): string {
    const incorrectOption = options.find(option => !option.isCorrect);
    return incorrectOption ? incorrectOption.text : 'N/A';
  }
}





