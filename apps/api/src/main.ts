import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.use(cookieParser());

  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? '*';
  app.enableCors({ origin: corsOrigin, credentials: true });

  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Executiva Service — Contracts API')
    .setDescription('Plataforma multi-tenant de gestão de contratos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  console.log(
    `API rodando na porta ${port} — docs em http://localhost:${port}/docs`,
  );
}

void bootstrap();
