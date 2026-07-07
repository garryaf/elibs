import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .required(),
  CORS_ORIGINS: Joi.string().required(),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
});
