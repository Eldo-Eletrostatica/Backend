import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

async function bootstrap() {
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
