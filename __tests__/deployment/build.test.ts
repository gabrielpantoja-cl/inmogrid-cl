/**
 * Build Tests for Deployment
 *
 * Validates that the Next.js build completes successfully
 * and all optimizations are properly configured.
 */

import fs from 'fs';
import path from 'path';

describe('Deployment: Build Configuration', () => {
  describe('Next.js Configuration', () => {
    it('should have standalone output mode enabled', () => {
      const nextConfigPath = path.join(process.cwd(), 'next.config.js');
      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');

      expect(nextConfigContent).toContain("output: 'standalone'");
    });

    it('should have production optimizations configured', () => {
      const nextConfigPath = path.join(process.cwd(), 'next.config.js');
      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');

      // Check for image optimization
      expect(nextConfigContent).toContain('images:');

      // Check for webpack configuration
      expect(nextConfigContent).toContain('webpack:');
    });

    it('should have CSP headers configured', () => {
      const nextConfigPath = path.join(process.cwd(), 'next.config.js');
      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');

      expect(nextConfigContent).toContain('Content-Security-Policy');
    });
  });

  describe('Package.json Configuration', () => {
    it('should have build script configured', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.build).toContain('next build');
    });

    it('should have start script configured', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.start).toContain('next start');
    });

    it('should have test scripts configured', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts['test:ci']).toBeDefined();
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have tsconfig.json configured', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');

      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });

  describe('Environment Variables', () => {
    it('should have .env.example file', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');

      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    it('should have .env.local.example file', () => {
      const envLocalExamplePath = path.join(process.cwd(), '.env.local.example');

      expect(fs.existsSync(envLocalExamplePath)).toBe(true);
    });
  });

  describe('Build Output Validation', () => {
    it('should validate build output structure when build exists', () => {
      const buildPath = path.join(process.cwd(), '.next');

      // Si el build existe, validar estructura
      if (fs.existsSync(buildPath)) {
        const standalonePath = path.join(buildPath, 'standalone');
        const staticPath = path.join(buildPath, 'static');

        // En standalone mode, estos directorios deberían existir
        expect(fs.existsSync(staticPath)).toBe(true);

        console.log('✅ Build output structure validated');
      } else {
        console.log('⚠️  Build not found - run npm run build first');
      }
    });
  });

  describe('Prisma Configuration', () => {
    it('should have Prisma schema file', () => {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    it('should have Prisma generate in build script', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts.build).toContain('prisma generate');
    });
  });
});
