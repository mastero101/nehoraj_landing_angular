import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../services/blog.service';
import { OpenaiService } from '../../services/openai.service';
import { BlogPost } from '../../models/blog.model';
import { User } from '../../models/user.model';
import { SocialImage } from '../../models/social-image.model';

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

  // Estados de vista: 'login' | 'dashboard' | 'editor' | 'change-password' | 'admin-users' | 'social-media'
  // El registro público de redactores se eliminó por seguridad: ahora solo un admin puede crear cuentas.
  viewState: 'login' | 'dashboard' | 'editor' | 'change-password' | 'admin-users' | 'social-media' = 'login';

  // Formulario Auth
  username = '';
  password = '';
  authError = '';
  authSuccess = '';
  authLoading = false;

  // Cambio de contraseña (autoservicio)
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  changePasswordError = '';
  changePasswordSuccess = '';
  changePasswordLoading = false;

  // Reseteo de contraseña por admin
  usersList: User[] = [];
  usersLoading = false;
  usersError = '';
  resetTargetUser: User | null = null;
  resetNewPassword = '';
  resetError = '';
  resetSuccess = '';
  resetLoading = false;

  // Alta de nuevos redactores (solo admin)
  showCreateRedactor = false;
  newRedactorUsername = '';
  newRedactorPassword = '';
  newRedactorRole: 'author' | 'admin' = 'author';
  createRedactorError = '';
  createRedactorSuccess = '';
  createRedactorLoading = false;

  // Foto de perfil propia (avatar de autor)
  showMyAvatarModal = false;
  uploadingMyAvatar = false;
  myAvatarUploadProgress = 0;
  myAvatarError = '';
  myAvatarSuccess = '';

  // Formulario Artículos & Redacción Avanzada
  @ViewChild('contentTextArea') contentTextArea!: ElementRef<HTMLTextAreaElement>;
  editorTab: 'edit' | 'preview' = 'edit';
  editingPost: BlogPost = this.getEmptyPost();
  categories = ['IA', 'Software', 'Drones', 'Negocios'];
  tagsInput = '';
  editorLoading = false;
  uploadingFile = false;
  uploadProgress = 0;
  uploadedUrl = '';
  isDragging = false;

  // Estadísticas del artículo
  wordCount = 0;
  charCount = 0;

  // Asistente IA para redactores
  showAiModal = false;
  aiPrompt = '';
  aiAction: 'draft' | 'improve' | 'summary' | 'title' = 'draft';
  aiLoading = false;
  aiError = '';

  // Lista de Posts para gestión
  postsList: BlogPost[] = [];
  listLoading = false;

  // Imágenes de Responsabilidad Social
  socialImages: SocialImage[] = [];
  socialImagesLoading = false;
  socialImagesError = '';
  newSocialCampaignTitle = '';
  newSocialCampaignDescription = '';
  uploadingSocialImage = false;
  socialUploadProgress = 0;
  editingCampaignTitle: string | null = null;
  editCampaignNewTitle = '';
  editCampaignNewDescription = '';
  editCampaignLoading = false;
  editCampaignError = '';

  constructor(
    public blogService: BlogService,
    private openaiService: OpenaiService
  ) {}

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
      author_name: '',
      author_role: '',
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

  onLogout(): void {
    this.blogService.logout();
    this.viewState = 'login';
    this.postsList = [];
  }

  get isAdmin(): boolean {
    return this.blogService.currentUserValue?.role === 'admin';
  }

  // ==========================================
  // CAMBIO DE CONTRASEÑA (AUTOSERVICIO)
  // ==========================================

  openChangePassword(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.changePasswordError = '';
    this.changePasswordSuccess = '';
    this.viewState = 'change-password';
  }

  onChangePassword(event?: Event): void {
    event?.preventDefault();
    this.changePasswordError = '';
    this.changePasswordSuccess = '';

    if (this.newPassword !== this.confirmPassword) {
      this.changePasswordError = 'Las contraseñas nuevas no coinciden.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.changePasswordError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.changePasswordLoading = true;
    this.blogService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.changePasswordLoading = false;
        this.changePasswordSuccess = 'Contraseña actualizada correctamente.';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.changePasswordLoading = false;
        this.changePasswordError = err.error?.error || 'Error al cambiar la contraseña.';
      }
    });
  }

  // ==========================================
  // RESETEO DE CONTRASEÑA POR ADMIN
  // ==========================================

  openAdminUsers(): void {
    this.usersError = '';
    this.resetTargetUser = null;
    this.viewState = 'admin-users';
    this.loadUsers();
  }

  openCreateRedactor(): void {
    this.newRedactorUsername = '';
    this.newRedactorPassword = '';
    this.newRedactorRole = 'author';
    this.createRedactorError = '';
    this.createRedactorSuccess = '';
    this.showCreateRedactor = true;
  }

  cancelCreateRedactor(): void {
    this.showCreateRedactor = false;
    this.createRedactorError = '';
  }

  onCreateRedactor(event?: Event): void {
    event?.preventDefault();
    this.createRedactorError = '';
    this.createRedactorSuccess = '';

    if (!this.newRedactorUsername.trim() || !this.newRedactorPassword) return;
    if (this.newRedactorPassword.length < 6) {
      this.createRedactorError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.createRedactorLoading = true;
    this.blogService.register(this.newRedactorUsername.trim(), this.newRedactorPassword, this.newRedactorRole).subscribe({
      next: () => {
        this.createRedactorLoading = false;
        this.createRedactorSuccess = `Redactor "${this.newRedactorUsername.trim()}" creado exitosamente.`;
        this.showCreateRedactor = false;
        this.loadUsers();
      },
      error: (err) => {
        this.createRedactorLoading = false;
        this.createRedactorError = err.error?.error || 'Error al crear el redactor.';
      }
    });
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = '';
    this.blogService.getUsers().subscribe({
      next: (data) => {
        this.usersList = data;
        this.usersLoading = false;
      },
      error: (err) => {
        this.usersLoading = false;
        this.usersError = err.error?.error || 'Error al cargar los redactores.';
      }
    });
  }

  openResetFor(user: User): void {
    this.resetTargetUser = user;
    this.resetNewPassword = '';
    this.resetError = '';
    this.resetSuccess = '';
  }

  cancelReset(): void {
    this.resetTargetUser = null;
    this.resetNewPassword = '';
    this.resetError = '';
  }

  onAdminResetPassword(event?: Event): void {
    event?.preventDefault();
    if (!this.resetTargetUser) return;

    this.resetError = '';
    if (this.resetNewPassword.length < 6) {
      this.resetError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.resetLoading = true;
    this.blogService.adminResetPassword(this.resetTargetUser.id, this.resetNewPassword).subscribe({
      next: () => {
        this.resetLoading = false;
        this.resetSuccess = `Contraseña de "${this.resetTargetUser?.username}" reseteada correctamente.`;
        this.resetTargetUser = null;
        this.resetNewPassword = '';
      },
      error: (err) => {
        this.resetLoading = false;
        this.resetError = err.error?.error || 'Error al resetear la contraseña.';
      }
    });
  }

  isCurrentUser(user: User): boolean {
    return user.id === this.blogService.currentUserValue?.id;
  }

  onChangeUserRole(user: User, newRole: string): void {
    const previousRole = user.role;
    if (!confirm(`¿Cambiar el rol de "${user.username}" de "${previousRole}" a "${newRole}"?`)) {
      return;
    }

    this.blogService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        user.role = newRole;
      },
      error: (err) => {
        alert('Error al cambiar el rol: ' + (err.error?.error || err.message));
        this.loadUsers();
      }
    });
  }

  onDeleteRedactor(user: User): void {
    if (!confirm(`¿Eliminar permanentemente al redactor "${user.username}"? Sus artículos publicados no se eliminarán.`)) {
      return;
    }

    this.blogService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert('Error al eliminar el redactor: ' + (err.error?.error || err.message))
    });
  }

  // ==========================================
  // FOTO DE PERFIL PROPIA (AVATAR DE AUTOR)
  // ==========================================

  openMyAvatarModal(): void {
    this.myAvatarError = '';
    this.myAvatarSuccess = '';
    this.showMyAvatarModal = true;
  }

  closeMyAvatarModal(): void {
    this.showMyAvatarModal = false;
  }

  onMyAvatarFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.myAvatarError = '';
    this.myAvatarSuccess = '';
    this.uploadingMyAvatar = true;
    this.myAvatarUploadProgress = 0;

    this.blogService.uploadFile(file).subscribe({
      next: (res: any) => {
        if ('progress' in res) {
          this.myAvatarUploadProgress = res.progress;
          return;
        }
        if (!('url' in res)) return;

        this.blogService.updateMyAvatar(res.url).subscribe({
          next: () => {
            this.uploadingMyAvatar = false;
            this.myAvatarSuccess = 'Foto de perfil actualizada. Se usará en tus próximos artículos.';
          },
          error: (err) => {
            this.uploadingMyAvatar = false;
            this.myAvatarError = err.error?.error || 'Error al guardar la foto de perfil.';
          }
        });
      },
      error: (err) => {
        this.uploadingMyAvatar = false;
        this.myAvatarError = err.error?.error || 'Error al subir la foto.';
      }
    });

    event.target.value = '';
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
    this.editingPost.author_avatar = this.blogService.currentUserValue?.avatar_url || '';
    this.tagsInput = '';
    this.editorTab = 'edit';
    this.updateStats();
    this.viewState = 'editor';
  }

  openEditForm(post: BlogPost): void {
    this.editingPost = { ...post };
    this.tagsInput = post.tags ? post.tags.join(', ') : '';
    this.editorTab = 'edit';
    this.updateStats();
    this.viewState = 'editor';
  }

  updateStats(): void {
    const text = (this.editingPost.content || '').replace(/<[^>]*>/g, ' ').trim();
    this.charCount = text.length;
    this.wordCount = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
    
    // Auto calcular tiempo estimado de lectura
    if (this.wordCount > 0) {
      const mins = Math.max(1, Math.ceil(this.wordCount / 200));
      this.editingPost.reading_time = `${mins} min`;
    } else {
      this.editingPost.reading_time = '1 min';
    }
  }

  insertFormatting(startTag: string, endTag: string = ''): void {
    const text = this.editingPost.content || '';
    if (!this.contentTextArea?.nativeElement) {
      this.editingPost.content = text + `${startTag}${endTag}`;
      this.updateStats();
      return;
    }

    const textarea = this.contentTextArea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end) || 'Texto aquí';
    const replacement = `${startTag}${selectedText}${endTag}`;

    this.editingPost.content = text.substring(0, start) + replacement + text.substring(end);
    this.updateStats();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + startTag.length, start + startTag.length + selectedText.length);
    }, 0);
  }

  insertBold(): void {
    this.insertFormatting('<strong>', '</strong>');
  }

  insertItalic(): void {
    this.insertFormatting('<em>', '</em>');
  }

  insertH2(): void {
    this.insertFormatting('<h2 class="text-2xl font-bold text-gray-900 mt-6 mb-3">', '</h2>');
  }

  insertH3(): void {
    this.insertFormatting('<h3 class="text-xl font-bold text-gray-800 mt-4 mb-2">', '</h3>');
  }

  insertQuote(): void {
    this.insertFormatting('<blockquote class="p-4 my-4 border-l-4 border-blue-500 bg-blue-50/50 rounded-r-xl italic text-gray-700">', '</blockquote>');
  }

  insertList(): void {
    this.insertFormatting('<ul class="list-disc list-inside space-y-1 my-3 text-gray-700">\n  <li>', '</li>\n</ul>');
  }

  insertCallout(): void {
    this.insertFormatting('<div class="p-4 my-4 bg-gradient-to-r from-blue-50 to-sky-50 border-l-4 border-blue-600 rounded-r-2xl">\n  <p class="text-sm font-semibold text-blue-900">', '</p>\n</div>');
  }

  insertLink(): void {
    this.insertFormatting('<a href="https://nehoraj.com" target="_blank" class="text-blue-600 font-semibold underline hover:text-blue-800">', '</a>');
  }

  // ==========================================
  // ASISTENTE DE IA PARA REDACTORES
  // ==========================================

  openAiModal(action: 'draft' | 'improve' | 'summary' | 'title'): void {
    this.aiAction = action;
    this.aiError = '';
    this.aiPrompt = '';
    this.showAiModal = true;
  }

  closeAiModal(): void {
    this.showAiModal = false;
    this.aiLoading = false;
    this.aiError = '';
  }

  async generateWithAi(): Promise<void> {
    this.aiError = '';
    this.aiLoading = true;

    try {
      if (this.aiAction === 'draft') {
        if (!this.aiPrompt.trim()) {
          this.aiError = 'Por favor escribe el tema o idea del artículo.';
          this.aiLoading = false;
          return;
        }

        const prompt = `Eres un redactor profesional de tecnología y negocios para Nehoraj.
Genera un borrador completo de un artículo de blog sobre el tema: "${this.aiPrompt}".
IMPORTANTE: Debes responder ÚNICAMENTE en formato JSON plano (sin bloques de código markdown como \`\`\`json) con esta estructura exacta:
{
  "title": "Título llamativo",
  "excerpt": "Extracto o resumen de 2 oraciones para la tarjeta del blog",
  "category": "IA" o "Software" o "Drones" o "Negocios",
  "tags": ["Tag1", "Tag2"],
  "content": "<p>Párrafo introductorio...</p><h2>Subtítulo 1</h2><p>Contenido detallado...</p><blockquote class=\\"p-4 my-4 border-l-4 border-blue-500 bg-blue-50/50 rounded-r-xl italic text-gray-700\\">Cita o frase destacada</blockquote><p>Conclusión...</p>"
}`;

        const raw = await this.openaiService.getResponse([{ role: 'user', content: prompt }], 1500);
        let cleaned = raw.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();

        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.title) this.editingPost.title = parsed.title;
          if (parsed.excerpt) this.editingPost.excerpt = parsed.excerpt;
          if (parsed.category && this.categories.includes(parsed.category)) this.editingPost.category = parsed.category;
          if (parsed.tags && Array.isArray(parsed.tags)) this.tagsInput = parsed.tags.join(', ');
          if (parsed.content) this.editingPost.content = parsed.content;
        } catch {
          // Si no es JSON válido, agregarlo como contenido directamente
          this.editingPost.content = raw;
        }

        this.updateStats();
        this.closeAiModal();
      } else if (this.aiAction === 'summary') {
        const text = (this.editingPost.content || '').replace(/<[^>]*>/g, ' ');
        if (!text.trim()) {
          this.aiError = 'El borrador está vacío. Escribe algo primero.';
          this.aiLoading = false;
          return;
        }

        const prompt = `Crea un extracto o resumen breve y muy atractivo (máximo 2 oraciones) para la tarjeta de previsualización del siguiente artículo:\n\n${text.substring(0, 2000)}`;
        const result = await this.openaiService.getResponse([{ role: 'user', content: prompt }], 300);
        this.editingPost.excerpt = result.trim().replace(/^["']|["']$/g, '');
        this.closeAiModal();
      } else if (this.aiAction === 'improve') {
        if (!this.editingPost.content.trim()) {
          this.aiError = 'El contenido está vacío.';
          this.aiLoading = false;
          return;
        }

        const prompt = `Mejora la redacción, la gramática y el formato HTML del siguiente artículo de blog para Nehoraj. Mención de marca profesional, estructura limpia con etiquetas HTML (<h2>, <p>, <strong>, <blockquote>, <ul>, <li>). Devuelve ÚNICAMENTE el código HTML mejorado:\n\n${this.editingPost.content}`;
        const result = await this.openaiService.getResponse([{ role: 'user', content: prompt }], 1500);
        let cleaned = result.trim();
        if (cleaned.startsWith('```html')) cleaned = cleaned.replace(/^```html/, '').replace(/```$/, '').trim();
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();

        this.editingPost.content = cleaned;
        this.updateStats();
        this.closeAiModal();
      } else if (this.aiAction === 'title') {
        const text = (this.editingPost.content || this.editingPost.excerpt || '').replace(/<[^>]*>/g, ' ');
        if (!text.trim()) {
          this.aiError = 'Escribe primero algo de contenido o extracto.';
          this.aiLoading = false;
          return;
        }

        const prompt = `Genera un título muy llamativo, profesional y optimizado para SEO para un artículo de blog sobre el siguiente tema:\n\n${text.substring(0, 1500)}`;
        const result = await this.openaiService.getResponse([{ role: 'user', content: prompt }], 150);
        this.editingPost.title = result.trim().replace(/^["']|["']$/g, '');
        this.closeAiModal();
      }
    } catch (err: any) {
      console.error('Error al consultar IA:', err);
      this.aiError = 'Error al comunicar con la IA: ' + (err.message || 'Error desconocido.');
    } finally {
      this.aiLoading = false;
    }
  }

  // ==========================================
  // DRAG AND DROP DE ARCHIVOS
  // ==========================================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDropFile(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.uploadSelectedFile(file);
    }
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
    if (file) {
      this.uploadSelectedFile(file);
      event.target.value = '';
    }
  }

  uploadSelectedFile(file: File): void {
    if (!file) return;

    // Verificar tamaño antes de subir
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 4.5) {
      const confirmar = confirm(
        `El archivo pesa ${fileSizeMB.toFixed(2)}MB y supera el límite de 4.5MB.\n\n¿Quieres continuar de todos modos? (Solo funcionará en entorno local)`
      );
      if (!confirmar) return;
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
  // IMÁGENES DE RESPONSABILIDAD SOCIAL
  // ==========================================

  openSocialMedia(): void {
    this.socialImagesError = '';
    this.newSocialCampaignTitle = '';
    this.newSocialCampaignDescription = '';
    this.viewState = 'social-media';
    this.loadSocialImages();
  }

  loadSocialImages(): void {
    this.socialImagesLoading = true;
    this.socialImagesError = '';
    this.blogService.getSocialImages().subscribe({
      next: (data) => {
        this.socialImages = data;
        this.socialImagesLoading = false;
      },
      error: (err) => {
        this.socialImagesLoading = false;
        this.socialImagesError = err.error?.error || 'Error al cargar las imágenes.';
      }
    });
  }

  get socialCampaignTitles(): string[] {
    return Array.from(new Set(this.socialImages.map(img => img.campaign_title)));
  }

  get groupedSocialImages(): { title: string; description: string; images: SocialImage[] }[] {
    const groups = new Map<string, SocialImage[]>();
    for (const img of this.socialImages) {
      const list = groups.get(img.campaign_title) || [];
      list.push(img);
      groups.set(img.campaign_title, list);
    }
    return Array.from(groups.entries()).map(([title, images]) => ({
      title,
      description: images[0]?.campaign_description || '',
      images: images.slice().sort((a, b) => a.sort_order - b.sort_order)
    }));
  }

  onSocialImageFileSelected(event: any): void {
    const file: File = event.target.files[0];
    const title = this.newSocialCampaignTitle.trim();

    if (!file) return;
    if (!title) {
      alert('Escribe el nombre de la campaña antes de subir una foto.');
      event.target.value = '';
      return;
    }

    this.uploadingSocialImage = true;
    this.socialUploadProgress = 0;

    this.blogService.uploadFile(file).subscribe({
      next: (res: any) => {
        if ('progress' in res) {
          this.socialUploadProgress = res.progress;
          return;
        }
        if (!('url' in res)) return;

        const existingInCampaign = this.socialImages.filter(img => img.campaign_title === title);
        const overallMaxOrder = this.socialImages.length
          ? Math.max(...this.socialImages.map(img => img.sort_order))
          : -1;
        const sortOrder = existingInCampaign.length
          ? Math.max(...existingInCampaign.map(img => img.sort_order)) + 1
          : overallMaxOrder + 1;

        this.blogService.createSocialImage({
          campaign_title: title,
          campaign_description: this.newSocialCampaignDescription.trim(),
          image_url: res.url,
          sort_order: sortOrder
        }).subscribe({
          next: () => {
            this.uploadingSocialImage = false;
            this.socialUploadProgress = 0;
            this.loadSocialImages();
          },
          error: (err) => {
            this.uploadingSocialImage = false;
            alert('Error al registrar la foto: ' + (err.error?.error || err.message));
          }
        });
      },
      error: (err) => {
        this.uploadingSocialImage = false;
        this.socialUploadProgress = 0;
        alert('Error al subir la foto: ' + (err.error?.error || err.message));
      }
    });

    event.target.value = '';
  }

  onDeleteSocialImage(image: SocialImage): void {
    if (!confirm('¿Eliminar esta foto de forma permanente?')) return;
    this.blogService.deleteSocialImage(image.id).subscribe({
      next: () => this.loadSocialImages(),
      error: (err) => alert('Error al eliminar la foto: ' + (err.error?.error || err.message))
    });
  }

  openEditCampaign(grupo: { title: string; description: string }): void {
    this.editingCampaignTitle = grupo.title;
    this.editCampaignNewTitle = grupo.title;
    this.editCampaignNewDescription = grupo.description;
    this.editCampaignError = '';
  }

  cancelEditCampaign(): void {
    this.editingCampaignTitle = null;
    this.editCampaignError = '';
  }

  onSaveCampaign(event?: Event): void {
    event?.preventDefault();
    if (!this.editingCampaignTitle) return;

    const newTitle = this.editCampaignNewTitle.trim();
    if (!newTitle) {
      this.editCampaignError = 'El nombre de la campaña no puede estar vacío.';
      return;
    }

    this.editCampaignLoading = true;
    this.editCampaignError = '';

    this.blogService.updateSocialCampaign(this.editingCampaignTitle, newTitle, this.editCampaignNewDescription.trim()).subscribe({
      next: () => {
        this.editCampaignLoading = false;
        this.editingCampaignTitle = null;
        this.loadSocialImages();
      },
      error: (err) => {
        this.editCampaignLoading = false;
        this.editCampaignError = err.error?.error || 'Error al actualizar la campaña.';
      }
    });
  }

  // ==========================================
  // GENERAL
  // ==========================================

  onCloseAdmin(): void {
    this.closeAdmin.emit();
  }
}
