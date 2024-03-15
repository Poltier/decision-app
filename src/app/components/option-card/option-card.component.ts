import { Component, Input, Output, EventEmitter } from '@angular/core';
import { QuestionOption } from '../../models/question';

@Component({
  selector: 'app-option-card',
  templateUrl: './option-card.component.html',
  styleUrls: ['./option-card.component.css']
})
export class OptionCardComponent {
  @Input() option?: QuestionOption;
  @Input() isLeft: boolean = false;
  @Input() isRight: boolean = false; 
  @Output() optionSelected = new EventEmitter<QuestionOption>();

  onSelect() {
    if (this.option) {
      this.optionSelected.emit(this.option);
    }
  }
}
