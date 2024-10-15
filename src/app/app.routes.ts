import { Routes } from '@angular/router';
import { MisionVisionComponent } from './components/mision-vision/mision-vision.component';
import { CalendarComponent } from './components/calendar/calendar.component';

export const routes: Routes = [
    { path: 'mision', component: MisionVisionComponent },
    { path: 'calendar', component: CalendarComponent },
];
