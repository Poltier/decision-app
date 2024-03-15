import { Component, Input, Output, EventEmitter } from '@angular/core';
import { QuestionOption } from '../../models/question';

@Component({
  selector: 'app-option-card',
  templateUrl: './option-card.component.html',
  styleUrls: ['./option-card.component.css']
})
export class OptionCardComponent {
  @Input() option?: QuestionOption;
  @Output() optionSelected = new EventEmitter<QuestionOption>();

  onSelect() {
    this.optionSelected.emit(this.option);
  }
}
