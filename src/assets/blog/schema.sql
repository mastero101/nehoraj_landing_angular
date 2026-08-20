-- =======================================================
-- SCHEMA DE LA BASE DE DATOS PARA BLOG NEHORAJ (SUPABASE)
-- =======================================================
--
-- Este script es idempotente: se puede volver a ejecutar entero sin errores.
-- (CREATE POLICY no admite IF NOT EXISTS, así que cada política se borra antes
-- de crearse. Antes no era así: al reejecutar el script para añadir una tabla
-- nueva, el primer CREATE POLICY repetido abortaba el resto.)
--
-- IMPORTANTE - ORDEN DE APLICACIÓN:
-- Este script deja las tablas en modo "solo lectura pública". El backend escribe
-- y borra con una clave secreta de Supabase (service_role / sb_secret_...), que
-- ignora RLS; la autorización real la hace authenticateToken con nuestro JWT.
-- Antes de ejecutarlo, configura SUPABASE_SECRET_KEY (ver .env.example) o el
-- login, la publicación y la moderación dejarán de funcionar.

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
-- Se recomienda cambiarla en el primer login.
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

-- 6. Tabla de Comentarios de Artículos del Blog
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    author VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS blog_comments_post_id_idx ON blog_comments (post_id);

-- =======================================================
-- 7. ROW LEVEL SECURITY
-- =======================================================
--
-- Criterio: la clave que viaja en SUPABASE_KEY (anon / sb_publishable_...) es
-- PÚBLICA por diseño, así que lo que permitan estas políticas se lo permitimos
-- a cualquiera que tenga esa clave. Por eso aquí solo se concede lectura de lo
-- que ya es público en la web. Todo lo que escribe o borra pasa por el backend
-- con la clave secreta, que salta RLS y aplica nuestra propia autorización.

-- --- blog_users: sin acceso público -------------------------------------
-- Contiene los hashes de contraseña. RLS activo y CERO políticas = nadie con la
-- clave pública puede leer ni escribir. Solo entra el backend (clave secreta).
ALTER TABLE blog_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_users_select_public" ON blog_users;
DROP POLICY IF EXISTS "blog_users_insert_public" ON blog_users;
DROP POLICY IF EXISTS "blog_users_delete_public" ON blog_users;

-- --- blog_posts: lectura pública -----------------------------------------
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_select_public" ON blog_posts;
CREATE POLICY "blog_posts_select_public" ON blog_posts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "blog_posts_insert_public" ON blog_posts;
DROP POLICY IF EXISTS "blog_posts_update_public" ON blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete_public" ON blog_posts;

-- --- social_images: lectura pública --------------------------------------
ALTER TABLE social_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_images_select_public" ON social_images;
CREATE POLICY "social_images_select_public" ON social_images
    FOR SELECT USING (true);

-- Se retiran las de escritura/borrado abierto que existían antes.
DROP POLICY IF EXISTS "social_images_insert_public" ON social_images;
DROP POLICY IF EXISTS "social_images_delete_public" ON social_images;

-- --- blog_comments: lectura e inserción públicas, SIN borrado -------------
-- Aquí estaba el fallo que hacía desaparecer los comentarios: la política
-- "blog_comments_delete_public" permitía DELETE a cualquiera que tuviera la
-- clave pública. El chequeo de admin del backend no protegía nada, porque el
-- borrado se podía hacer contra la base de datos directamente, sin pasar por
-- la API. La moderación sigue funcionando: el backend borra con la clave
-- secreta tras validar que el JWT sea de un admin.
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_comments_select_public" ON blog_comments;
CREATE POLICY "blog_comments_select_public" ON blog_comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "blog_comments_insert_public" ON blog_comments;
CREATE POLICY "blog_comments_insert_public" ON blog_comments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "blog_comments_delete_public" ON blog_comments;
DROP POLICY IF EXISTS "blog_comments_update_public" ON blog_comments;
