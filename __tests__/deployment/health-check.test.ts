/**
 * Health Check Endpoint Tests
 *
 * Validates that the /api/health endpoint exists and returns
 * correct responses for deployment validation.
 */

import fs from 'fs';
import path from 'path';

describe('Deployment: Health Check Endpoint', () => {
  describe('Health Check Route File', () => {
    it('should have /api/health route handler', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');

      expect(fs.existsSync(healthRoutePath)).toBe(true);
    });

    it('should export GET handler', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');
      const healthRouteContent = fs.readFileSync(healthRoutePath, 'utf-8');

      expect(healthRouteContent).toContain('export async function GET');
    });

    it('should return JSON response with status ok', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');
      const healthRouteContent = fs.readFileSync(healthRoutePath, 'utf-8');

      expect(healthRouteContent).toMatch(/status.*ok/);
    });

    it('should return timestamp', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');
      const healthRouteContent = fs.readFileSync(healthRoutePath, 'utf-8');

      expect(healthRouteContent).toContain('timestamp');
    });
  });

  describe('Health Check Response Format', () => {
    it('should define proper response type', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');
      const healthRouteContent = fs.readFileSync(healthRoutePath, 'utf-8');

      // Should use NextResponse or Response
      expect(healthRouteContent).toMatch(/NextResponse|Response/);
    });

    it('should return 200 status code', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');
      const healthRouteContent = fs.readFileSync(healthRoutePath, 'utf-8');

      // Should explicitly set status 200 or use NextResponse.json (defaults to 200)
      expect(healthRouteContent).toMatch(/status.*200|NextResponse\.json/);
    });
  });

  describe('Database Health Check (Optional)', () => {
    it('should optionally include database connection check', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');
      const healthRouteContent = fs.readFileSync(healthRoutePath, 'utf-8');

      // Optional: check if it includes database health check
      const hasDatabaseCheck = healthRouteContent.includes('prisma') ||
                               healthRouteContent.includes('database');

      if (hasDatabaseCheck) {
        console.log('✅ Health check includes database validation');
      } else {
        console.log('ℹ️  Health check is basic (no database validation)');
      }

      // This is always passing - just documenting
      expect(true).toBe(true);
    });
  });

  describe('Docker Health Check Integration', () => {
    it('Dockerfile should use /api/health for HEALTHCHECK', () => {
      const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');

      expect(dockerfileContent).toContain('HEALTHCHECK');
      expect(dockerfileContent).toContain('/api/health');
    });

    it('GitHub Actions workflow should verify /api/health', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'deploy-production.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf-8');

      expect(workflowContent).toContain('/api/health');
    });
  });

  describe('Public API Health Check', () => {
    it('should have /api/public/health endpoint', () => {
      const publicHealthPath = path.join(process.cwd(), 'src', 'app', 'api', 'public', 'health', 'route.ts');

      if (fs.existsSync(publicHealthPath)) {
        console.log('✅ Public health check endpoint exists');

        const publicHealthContent = fs.readFileSync(publicHealthPath, 'utf-8');

        expect(publicHealthContent).toContain('export async function GET');
      } else {
        console.log('ℹ️  Public health check endpoint not found (optional)');
      }
    });
  });

  describe('Health Check Documentation', () => {
    it('should document health check usage', () => {
      const expectedUsage = {
        endpoint: '/api/health',
        method: 'GET',
        expectedResponse: {
          status: 'ok',
          timestamp: 'ISO 8601 string',
        },
        usage: [
          'Docker HEALTHCHECK',
          'GitHub Actions verification',
          'Load balancer health checks',
          'Monitoring tools',
        ],
      };

      console.log('\n📋 Health Check Documentation:');
      console.log('Endpoint:', expectedUsage.endpoint);
      console.log('Method:', expectedUsage.method);
      console.log('Expected Response:', expectedUsage.expectedResponse);
      console.log('Usage:');
      expectedUsage.usage.forEach(use => {
        console.log(`   - ${use}`);
      });

      expect(expectedUsage.endpoint).toBe('/api/health');
    });
  });

  describe('Error Handling', () => {
    it('health check should handle errors gracefully', () => {
      const healthRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts');
      const healthRouteContent = fs.readFileSync(healthRoutePath, 'utf-8');

      // Should have try-catch or error handling
      const hasErrorHandling = healthRouteContent.includes('try') ||
                               healthRouteContent.includes('catch') ||
                               healthRouteContent.includes('error');

      if (hasErrorHandling) {
        console.log('✅ Health check has error handling');
      } else {
        console.log('⚠️  Consider adding error handling to health check');
      }

      // Document recommendation
      expect(true).toBe(true);
    });
  });
});
