import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
// Node tries each address of an external host (Cloudflare, Google) for only
// 250 ms by default before moving on. On a network without IPv6 and with a
// slow first connection, every IPv4 address times out and the call fails,
// which makes the CAPTCHA refuse real visitors.
const CONNECTION_ATTEMPT_TIMEOUT_MS = 2000;

async function bootstrap() {
  setDefaultAutoSelectFamilyAttemptTimeout(CONNECTION_ATTEMPT_TIMEOUT_MS);
  const app = await NestFactory.create(AppModule);

  // The site calls the API through its own proxy (ADR 0007), so CORS only
  // matters for other origins, such as the Frontend dev server.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || DEFAULT_CORS_ORIGIN)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription('Documentação da API do backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
