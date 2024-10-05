import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialResponsComponent } from './social-respons.component';

describe('SocialResponsComponent', () => {
  let component: SocialResponsComponent;
  let fixture: ComponentFixture<SocialResponsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialResponsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SocialResponsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
