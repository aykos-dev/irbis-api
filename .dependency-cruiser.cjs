/** Layering rules from docs/architecture.md, enforced by `npm run check`. */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'prisma-only-in-repositories',
      comment: 'Only *.repository.ts and src/prisma/ may import the Prisma client (ADR-002).',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: ['\\.repository\\.ts$', '^src/prisma/', '^src/generated/'],
      },
      to: {
        path: ['^src/generated/prisma/', '^src/prisma/prisma\\.service\\.ts$', '(^|/)node_modules/@prisma/'],
      },
    },
    {
      name: 'shared-never-imports-features',
      comment: 'common/, lib/ and config/ never import from features/.',
      severity: 'error',
      from: { path: '^src/(common|lib|config)/' },
      to: { path: '^src/features/' },
    },
    {
      name: 'features-only-via-module-exports',
      comment: "features/a may use features/b only through b's module/service, never its repository or DTO internals.",
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/[^/]+/([^/]+\\.repository\\.ts$|dto/)',
        pathNot: '^src/features/$1/',
      },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/generated/' },
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
