import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../services/blog.service';
import { BlogPost } from '../../models/blog.model';

@Component({
  selector: 'app-blog-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-admin.component.html',
  styleUrls: ['./blog-admin.component.css']
})
export class BlogAdminComponent implements OnInit {
  @Output() closeAdmin = new EventEmitter<void>();
  @Output() refreshList = new EventEmitter<void>();

  // Estados de vista: 'login' | 'register' | 'dashboard' | 'editor'
  viewState: 'login' | 'register' | 'dashboard' | 'editor' = 'login';

  // Formulario Auth
  username = '';
  password = '';
  authError = '';
  authSuccess = '';
  authLoading = false;

  // Formulario Artículos
  editingPost: BlogPost = this.getEmptyPost();
  categories = ['IA', 'Software', 'Drones', 'Negocios'];
  tagsInput = '';
  editorLoading = false;
  uploadingFile = false;
  uploadProgress = 0;
  uploadedUrl = '';

  // Lista de Posts para gestión
  postsList: BlogPost[] = [];
  listLoading = false;

  constructor(public blogService: BlogService) {}

  ngOnInit(): void {
    if (this.blogService.isLoggedIn()) {
      this.viewState = 'dashboard';
      this.loadPosts();
    } else {
      this.viewState = 'login';
    }
  }

  getEmptyPost(): BlogPost {
    return {
      title: '',
      excerpt: '',
      content: '',
      category: 'IA',
      cover_image: '',
      tags: [],
      reading_time: '3 min'
    };
  }

  // ==========================================
  // FLUJOS DE AUTENTICACIÓN
  // ==========================================

  onLogin(event?: Event): void {
    event?.preventDefault();

    if (!this.username || !this.password) return;
    this.authLoading = true;
    this.authError = '';

    this.blogService.login(this.username, this.password).subscribe({
      next: () => {
        this.authLoading = false;
        this.viewState = 'dashboard';
        this.loadPosts();
      },
      error: (err) => {
        this.authLoading = false;
        this.authError = err.error?.error || 'Error al iniciar sesión.';
      }
    });
  }

  onRegister(event?: Event): void {
    event?.preventDefault();

    if (!this.username || !this.password) return;
    this.authLoading = true;
    this.authError = '';
    this.authSuccess = '';

    this.blogService.register(this.username, this.password).subscribe({
      next: () => {
        this.authLoading = false;
        this.authSuccess = '¡Registro exitoso! Ya puedes iniciar sesión.';
        this.viewState = 'login';
        this.password = '';
      },
      error: (err) => {
        this.authLoading = false;
        this.authError = err.error?.error || 'Error al registrar el redactor.';
      }
    });
  }

  onLogout(): void {
    this.blogService.logout();
    this.viewState = 'login';
    this.postsList = [];
  }

  // ==========================================
  // CARGA DE ARTÍCULOS EN DASHBOARD
  // ==========================================

  loadPosts(): void {
    this.listLoading = true;
    this.blogService.getPosts().subscribe({
      next: (data) => {
        this.postsList = data;
        this.listLoading = false;
      },
      error: (err) => {
        console.error('Error al listar posts:', err);
        this.listLoading = false;
      }
    });
  }

  // ==========================================
  // EDITOR DE ARTÍCULOS
  // ==========================================

  openCreateForm(): void {
    this.editingPost = this.getEmptyPost();
    this.tagsInput = '';
    this.viewState = 'editor';
  }

  openEditForm(post: BlogPost): void {
    this.editingPost = { ...post };
    this.tagsInput = post.tags ? post.tags.join(', ') : '';
    this.viewState = 'editor';
  }

  onSavePost(): void {
    if (!this.editingPost.title || !this.editingPost.content) {
      alert('El título y el contenido son obligatorios.');
      return;
    }

    // Convertir tags separados por coma en un arreglo
    this.editingPost.tags = this.tagsInput
      ? this.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
      : [];

    this.editorLoading = true;

    const request$ = this.editingPost.id
      ? this.blogService.updatePost(this.editingPost.id, this.editingPost)
      : this.blogService.createPost(this.editingPost);

    request$.subscribe({
      next: () => {
        this.editorLoading = false;
        this.viewState = 'dashboard';
        this.loadPosts();
        this.refreshList.emit();
      },
      error: (err) => {
        this.editorLoading = false;
        alert('Error al guardar el artículo: ' + (err.error?.error || err.message));
      }
    });
  }

  onDeletePost(id: string): void {
    if (confirm('¿Estás seguro de eliminar este artículo?')) {
      this.blogService.deletePost(id).subscribe({
        next: () => {
          this.loadPosts();
          this.refreshList.emit();
        },
        error: (err) => {
          alert('Error al eliminar: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  // ==========================================
  // CARGA DE MULTIMEDIA A VERCEL BLOB
  // ==========================================

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Verificar tamaño antes de subir
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 4.5) {
      const confirmar = confirm(
        `El archivo pesa ${fileSizeMB.toFixed(2)}MB y supera el límite de 4.5MB.\n\n¿Quieres continuar de todos modos? (Solo funcionará en entorno local)`
      );
      if (!confirmar) {
        // Resetear el input de archivo
        event.target.value = '';
        return;
      }
    }

    this.uploadingFile = true;
    this.uploadProgress = 0;
    this.uploadedUrl = '';

    this.blogService.uploadFile(file).subscribe({
      next: (res: any) => {
        if ('progress' in res) {
          // Actualizar progreso
          this.uploadProgress = res.progress;
        } else if ('url' in res) {
          // Subida completada
          this.uploadingFile = false;
          this.uploadProgress = 100;
          this.uploadedUrl = res.url;
          
          // Detectar tipo de archivo y generar HTML adecuado
          let embedText = '';
          if (file.type.startsWith('image/')) {
            embedText = `\n\n<img src="${res.url}" alt="${file.name}" class="w-full rounded-xl shadow-md my-4">\n\n`;
          } else if (file.type.startsWith('audio/')) {
            embedText = `\n\n<audio controls src="${res.url}" title="${file.name}" class="w-full my-4">\n  Tu navegador no soporta el elemento de audio.\n</audio>\n\n`;
          } else {
            embedText = `\n\n<a href="${res.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">📄 ${file.name}</a>\n\n`;
          }
          
          this.editingPost.content += embedText;
        }
      },
      error: (err) => {
        this.uploadingFile = false;
        this.uploadProgress = 0;
        
        let errorMessage = 'Error al subir archivo al Blob: ';
        
        if (err.status === 413) {
          errorMessage = 'El archivo es demasiado grande. El límite es de 4.5MB por archivo. Por favor, reduce el tamaño del archivo o prueba en entorno local.';
        } else if (err.error?.error) {
          errorMessage += err.error.error;
        } else if (err.message) {
          errorMessage += err.message;
        } else {
          errorMessage += 'Error desconocido';
        }
        
        alert(errorMessage);
      }
    });
  }

  setAsCoverImage(): void {
    if (this.uploadedUrl) {
      this.editingPost.cover_image = this.uploadedUrl;
    }
  }

  getUploadButtonText(): string {
    if (this.uploadingFile) {
      return 'Subiendo... ' + this.uploadProgress + '%';
    }
    return '📁 Seleccionar Imagen / Audio / Video';
  }

  // ==========================================
  // GENERAL
  // ==========================================

  onCloseAdmin(): void {
    this.closeAdmin.emit();
  }
}
