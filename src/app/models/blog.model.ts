export interface BlogPost {
  id?: string;
  title: string;
  excerpt?: string;
  content: string;
  category: string;
  author_name?: string;
  author_role?: string;
  author_avatar?: string;
  cover_image?: string;
  tags?: string[];
  reading_time?: string;
  created_at?: string;
  updated_at?: string;
}
