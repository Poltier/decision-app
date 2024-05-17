import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, AfterViewInit {
  dataSourcePending = new MatTableDataSource<any>();
  dataSourceApproved = new MatTableDataSource<any>();

  @ViewChild('paginatorPending', { static: false }) paginatorPending!: MatPaginator;
  @ViewChild('paginatorApproved', { static: false }) paginatorApproved!: MatPaginator;

  pendingDisplayedColumns: string[] = ['userId', 'question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt', 'status', 'actions'];
  approvedDisplayedColumns: string[] = ['userId', 'question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt', 'actions'];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    this.loadPendingQuestions();
    this.loadApprovedQuestions();
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

  approveQuestion(questionId: string): void {
    this.firebaseService.approveQuestion(questionId).then(() => {
      this.loadPendingQuestions();
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error approving question:', error);
    });
  }

  rejectQuestion(questionId: string): void {
    this.firebaseService.rejectQuestion(questionId).then(() => {
      this.loadPendingQuestions();
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error rejecting question:', error);
    });
  }

  deleteApprovedQuestion(questionId: string): void {
    this.firebaseService.deleteQuestion(questionId).then(() => {
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error deleting approved question:', error);
    });
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

