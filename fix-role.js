const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const updated = await prisma.user.update({
    where: { email: 'admin@gmail.com' },
    data: { role: 'admin' },
  })
  console.log('Fixed role:', JSON.stringify(updated.role))
}

main().finally(() => prisma.$disconnect())