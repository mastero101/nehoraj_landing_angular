import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../services/blog.service';
import { BlogPost } from '../../models/blog.model';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.css']
})
export class BlogListComponent implements OnInit {
  posts: BlogPost[] = [];
  filteredPosts: BlogPost[] = [];
  categories: string[] = ['Todos', 'IA', 'Software', 'Drones', 'Negocios'];
  selectedCategory: string = 'Todos';
  searchQuery: string = '';
  loading: boolean = true;

  @Output() selectPost = new EventEmitter<string>();
  @Output() openAdmin = new EventEmitter<void>();

  constructor(public blogService: BlogService) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.loading = true;
    this.blogService.getPosts().subscribe({
      next: (data) => {
        this.posts = data;
        this.filterPosts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar posts:', err);
        this.loading = false;
      }
    });
  }

  selectCategoryFilter(category: string): void {
    this.selectedCategory = category;
    this.filterPosts();
  }

  filterPosts(): void {
    this.filteredPosts = this.posts.filter(post => {
      const matchesCategory = this.selectedCategory === 'Todos' || post.category === this.selectedCategory;
      const matchesSearch = !this.searchQuery || 
        post.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
        (post.excerpt && post.excerpt.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(this.searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }

  onSelectPost(id: string): void {
    if (id) this.selectPost.emit(id);
  }

  onDeletePost(event: Event, id: string): void {
    event.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este artículo?')) {
      this.blogService.deletePost(id).subscribe({
        next: () => {
          this.loadPosts();
        },
        error: (err) => {
          alert('Error al eliminar artículo: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  onOpenAdmin(): void {
    this.openAdmin.emit();
  }
}
