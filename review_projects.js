const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const inputJSONFile = process.argv[2];
if (!inputJSONFile) {
    console.error('Please provide the proper input JSON file.');
    process.exit(1);
}

let inputJSONData;

try {
    const rawData = fs.readFileSync(inputJSONFile, 'utf8');
    inputJSONData = JSON.parse(rawData);
} catch (error) {
    console.error('Error while reading or parsing the input JSON file:', error);
    process.exit(1);
}

const { candidate_id, projects } = inputJSONData;
if (!candidate_id || !projects) {
    console.error('Invalid input JSON data.');
    process.exit(1);
}



const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

const reviewProjectsResults = {
    candidate_id: candidate_id,
    project_reviews: []
};

const reviewProject = async () => {
    const browser = await chromium.launch({ headless: false });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true
    });

    for (const project of projects) {
        const startTime = Date.now()
        const page = await context.newPage();

        let status;
        let interactive;
        let ui_elements = [];
        let error_message = null;
        let screenshotPathLocation = path.join(screenshotsDir, `${candidate_id}_${project.name}.png`);
        let tag;
        let is404 = false;

        try {
            const response = await page.goto(project.demo_url, {
                timeout: 10000,
                waitUntil: 'domcontentloaded'
            });

            if (response.status() === 404) {
                is404 = true;
                throw new Error("404 Not Found: The provided URL does not exist.");
            }

            await page.waitForLoadState('networkidle');
            await page.waitForSelector('input, button', { timeout: 5000 });
            const contentFound = await page.content();

            if (!is404 || contentFound.includes('404') || contentFound.includes('Not Found') || contentFound.includes('Page Not Found')) {
                is404 = true;
                throw new Error("404 Not Found: The provided URL does not exist.");
            }

            status = "live";

            if (contentFound.includes('/_next/') && contentFound.includes('self.__next_f.push')) {
                tag = 'Next JS';
            }
            else if (
                contentFound.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__') ||
                contentFound.includes('data-reactroot') ||
                contentFound.includes('id="root"')
            ) {
                tag = 'React JS';
            }
            else {
                tag = "Vanilla HTML/CSS/JS"
            }


            const elements = await page.$$('input, button');

            if (elements.length === 0) {
                ui_elements = [];
            }
            for (const element of elements) {
                const tagNamePresent = await element.evaluate(el => el.tagName.toLowerCase());
                if (!ui_elements.includes(tagNamePresent)) {
                    ui_elements.push(tagNamePresent);
                }
            }

            await page.screenshot({ path: screenshotPathLocation, fullPage: true });

            try {
                if (ui_elements.includes('input')) {

                    const input = await page.$('input');
                    if (input) {
                        await input.fill('test', { timeout: 2000 });
                        interactive = true;

                    }
                }

                if (ui_elements.includes('button')) {
                    const button = await page.$('button');
                    if (button) {
                        await button.click();
                        interactive = true;
                    }
                }
            } catch {
                interactive = false;
            }
        } catch (error) {
            status = 'error';
            interactive = false;
            ui_elements = [];
            error_message = error.message;
        } finally {
            await page.close();
        }


        reviewProjectsResults.project_reviews.push({
            name: project.name,
            status,
            interactive,
            ui_elements,
            framework: tag,
            error_message,
            screenshot_path: screenshotPathLocation
        });

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`Project "${project.name}" took ${duration}s to review.`);
    }

    await context.close();
    await browser.close();

    console.log(JSON.stringify(reviewProjectsResults, null, 2));
}

reviewProject();