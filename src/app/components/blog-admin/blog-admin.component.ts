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

    this.uploadingFile = true;
    this.uploadedUrl = '';

    this.blogService.uploadFile(file).subscribe({
      next: (res) => {
        this.uploadingFile = false;
        this.uploadedUrl = res.url;
        
        // Ofrecer pegar automáticamente la URL en el contenido
        const embedText = `\n\n<img src="${res.url}" alt="${file.name}">\n\n`;
        this.editingPost.content += embedText;
      },
      error: (err) => {
        this.uploadingFile = false;
        alert('Error al subir archivo a Vercel Blob: ' + (err.error?.error || err.message));
      }
    });
  }

  setAsCoverImage(): void {
    if (this.uploadedUrl) {
      this.editingPost.cover_image = this.uploadedUrl;
    }
  }

  // ==========================================
  // GENERAL
  // ==========================================

  onCloseAdmin(): void {
    this.closeAdmin.emit();
  }
}
