/**
 * Export curriculum.ts → CSV for external collaborators + pedagogical review
 * Usage: npx tsx scripts/export-curriculum.ts
 */

import { curriculum } from '../src/app/data/curriculum';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CsvRow {
  module_id: string;
  module_title: string;
  lesson_id: string;
  lesson_title: string;
  lesson_description: string;
  has_exercise: 'yes' | 'no';
  test_type?: string;
}

const rows: CsvRow[] = [];

for (const module of curriculum) {
  for (const lesson of module.lessons) {
    rows.push({
      module_id: module.id,
      module_title: module.title,
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      lesson_description: lesson.description.substring(0, 100), // truncate for CSV readability
      has_exercise: lesson.exercise ? 'yes' : 'no',
      test_type: lesson.exercise?.validate ? 'custom' : undefined,
    });
  }
}

// Generate CSV
const headers = Object.keys(rows[0]);
const csv =
  headers.join(',') +
  '\n' +
  rows
    .map((row) =>
      headers
        .map((h) => {
          const val = row[h as keyof CsvRow];
          if (val === undefined) return '';
          const str = String(val);
          // Escape quotes and wrap in quotes if contains comma/newline
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

const outPath = join(__dirname, '..', 'docs', 'exports', 'curriculum.csv');
writeFileSync(outPath, csv, 'utf-8');

console.log(
  `✅ Exported ${rows.length} lessons from ${curriculum.length} modules → ${outPath}`,
);
console.log(`Columns: ${headers.join(', ')}`);
