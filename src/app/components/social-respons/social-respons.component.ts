import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-social-respons',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './social-respons.component.html',
  styleUrl: './social-respons.component.scss'
})
export class SocialResponsComponent {
  campanias = [
    {
      id: 1,
      titulo: 'Campaña de Siembra de Árboles Carmen, Campeche',
      descripcion: 'Fomentamos la plantación de árboles para mejorar el medio ambiente y la calidad de vida en Carmen, Campeche.',
      imagenes: [
        '../../../assets/social/sembrando_arboles.jpg',
        '../../../assets/social/sembrando_arboles2.jpg',
      ]
    }
  ];

  currentIndex: { [key: number]: number } = {};
  isModalOpen: boolean = false;
  modalImage: string | null = null;
  zoomLevel: number = 1;
  private readonly minZoom = 0.5;
  private readonly maxZoom = 3;
  private readonly zoomStep = 0.25;
  transformOrigin: string = 'center center';
  translateX: number = 0;
  translateY: number = 0;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private lastTranslateX = 0;
  private lastTranslateY = 0;

  constructor() {
    this.campanias.forEach(campania => {
      this.currentIndex[campania.id] = 0;
    });
  }

  
  openModal(image: string) {
    this.isModalOpen = true;
    this.modalImage = image;
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.transformOrigin = 'center center';
  }
  
  closeModal() {
    this.isModalOpen = false;
    this.modalImage = null;
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
  }

  prevSlide(campaniaId: number) {
    const totalImages = this.campanias.find(c => c.id === campaniaId)?.imagenes.length || 0;
    this.currentIndex[campaniaId] = (this.currentIndex[campaniaId] - 1 + totalImages) % totalImages;
  }

  nextSlide(campaniaId: number) {
    const totalImages = this.campanias.find(c => c.id === campaniaId)?.imagenes.length || 0;
    this.currentIndex[campaniaId] = (this.currentIndex[campaniaId] + 1) % totalImages;
  }

  zoomIn() {
    this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
  }

  zoomOut() {
    this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.transformOrigin = 'center center';
  }

  setZoomCenter(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    this.transformOrigin = `${xPercent}% ${yPercent}%`;
  }

  startPan(event: MouseEvent) {
    if (this.zoomLevel <= 1) return;
    this.isPanning = true;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.lastTranslateX = this.translateX;
    this.lastTranslateY = this.translateY;
    event.preventDefault();
  }

  pan(event: MouseEvent) {
    if (!this.isPanning) return;
    const dx = event.clientX - this.panStartX;
    const dy = event.clientY - this.panStartY;
    this.translateX = this.lastTranslateX + dx;
    this.translateY = this.lastTranslateY + dy;
  }

  endPan() {
    this.isPanning = false;
  }
}