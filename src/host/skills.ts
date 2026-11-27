import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-skill';
import { parse } from 'yaml';
import { z } from 'zod';

const skillHeader = z.object({ name: z.string().min(1), description: z.string().min(1) });

export function registerMealSkill(ctx: Context, file: URL): void {
  const markdown = readFileSync(file, 'utf8');
  const header = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/.exec(markdown);
  if (!header) throw new Error('记餐 Skill 缺少 YAML 文件头。');
  const { name, description } = skillHeader.parse(parse(header[1]));
  ctx.effect(() => ctx.skills.register({
    name, description, content: markdown.slice(header[0].length).trim(),
    source: 'bundled', path: fileURLToPath(file),
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL('.', file)) },
  }), 'calorie-helper: meal logging skill');
}
