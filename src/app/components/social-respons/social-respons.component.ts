import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-social-respons',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './social-respons.component.html',
  styleUrl: './social-respons.component.scss'
})
export class SocialResponsComponent implements OnInit {
  // Todas las campañas se gestionan desde el panel de administración
  // (tabla social_images), incluida la histórica de Siembra de Árboles.
  campanias: { id: number; titulo: string; descripcion: string; imagenes: string[] }[] = [];

  currentIndex: { [key: number]: number } = {};

  constructor(private blogService: BlogService) {}

  ngOnInit(): void {
    this.blogService.getSocialImages().subscribe({
      next: (images) => {
        const groups = new Map<string, { descripcion: string; imagenes: string[] }>();
        for (const img of images) {
          const group = groups.get(img.campaign_title) || { descripcion: img.campaign_description || '', imagenes: [] };
          group.imagenes.push(img.image_url);
          groups.set(img.campaign_title, group);
        }

        this.campanias = Array.from(groups.entries()).map(([titulo, data], index) => ({
          id: index + 1,
          titulo,
          descripcion: data.descripcion,
          imagenes: data.imagenes
        }));

        this.campanias.forEach(c => this.currentIndex[c.id] = 0);
      },
      error: (err) => console.error('Error al cargar imágenes de responsabilidad social:', err)
    });
  }
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