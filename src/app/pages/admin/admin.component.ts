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
  // Definición de los dataSource para las preguntas pendientes y aprobadas
  dataSourcePending = new MatTableDataSource<any>();
  dataSourceApproved = new MatTableDataSource<any>();

  // Captura de los paginadores desde la plantilla
  @ViewChild('paginatorPending', { static: false }) paginatorPending!: MatPaginator;
  @ViewChild('paginatorApproved', { static: false }) paginatorApproved!: MatPaginator;

  // Columnas a mostrar en las tablas de preguntas pendientes y aprobadas
  pendingDisplayedColumns: string[] = ['userId', 'question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt', 'status', 'actions'];
  approvedDisplayedColumns: string[] = ['userId', 'question', 'correctOption', 'incorrectOption', 'image', 'thematic', 'createdAt'];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    // Carga inicial de preguntas pendientes y aprobadas
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
    // Lógica para aprobar una pregunta
    this.firebaseService.approveQuestion(questionId).then(() => {
      // Recarga de las listas tras aprobar una pregunta
      this.loadPendingQuestions();
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error approving question:', error);
    });
  }
  
  rejectQuestion(questionId: string): void {
    // Lógica para rechazar una pregunta
    this.firebaseService.rejectQuestion(questionId).then(() => {
      // Recarga de las listas tras rechazar una pregunta
      this.loadPendingQuestions();
      this.loadApprovedQuestions();
    }).catch(error => {
      console.error('Error rejecting question:', error);
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

