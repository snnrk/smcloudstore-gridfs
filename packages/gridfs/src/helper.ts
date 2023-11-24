import path from 'path';
import { z } from 'zod';

export const makePath = (container: string, filePath: string): string =>
  path.join(container, filePath);

const authSchema = z.object({ password: z.string(), user: z.string() });
const optionsSchema = z.object({ auth: authSchema.optional().default({}) });
const mongoParamsSchema = z.object({
  database: z.string(),
  options: optionsSchema.optional(),
  servers: z.string().array().optional().default([]),
});
export type MongoParams = z.infer<typeof mongoParamsSchema>;

export const makeUri = (param: MongoParams): string => {
  const {
    database,
    options: { auth, ...options },
    servers,
  } = mongoParamsSchema.parse(param);

  const buffer = ['mongodb://'];

  const { user, password } = auth;
  if (user) {
    buffer.push(user);
    if (password) {
      buffer.push(':', password);
    }
    buffer.push('@');
  }

  buffer.push(servers.join(','), '/', database);

  const queries = Object.entries(options)
    .map((entry) => entry.join('='))
    .join('&');
  if (queries) {
    buffer.push('?', queries);
  }

  return buffer.join('');
};
