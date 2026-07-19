import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('server security contracts', () => {
  it('keeps protected resource content behind authenticated resource access', () => {
    const route = source('src/app/api/resources/content/route.ts');
    expect(route).toContain('getProtectedResource');
    expect(route).toContain('auth.getUser');
    expect(route).toContain('purpose');
  });

  it('keeps parent attachments scoped to an approved parent link', () => {
    const route = source('src/app/api/parent/attachments/route.ts');
    const access = source('src/lib/parent/access.ts');
    expect(route).toContain('getParentLinkAccess');
    expect(access).toContain("link.status !== 'approved'");
    expect(route).toContain('checkParentAttachmentLimits');
  });

  it('keeps diagnostic and resource question endpoints authenticated', () => {
    expect(source('src/app/api/diagnostic/route.ts')).toContain('auth.getUser');
    expect(source('src/app/api/resources/questions/route.ts')).toContain('auth.getUser');
  });
});
