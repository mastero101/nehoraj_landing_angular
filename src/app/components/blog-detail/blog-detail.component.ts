import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { BlogService } from '../../services/blog.service';
import { BlogPost, BlogComment } from '../../models/blog.model';

// Bloques que un redactor pudo haber escrito a mano en HTML: se respetan tal cual,
// sin envolverlos en <p> ni tocar los saltos de línea que traigan dentro.
const BLOCK_TAG_PATTERN =
  /^<(p|h[1-6]|ul|ol|li|blockquote|pre|div|figure|table|img|audio|video|iframe|hr)[\s>/]/i;

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.css']
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  @Input() postId: string = '';
  @Input() shareUrl: string = '';
  @Output() goBack = new EventEmitter<void>();

  post: BlogPost | null = null;
  loading: boolean = true;
  shareLinkCopied = false;
  comments: BlogComment[] = [];
  commentsLoading = false;
  commentAuthor = '';
  commentMessage = '';
  commentError = '';
  commentSubmitting = false;

  constructor(
    private blogService: BlogService,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit(): void {
    if (this.postId) {
      this.loadPost();
    }
  }

  ngOnDestroy(): void {
    this.restoreDefaultMetaTags();
  }

  loadPost(): void {
    this.loading = true;
    this.blogService.getPostById(this.postId).subscribe({
      next: (data) => {
        this.post = data;
        this.updateMetaTags(data);
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

  private updateMetaTags(post: BlogPost): void {
    const pageTitle = `${post.title} | Grupo Nehoraj`;
    const excerptText = post.excerpt || this.extractCleanSnippet(post.content);
    const currentUrl = this.shareUrl || (typeof window !== 'undefined' ? window.location.href : `https://nehoraj.com/?post=${post.id}`);
    const coverImage = post.cover_image || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1200&q=80';

    this.titleService.setTitle(pageTitle);

    // Meta Description & Open Graph / Twitter Tags
    this.metaService.updateTag({ name: 'description', content: excerptText });
    this.metaService.updateTag({ property: 'og:title', content: post.title });
    this.metaService.updateTag({ property: 'og:description', content: excerptText });
    this.metaService.updateTag({ property: 'og:image', content: coverImage });
    this.metaService.updateTag({ property: 'og:url', content: currentUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: post.title });
    this.metaService.updateTag({ name: 'twitter:description', content: excerptText });
    this.metaService.updateTag({ name: 'twitter:image', content: coverImage });
  }

  private restoreDefaultMetaTags(): void {
    this.titleService.setTitle('Grupo Nehoraj - Transformación Digital & Innovación Tecnológica');
    const defaultDesc = 'Transformamos tu negocio con soluciones tecnológicas personalizadas, combinando inteligencia artificial, desarrollo de software a medida y aplicaciones innovadoras.';
    const defaultUrl = 'https://nehoraj.com/';
    const defaultImg = 'https://nehoraj.com/assets/images/og-default.jpg';

    this.metaService.updateTag({ name: 'description', content: defaultDesc });
    this.metaService.updateTag({ property: 'og:title', content: 'Grupo Nehoraj' });
    this.metaService.updateTag({ property: 'og:description', content: defaultDesc });
    this.metaService.updateTag({ property: 'og:image', content: defaultImg });
    this.metaService.updateTag({ property: 'og:url', content: defaultUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: 'Grupo Nehoraj' });
    this.metaService.updateTag({ name: 'twitter:description', content: defaultDesc });
    this.metaService.updateTag({ name: 'twitter:image', content: defaultImg });
  }

  private extractCleanSnippet(htmlOrText: string): string {
    if (!htmlOrText) return 'Artículo del blog de Grupo Nehoraj';
    const plainText = htmlOrText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return plainText.length > 160 ? `${plainText.substring(0, 157)}...` : plainText;
  }

  onGoBack(): void {
    this.goBack.emit();
  }

  // Convierte el texto plano del editor en HTML legible: una línea en blanco
  // separa párrafos, un salto simple se vuelve <br>. Los bloques que ya
  // empiezan con una etiqueta de bloque (el redactor escribió HTML a mano)
  // se dejan intactos.
  get formattedContent(): string {
    const raw = this.post?.content || '';
    if (!raw) return '';

    const normalized = raw.replace(/\r\n?/g, '\n');

    return normalized
      .split(/\n{2,}/)
      .map(block => block.trim())
      .filter(block => block.length > 0)
      .map(block => BLOCK_TAG_PATTERN.test(block) ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  get encodedTitle(): string {
    return encodeURIComponent(this.post?.title || 'Artículo de Nehoraj');
  }

  get encodedUrl(): string {
    const urlToShare = this.shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
    return encodeURIComponent(urlToShare);
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
    const urlToShare = this.shareUrl || window.location.href;
    navigator.clipboard.writeText(urlToShare).then(() => {
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

    this.commentSubmitting = true;
    this.blogService.addComment(this.postId, author, message).subscribe({
      next: (comment) => {
        this.commentSubmitting = false;
        this.comments = [comment, ...this.comments];
        this.commentAuthor = '';
        this.commentMessage = '';
      },
      error: (err) => {
        this.commentSubmitting = false;
        this.commentError = err.error?.error || 'Error al publicar el comentario. Intenta de nuevo.';
      }
    });
  }

  private loadComments(): void {
    this.commentsLoading = true;
    this.blogService.getComments(this.postId).subscribe({
      next: (data) => {
        this.comments = data;
        this.commentsLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar comentarios:', err);
        this.commentsLoading = false;
      }
    });
  }
}
