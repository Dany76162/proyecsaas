const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.propertyPanorama.findMany({ 
  orderBy: { createdAt: 'desc' }, 
  take: 1 
}).then(p => { 
  console.log('DB Panorama URL:', p[0]?.url); 
  prisma.$disconnect(); 
}).catch(e => {
  console.error(e);
  prisma.$disconnect();
});
