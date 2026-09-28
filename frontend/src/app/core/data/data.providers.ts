import { Provider } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiDataService } from './api-data.service';
import { DataService } from './data-service';
import { DemoDataService } from './demo-data.service';

// Binds the DataService abstraction to the correct implementation. The rest of
// the app injects DataService and never needs to know which mode is active.
export function provideDataService(): Provider {
  return {
    provide: DataService,
    useClass: environment.dataMode === 'demo' ? DemoDataService : ApiDataService
  };
}

export const IS_DEMO_MODE = environment.dataMode === 'demo';
