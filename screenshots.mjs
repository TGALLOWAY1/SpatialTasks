import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const SCREENSHOTS_DIR = './screenshots';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const SAMPLE_MARKDOWN = `# Deploy New Microservice

## Step 1: Environment Setup
Set up the local development environment with all required dependencies and configuration.
- Install Docker and Docker Compose
- Clone the service template repository
- Configure environment variables
- Install Node.js dependencies

### Verification
- Docker daemon is running
- All npm packages installed without errors
- Environment config passes validation check

## Step 2: Implement Core API
Build the REST API endpoints with proper error handling and validation.
- Create Express server scaffold
- Implement health check endpoint
- Build CRUD endpoints for resources
- Add request validation middleware
- Write unit tests for each endpoint

### Verification
- All unit tests pass
- API responds to health check on /healthz
- CRUD operations work via curl/Postman

## Step 3: Database Integration
Connect the service to PostgreSQL and set up migrations.
- Design database schema
- Create migration files
- Implement data access layer
- Add connection pooling

### Verification
- Migrations run cleanly on fresh database
- All queries return expected results
- Connection pool handles concurrent requests

## Step 4: CI/CD Pipeline
Configure automated testing and deployment pipeline.
- Write GitHub Actions workflow
- Add Docker build step
- Configure staging deployment
- Set up production deployment with approval gate

### Verification
- Pipeline triggers on push to main
- Docker image builds successfully
- Staging deployment completes without errors

## Step 5: Monitoring & Observability
Set up logging, metrics, and alerting for the new service.
- Configure structured logging
- Add Prometheus metrics endpoint
- Create Grafana dashboard
- Set up PagerDuty alerts

### Verification
- Logs appear in centralized logging system
- Metrics are scraped by Prometheus
- Dashboard shows key service health indicators
`;

async function main() {
    const browser = await chromium.launch({
        headless: true,
        executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    // Capture console messages for debugging
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE CRASH:', err.message));

    // Pre-seed localStorage with workspace data and _supabaseLoaded=true BEFORE loading the app
    // Navigate to the origin first to set localStorage on the correct domain
    await page.goto('http://localhost:5173', { waitUntil: 'commit' });
    await page.evaluate(() => {
        // Build the workspace state that Zustand's persist middleware expects
        const state = {
            version: 1,
            projects: [{
                id: 'demo-project',
                title: 'Demo Project',
                rootGraphId: 'demo-graph',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }],
            graphs: {
                'demo-graph': {
                    id: 'demo-graph',
                    projectId: 'demo-project',
                    title: 'Demo Project',
                    nodes: [],
                    edges: [],
                }
            },
            activeProjectId: 'demo-project',
            activeGraphId: 'demo-graph',
            navStack: [{ graphId: 'demo-graph', label: 'Demo Project' }],
            settings: {},
            executionMode: false,
            _supabaseLoaded: true,
        };
        // Store in the format Zustand persist middleware expects
        localStorage.setItem('spatialtasks-workspace', JSON.stringify({ state, version: 0 }));
    });

    // Now reload the app to pick up the localStorage data
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Debug: what's on the page?
    const bodyText = await page.locator('body').innerText().catch(() => 'EMPTY');
    console.log('Body text preview:', bodyText.substring(0, 200));
    const bodyHTML = await page.locator('#root').innerHTML().catch(() => 'NO ROOT');
    console.log('Root HTML length:', bodyHTML.length);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-app-initial.png`, fullPage: false });
    console.log('Screenshot 1: Initial state');

    // Check for app content
    const hasApp = await page.locator('text=SpatialTasks').isVisible().catch(() => false);
    const hasImport = await page.locator('text=Import Plan').isVisible().catch(() => false);
    const hasAuth = await page.locator('text=Sign in').isVisible().catch(() => false);
    const hasLoading = await page.locator('text=Loading').isVisible().catch(() => false);
    console.log('App visible:', hasApp, 'Import visible:', hasImport, 'Auth:', hasAuth, 'Loading:', hasLoading);

    if (!hasImport && !hasApp) {
        // Try to force the store state directly via JS
        console.log('Trying to force store state...');
        await page.evaluate(() => {
            // Try to access window.__zustand stores or the store directly
            const root = document.getElementById('root');
            if (root) console.log('Root has children:', root.childNodes.length);
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/01b-debug.png`, fullPage: false });
    }

    if (hasImport) {
        // Click Import Plan
        await page.locator('text=Import Plan').click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-import-modal-upload.png`, fullPage: false });
        console.log('Screenshot 2: Import Plan modal (upload tab)');

        // Switch to Paste tab
        await page.locator('text=Paste Markdown').click();
        await page.waitForTimeout(300);

        // Fill textarea with markdown
        await page.locator('textarea').fill(SAMPLE_MARKDOWN);
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-paste-markdown.png`, fullPage: false });
        console.log('Screenshot 3: Pasted markdown');

        // Click Parse & Review
        await page.locator('text=Parse & Review').click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-draft-review.png`, fullPage: false });
        console.log('Screenshot 4: Draft review');

        // Click Create on Canvas
        await page.locator('text=Create on Canvas').click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-canvas-nodes.png`, fullPage: false });
        console.log('Screenshot 5: Canvas with nodes');

        // Toggle execution mode
        const planningBtn = page.locator('button', { hasText: 'Planning' });
        if (await planningBtn.isVisible().catch(() => false)) {
            await planningBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-execution-mode.png`, fullPage: false });
            console.log('Screenshot 6: Execution mode');

            // Enter first container node - use force:true because the Dive In button has animate-bounce
            const diveIn = page.locator('text=Dive In').first();
            if (await diveIn.isVisible().catch(() => false)) {
                await diveIn.click({ force: true });
                await page.waitForTimeout(1500);
                await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-step-detail-panel.png`, fullPage: false });
                console.log('Screenshot 7: Step detail panel');
            } else {
                const enterBtn = page.locator('[title="Enter Subgraph"]').first();
                if (await enterBtn.isVisible().catch(() => false)) {
                    await enterBtn.click({ force: true });
                    await page.waitForTimeout(1500);
                    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-step-detail-panel.png`, fullPage: false });
                    console.log('Screenshot 7: Step detail panel (via enter)');
                }
            }
        }
    }

    await browser.close();
    console.log('Done! Screenshots in', SCREENSHOTS_DIR);
}

main().catch(console.error);
