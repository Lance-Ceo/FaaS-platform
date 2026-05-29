import 'dotenv/config';
import { PrismaClient, UserRole, Runtime, FunctionStatus, TriggerType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@faas.local' },
    update: {},
    create: {
      email: 'admin@faas.local',
      username: 'admin',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create developer user
  const devPassword = await bcrypt.hash('Dev@123456', 12);
  const developer = await prisma.user.upsert({
    where: { email: 'dev@faas.local' },
    update: {},
    create: {
      email: 'dev@faas.local',
      username: 'developer',
      passwordHash: devPassword,
      role: UserRole.DEVELOPER,
    },
  });
  console.log('✅ Developer user created:', developer.email);

  // Create sample functions
  const sampleFunctions = [
    {
      name: 'hello-world',
      description: 'A simple hello world function',
      runtime: Runtime.NODE18,
      status: FunctionStatus.READY,
      memory: 128,
      timeout: 30,
      replicas: 1,
      triggers: [TriggerType.HTTP],
      sourceCode: `module.exports = async (event, context) => {
  const name = event.body?.name || 'World';
  return context.status(200).succeed({ message: \`Hello, \${name}!\` });
};`,
      userId: developer.id,
    },
    {
      name: 'image-resizer',
      description: 'Resize images on demand',
      runtime: Runtime.PYTHON3,
      status: FunctionStatus.READY,
      memory: 256,
      timeout: 60,
      replicas: 2,
      triggers: [TriggerType.HTTP, TriggerType.QUEUE],
      sourceCode: `def handle(event, context):
    import json
    body = json.loads(event.body) if event.body else {}
    width = body.get('width', 800)
    height = body.get('height', 600)
    return {
        "statusCode": 200,
        "body": json.dumps({"message": f"Image resized to {width}x{height}"})
    }`,
      userId: developer.id,
    },
    {
      name: 'data-processor',
      description: 'Process and transform data payloads',
      runtime: Runtime.GO119,
      status: FunctionStatus.READY,
      memory: 64,
      timeout: 15,
      replicas: 3,
      triggers: [TriggerType.HTTP, TriggerType.CRON],
      sourceCode: `package function

import (
    "encoding/json"
    "fmt"
    "net/http"
)

func Handle(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "Data processed successfully",
        "status":  "ok",
    })
    fmt.Println("Data processor invoked")
}`,
      userId: developer.id,
    },
  ];

  for (const fn of sampleFunctions) {
    await prisma.function.upsert({
      where: { name_userId: { name: fn.name, userId: fn.userId } },
      update: {},
      create: fn,
    });
    console.log(`✅ Sample function created: ${fn.name}`);
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
