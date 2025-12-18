import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Rol } from '../src/utils/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creando usuario administrador...');

  const email = 'admin@empresa.com';
  const password = 'admin123';

  // Verificar si ya existe
  const existing = await prisma.usuario.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('⚠️  El admin ya existe');
    return;
  }

  // Crear admin
  const hashPassword = await bcrypt.hash(password, 10);

  await prisma.usuario.create({
    data: {
      rol: Rol.ADMIN,
      nombre: 'Administrador',
      email,
      hashPassword,
      activo: true,
    },
  });

  console.log('✅ Admin creado exitosamente!');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('');
  console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });