import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { globalValidationPipe } from './common/pipes/validation.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const origins = configService.get<string>('CORS_ORIGINS')!;
  app.enableCors({
    origin: origins === '*' ? true : origins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // NOTE: Controllers already include 'api/v1' in their paths,
  // so we do NOT set a global prefix to avoid doubling.

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('eLIS API')
    .setDescription('Enterprise Laboratory Information System — REST API Documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Patients', 'Patient registration and management')
    .addTag('Orders', 'Order creation and management')
    .addTag('Lab Workflow', 'Laboratory sample processing workflow')
    .addTag('Payments', 'Payment processing')
    .addTag('Dashboard', 'Dashboard statistics and charts')
    .addTag('Reports', 'Report generation')
    .addTag('Master Data', 'Reference data management')
    .addTag('RBAC', 'Role-based access control management')
    .addTag('Health', 'System health and metrics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Global pipes, filters, and interceptors
  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  // Start server
  const port = configService.get<number>('PORT')!;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
bootstrap();
