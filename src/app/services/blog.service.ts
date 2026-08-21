import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BlogPost, BlogComment } from '../models/blog.model';
import { AuthResponse, User } from '../models/user.model';
import { SocialImage } from '../models/social-image.model';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private apiUrl = '/api';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  // Aviso para la UI cuando la sesión se cae sola (token caducado, cuenta
  // eliminada). Lleva el motivo para poder explicárselo al redactor en vez de
  // devolverlo al login sin decir nada.
  private sessionExpiredSubject = new BehaviorSubject<string>('');
  public sessionExpired$: Observable<string> = this.sessionExpiredSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    let initialUser: User | null = null;
    let expiredOnBoot = '';

    if (isPlatformBrowser(this.platformId)) {
      // Antes se restauraba el usuario mirando solo si había algo guardado, sin
      // comprobar el token. Un token de hace más de 24 horas pintaba el panel como
      // si la sesión siguiera viva y el fallo no aparecía hasta pulsar publicar,
      // con el artículo ya escrito. Ahora la sesión muerta se purga al arrancar.
      const token = localStorage.getItem('blog_token');

      if (token && this.isTokenExpired(token)) {
        this.clearSession();
        // Se recuerda el motivo para poder explicárselo al redactor cuando abra
        // el panel, en vez de plantarle un login sin más.
        expiredOnBoot = 'Tu sesión expiró. Inicia sesión de nuevo para publicar.';
      } else {
        const storedUser = localStorage.getItem('blog_user');
        if (storedUser) {
          try {
            initialUser = JSON.parse(storedUser);
          } catch (e) {
            localStorage.removeItem('blog_user');
          }
        }
      }
    }

    this.currentUserSubject = new BehaviorSubject<User | null>(initialUser);
    this.currentUser$ = this.currentUserSubject.asObservable();

    if (expiredOnBoot) {
      this.sessionExpiredSubject.next(expiredOnBoot);
    }
  }

  // ==========================================
  // VIGENCIA DEL TOKEN
  // ==========================================

  private decodeTokenPayload(token: string): { exp?: number } | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded));
    } catch (e) {
      return null;
    }
  }

  // Un token que no se puede leer se considera caducado: es preferible pedir
  // login de más que dejar entrar al editor con una credencial que el backend
  // va a rechazar. El margen de 60 s evita que una sesión que expira mientras
  // se envía el artículo falle justo en el POST.
  isTokenExpired(token: string): boolean {
    const payload = this.decodeTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }
    return payload.exp * 1000 <= Date.now() + 60_000;
  }

  private clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('blog_token');
      localStorage.removeItem('blog_user');
    }
  }

  // Cierre de sesión forzado por el sistema (a diferencia de logout(), que es
  // el usuario pulsando "salir"): limpia todo y avisa a la UI del motivo.
  forceLogout(reason: string): void {
    // Se mira el token en crudo, no isLoggedIn(): un token ya caducado sigue
    // siendo una sesión que hay que cerrar y explicar.
    const hadSession = !!this.getToken() || !!this.currentUserSubject.value;
    this.clearSession();
    this.currentUserSubject.next(null);
    if (hadSession) {
      this.sessionExpiredSubject.next(reason);
    }
  }

  clearSessionExpiredNotice(): void {
    this.sessionExpiredSubject.next('');
  }

  // Revalida la sesión contra el servidor. La firma y la fecha del JWT no
  // cuentan toda la verdad: la cuenta pudo eliminarse o cambiar de rol después
  // de emitirse el token. Devuelve el usuario fresco o cierra la sesión.
  verifySession(): Observable<User | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(null);
    }

    const token = localStorage.getItem('blog_token');
    if (!token) {
      return of(null);
    }

    if (this.isTokenExpired(token)) {
      this.forceLogout('Tu sesión expiró. Inicia sesión de nuevo para publicar.');
      return of(null);
    }

    return this.http.get<{ user: User }>(`${this.apiUrl}/auth/me`, { headers: this.getHeaders() }).pipe(
      map(response => {
        const user = response.user;
        this.currentUserSubject.next(user);
        localStorage.setItem('blog_user', JSON.stringify(user));
        return user;
      }),
      catchError((err: HttpErrorResponse) => {
        // Solo cerramos la sesión si el servidor dice que la credencial no
        // sirve. Ante un 500 o una caída de red mantenemos la sesión: el token
        // puede ser perfectamente válido y expulsar al redactor sería peor.
        if (err.status === 401) {
          this.forceLogout(err.error?.error || 'Tu sesión expiró. Inicia sesión de nuevo para publicar.');
        }
        return of(null);
      })
    );
  }

  // ==========================================
  // BORRADOR EN CURSO
  // ==========================================
  // Si la sesión muere con un artículo a medias, el texto se guarda en local
  // para poder devolvérselo al redactor tras volver a entrar.

  saveDraft(draft: BlogPost): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem('blog_draft', JSON.stringify({ savedAt: Date.now(), post: draft }));
    } catch (e) {
      // Cuota de localStorage llena (un artículo con imágenes en base64, por
      // ejemplo): no vale la pena romper el flujo por no poder guardar copia.
    }
  }

  getDraft(): BlogPost | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem('blog_draft');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.post || null;
    } catch (e) {
      localStorage.removeItem('blog_draft');
      return null;
    }
  }

  clearDraft(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('blog_draft');
    }
  }

  // Obtener headers con JWT si está autenticado
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('blog_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================

  register(username: string, password: string, role: string = 'author'): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/auth/register`,
      { username, password, role },
      { headers: this.getHeaders() }
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      map(response => {
        if (isPlatformBrowser(this.platformId) && response.token) {
          localStorage.setItem('blog_token', response.token);
          localStorage.setItem('blog_user', JSON.stringify(response.user));
        }
        this.currentUserSubject.next(response.user);
        this.sessionExpiredSubject.next('');
        return response;
      })
    );
  }

  // Salida voluntaria del usuario: se descarta también el borrador, porque aquí
  // sí hubo una decisión consciente de cerrar (a diferencia de forceLogout()).
  logout(): void {
    this.clearSession();
    this.clearDraft();
    this.currentUserSubject.next(null);
    this.sessionExpiredSubject.next('');
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/auth/change-password`,
      { currentPassword, newPassword },
      { headers: this.getHeaders() }
    );
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/auth/users`, { headers: this.getHeaders() });
  }

  adminResetPassword(userId: string, newPassword: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/auth/admin-reset-password`,
      { userId, newPassword },
      { headers: this.getHeaders() }
    );
  }

  updateMyAvatar(avatarUrl: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/auth/me/avatar`,
      { avatar_url: avatarUrl },
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        const current = this.currentUserSubject.value;
        if (current) {
          const updatedUser = { ...current, avatar_url: avatarUrl };
          this.currentUserSubject.next(updatedUser);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('blog_user', JSON.stringify(updatedUser));
          }
        }
        return response;
      })
    );
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/auth/users/${userId}/role`,
      { role },
      { headers: this.getHeaders() }
    );
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/auth/users/${userId}`, { headers: this.getHeaders() });
  }

  // Tener un token guardado no significa tener sesión: hay que comprobar que
  // siga vigente, o el panel se abre con una credencial que el backend rechaza.
  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const token = localStorage.getItem('blog_token');
    return !!token && !this.isTokenExpired(token);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('blog_token');
    }
    return null;
  }

  // ==========================================
  // ARTÍCULOS DEL BLOG
  // ==========================================

  getPosts(category?: string): Observable<BlogPost[]> {
    if (!isPlatformBrowser(this.platformId)) {
      // Durante SSR evitamos pedir /api para no disparar navegación/ruteo del dev server.
      return of([]);
    }

    let url = `${this.apiUrl}/blog`;
    if (category && category !== 'Todos') {
      url += `?category=${encodeURIComponent(category)}`;
    }
    return this.http.get<BlogPost[]>(url);
  }

  getPostById(id: string): Observable<BlogPost> {
    if (!isPlatformBrowser(this.platformId)) {
      return throwError(() => new Error('La carga de detalle del blog solo se realiza en navegador.'));
    }

    return this.http.get<BlogPost>(`${this.apiUrl}/blog/${id}`);
  }

  createPost(post: BlogPost): Observable<BlogPost> {
    return this.http.post<BlogPost>(`${this.apiUrl}/blog`, post, { headers: this.getHeaders() });
  }

  updatePost(id: string, post: BlogPost): Observable<BlogPost> {
    return this.http.put<BlogPost>(`${this.apiUrl}/blog/${id}`, post, { headers: this.getHeaders() });
  }

  deletePost(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/blog/${id}`, { headers: this.getHeaders() });
  }

  // ==========================================
  // COMENTARIOS DE ARTÍCULOS
  // ==========================================

  getComments(postId: string): Observable<BlogComment[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    return this.http.get<BlogComment[]>(`${this.apiUrl}/blog/${postId}/comments`);
  }

  addComment(postId: string, author: string, message: string): Observable<BlogComment> {
    return this.http.post<BlogComment>(`${this.apiUrl}/blog/${postId}/comments`, { author, message });
  }

  deleteComment(commentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/blog/comments/${commentId}`, { headers: this.getHeaders() });
  }

  // ==========================================
  // CARGA MULTIMEDIA A VERCEL BLOB
  // ==========================================

  uploadFile(file: File): Observable<{ progress: number } | { url: string }> {
    // Para subir binario directamente al backend express.raw(), configuramos headers específicos
    const token = this.getToken() || '';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name)
    });

    return new Observable(observer => {
      this.http.post<{ url: string }>(`${this.apiUrl}/upload`, file, {
        headers,
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (event: any) => {
          if (event.type === 1) {
            // Upload progress event
            const progress = Math.round((100 * event.loaded) / event.total);
            observer.next({ progress });
          } else if (event.type === 4) {
            // Upload complete event
            observer.next({ url: event.body.url });
            observer.complete();
          }
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  // ==========================================
  // IMÁGENES DE RESPONSABILIDAD SOCIAL
  // ==========================================

  getSocialImages(): Observable<SocialImage[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    return this.http.get<SocialImage[]>(`${this.apiUrl}/social-images`);
  }

  createSocialImage(image: Partial<SocialImage>): Observable<SocialImage> {
    return this.http.post<SocialImage>(`${this.apiUrl}/social-images`, image, { headers: this.getHeaders() });
  }

  deleteSocialImage(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/social-images/${id}`, { headers: this.getHeaders() });
  }

  updateSocialCampaign(oldTitle: string, newTitle: string, newDescription: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/social-images/campaign`,
      { old_title: oldTitle, new_title: newTitle, new_description: newDescription },
      { headers: this.getHeaders() }
    );
  }
}
