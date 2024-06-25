import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NehorajComponent } from './nehoraj.component';

describe('NehorajComponent', () => {
  let component: NehorajComponent;
  let fixture: ComponentFixture<NehorajComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NehorajComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NehorajComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
