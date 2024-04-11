import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReauthenticateDialogComponent } from './reauthenticate-dialog.component';

describe('ReauthenticateDialogComponent', () => {
  let component: ReauthenticateDialogComponent;
  let fixture: ComponentFixture<ReauthenticateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReauthenticateDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReauthenticateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
