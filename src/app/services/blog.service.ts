import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BlogPost } from '../models/blog.model';
import { AuthResponse, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private apiUrl = '/api';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    let initialUser: User | null = null;
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('blog_user');
      if (storedUser) {
        try {
          initialUser = JSON.parse(storedUser);
        } catch (e) {
          localStorage.removeItem('blog_user');
        }
      }
    }
    this.currentUserSubject = new BehaviorSubject<User | null>(initialUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
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

  register(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      map(response => {
        if (isPlatformBrowser(this.platformId) && response.token) {
          localStorage.setItem('blog_token', response.token);
          localStorage.setItem('blog_user', JSON.stringify(response.user));
        }
        this.currentUserSubject.next(response.user);
        return response;
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('blog_token');
      localStorage.removeItem('blog_user');
    }
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('blog_token');
    }
    return false;
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
}
