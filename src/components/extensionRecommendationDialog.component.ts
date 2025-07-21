import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UrlOpeningService } from '../services/urlOpening.service';

@Component({
  selector: 'extension-recommendation-dialog',
  template: require('./extensionRecommendationDialog.component.pug').default,
  styles: [require('./extensionRecommendationDialog.component.scss')],
})
export class ExtensionRecommendationDialogComponent {
  constructor(public modal: NgbActiveModal, private urlOpeningService: UrlOpeningService) {}

  openMarketplace(): void {
    this.urlOpeningService.openUrl('https://marketplace.visualstudio.com/items?itemName=TabbyCopilotConnector.tabby-copilot-opener');
    this.modal.close();
  }

  dismiss(): void {
    this.modal.dismiss();
  }
}
