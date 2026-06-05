import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve uploaded PDFs as static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  const config = new DocumentBuilder()
    .setTitle('GFAS API')
    .setDescription('Global Freight Automation System API')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 GFAS Backend running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
