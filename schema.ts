import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

const uuid = sql`uuid_generate_v4()`;

export const projects = pgTable('project', {
  id: text('id').primaryKey().default(uuid).notNull(),
  name: varchar('name').notNull(),
  transcriptionModel: varchar('transcription_model').notNull(),
  visionModel: varchar('vision_model').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  content: json('content'),
  userId: varchar('user_id').notNull(),
  image: varchar('image'),
  members: text('members').array(),
});

export const profile = pgTable('profile', {
  id: text('id').primaryKey().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  onboardedAt: timestamp('onboarded_at'),
  // Sistema de créditos seguro
  credits: integer('credits').default(100).notNull(),
  creditsUsed: integer('credits_used').default(0).notNull(),
});

// Tabela de auditoria para rastrear uso de créditos
export const creditTransactions = pgTable('credit_transactions', {
  id: text('id').primaryKey().default(uuid).notNull(),
  userId: text('user_id').notNull().references(() => profile.id),
  amount: integer('amount').notNull(), // Negativo para débito, positivo para crédito
  type: varchar('type').notNull(), // 'usage', 'purchase', 'bonus', 'refund'
  modelUsed: varchar('model_used'), // Qual modelo foi usado
  description: text('description'),
  metadata: json('metadata'), // Dados extras (prompt, resultado, etc)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
