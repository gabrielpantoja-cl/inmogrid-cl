/**
 * Script para verificar perfil de usuario en la base de datos
 * Uso: npx tsx scripts/check-user-profile.ts [email|username]
 *
 * Ejemplos:
 *   npx tsx scripts/check-user-profile.ts usuario@example.com
 *   npx tsx scripts/check-user-profile.ts usuario-ejemplo
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserProfile() {
  const searchValue = process.argv[2];

  if (!searchValue) {
    console.error('❌ Error: Debes proporcionar un email o username');
    console.log('\nUso: npx tsx scripts/check-user-profile.ts [email|username]');
    console.log('\nEjemplos:');
    console.log('  npx tsx scripts/check-user-profile.ts usuario@example.com');
    console.log('  npx tsx scripts/check-user-profile.ts usuario-ejemplo');
    process.exit(1);
  }

  console.log(`🔍 Buscando perfil de usuario: ${searchValue}\n`);

  // Buscar por email o username
  const user = searchValue.includes('@')
    ? await prisma.user.findUnique({
        where: { email: searchValue },
        include: {
          plants: true,
          posts: true,
          collections: true,
        },
      })
    : await prisma.user.findUnique({
        where: { username: searchValue },
        include: {
          plants: true,
          posts: true,
          collections: true,
        },
      });

  if (user) {
    const searchType = searchValue.includes('@') ? 'email' : 'username';
    console.log(`✅ Usuario encontrado por ${searchType}:`);
    console.log('  - ID:', user.id);
    console.log('  - Name:', user.name || '❌ NO CONFIGURADO');
    console.log('  - Username:', user.username || '❌ NO CONFIGURADO');
    console.log('  - Email:', user.email);
    console.log('  - Bio:', user.bio || '❌ NO CONFIGURADO');
    console.log('  - Tagline:', user.tagline || '❌ NO CONFIGURADO');
    console.log('  - Profession:', user.profession || '❌ NO CONFIGURADO');
    console.log('  - Location:', user.location || '❌ NO CONFIGURADO');
    console.log('  - Public Profile:', user.isPublicProfile ? '✅ SÍ' : '❌ NO');
    console.log('  - Image:', user.image || '❌ NO CONFIGURADO');
    console.log('  - Cover Image:', user.coverImageUrl || '❌ NO CONFIGURADO');
    console.log('\n📊 Contenido:');
    console.log('  - Plantas:', user.plants?.length || 0);
    console.log('  - Posts:', user.posts?.length || 0);
    console.log('  - Colecciones:', user.collections?.length || 0);

    if (user.plants && user.plants.length > 0) {
      console.log('\n🌱 Plantas:');
      user.plants.forEach((plant, i) => {
        console.log(`  ${i + 1}. ${plant.name} (${plant.slug}) - Favorita: ${plant.isFavorite ? '❤️' : '🤍'}`);
      });
    }

    if (user.posts && user.posts.length > 0) {
      console.log('\n📝 Posts:');
      user.posts.forEach((post, i) => {
        console.log(`  ${i + 1}. ${post.title} (${post.slug}) - Publicado: ${post.published ? '✅' : '❌'}`);
      });
    }

    if (user.collections && user.collections.length > 0) {
      console.log('\n📚 Colecciones:');
      user.collections.forEach((collection, i) => {
        console.log(`  ${i + 1}. ${collection.name} (${collection.slug}) - Pública: ${collection.isPublic ? '✅' : '❌'}`);
      });
    }
  } else {
    console.log(`❌ No se encontró usuario con ${searchValue.includes('@') ? 'email' : 'username'}: ${searchValue}`);
  }

  await prisma.$disconnect();
}

checkUserProfile()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
