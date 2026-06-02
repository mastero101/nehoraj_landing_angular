import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../services/blog.service';
import { BlogPost } from '../../models/blog.model';

interface BlogComment {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.css']
})
export class BlogDetailComponent implements OnInit {
  @Input() postId: string = '';
  @Output() goBack = new EventEmitter<void>();

  post: BlogPost | null = null;
  loading: boolean = true;
  shareLinkCopied = false;
  comments: BlogComment[] = [];
  commentAuthor = '';
  commentMessage = '';
  commentError = '';

  constructor(private blogService: BlogService) {}

  ngOnInit(): void {
    if (this.postId) {
      this.loadPost();
    }
  }

  loadPost(): void {
    this.loading = true;
    this.blogService.getPostById(this.postId).subscribe({
      next: (data) => {
        this.post = data;
        this.loadComments();
        this.loading = false;
        // Hacer scroll automático al inicio al cargar el artículo
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      error: (err) => {
        console.error('Error al cargar detalle del post:', err);
        this.loading = false;
      }
    });
  }

  onGoBack(): void {
    this.goBack.emit();
  }

  get encodedTitle(): string {
    return encodeURIComponent(this.post?.title || 'Artículo de Nehoraj');
  }

  get encodedUrl(): string {
    if (typeof window === 'undefined') return '';
    return encodeURIComponent(window.location.href);
  }

  get whatsappShareUrl(): string {
    return `https://wa.me/?text=${this.encodedTitle}%20${this.encodedUrl}`;
  }

  get xShareUrl(): string {
    return `https://twitter.com/intent/tweet?text=${this.encodedTitle}&url=${this.encodedUrl}`;
  }

  get facebookShareUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${this.encodedUrl}`;
  }

  get linkedInShareUrl(): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${this.encodedUrl}`;
  }

  copyArticleLink(): void {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.shareLinkCopied = true;
      setTimeout(() => {
        this.shareLinkCopied = false;
      }, 2000);
    });
  }

  addComment(): void {
    this.commentError = '';
    const author = this.commentAuthor.trim();
    const message = this.commentMessage.trim();

    if (!author || !message) {
      this.commentError = 'Escribe tu nombre y comentario para publicar.';
      return;
    }

    const comment: BlogComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author,
      message,
      createdAt: new Date().toISOString()
    };

    this.comments = [comment, ...this.comments];
    this.persistComments();
    this.commentAuthor = '';
    this.commentMessage = '';
  }

  private commentsStorageKey(): string {
    return `blog_comments_${this.postId}`;
  }

  private loadComments(): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(this.commentsStorageKey());
    if (!raw) {
      this.comments = [];
      return;
    }
    try {
      this.comments = JSON.parse(raw) as BlogComment[];
    } catch {
      this.comments = [];
      localStorage.removeItem(this.commentsStorageKey());
    }
  }

  private persistComments(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.commentsStorageKey(), JSON.stringify(this.comments));
  }
}
