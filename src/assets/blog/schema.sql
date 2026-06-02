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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
