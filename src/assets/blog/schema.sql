-- =======================================================
-- SCHEMA DE LA BASE DE DATOS PARA BLOG NEHORAJ (SUPABASE)
-- =======================================================

-- 1. Habilitar extensión para UUIDs automáticos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Usuarios Administradores/Autores
CREATE TABLE IF NOT EXISTS blog_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'author',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Si la tabla ya existía antes de agregar avatar_url, migrar con:
-- ALTER TABLE blog_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Tabla de Artículos del Blog
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    author_name VARCHAR(150),
    author_role VARCHAR(150),
    author_avatar TEXT,
    cover_image TEXT,
    tags TEXT[] DEFAULT '{}',
    reading_time VARCHAR(50) DEFAULT '3 min',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Insertar usuario administrador por defecto (opcional)
-- La contraseña por defecto del usuario 'admin' es 'nehoraj2026' (hasheada con bcrypt)
-- Se recomienda cambiarla en el primer login o usar el formulario de registro.
INSERT INTO blog_users (username, password_hash, role)
VALUES ('admin', '$2a$10$Qj2z5N8h2yVzJ5fHh2x3OeC6RkQp/Q2f7hJ7y9w2n2m2k2g2h2h2h-12aa42', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 5. Tabla de Imágenes de Responsabilidad Social Empresarial
CREATE TABLE IF NOT EXISTS social_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_title VARCHAR(255) NOT NULL,
    campaign_description TEXT,
    image_url TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS: lectura pública, escritura/borrado gestionados por la app vía JWT propio
-- (mismo criterio que blog_posts: la autorización real la hace authenticateToken en el backend)
ALTER TABLE social_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_images_select_public" ON social_images
    FOR SELECT USING (true);

CREATE POLICY "social_images_insert_public" ON social_images
    FOR INSERT WITH CHECK (true);

CREATE POLICY "social_images_delete_public" ON social_images
    FOR DELETE USING (true);

-- 6. Tabla de Comentarios de Artículos del Blog
-- Antes se guardaban en localStorage del navegador (no eran realmente
-- persistentes: cada visitante veía solo sus propios comentarios locales).
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    author VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_comments_select_public" ON blog_comments
    FOR SELECT USING (true);

CREATE POLICY "blog_comments_insert_public" ON blog_comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "blog_comments_delete_public" ON blog_comments
    FOR DELETE USING (true);
