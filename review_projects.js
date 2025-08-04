const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Fetching the input.json file from command line arguments
const inputJSONFile = process.argv[2];
if (!inputJSONFile) {
    console.error('Please provide the proper input JSON file.');
    process.exit(1);
}

// Parsing input.json file
let inputJSONData;
try {
    const rawData = fs.readFileSync(inputJSONFile, 'utf8');
    inputJSONData = JSON.parse(rawData);
} catch (error) {
    console.error('Error while reading or parsing the input JSON file:', error);
    process.exit(1);
}

// Extracting candidate id and projects array from parsed JSON data
if (typeof inputJSONData !== 'object' || !inputJSONData.candidate_id || !Array.isArray(inputJSONData.projects)) {
    console.error('Invalid input JSON structure.')
    process.exit(1);
}
const { candidate_id, projects } = inputJSONData;
if (!candidate_id || !projects) {
    console.error('Invalid input JSON data.');
    process.exit(1);
}

// Creating a directory for screenshots if it is not already present
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

// Object to store the results of review
const reviewProjectsResults = {
    candidate_id: candidate_id,
    project_reviews: []
};

// Main function starting point
const reviewProject = async () => {
    const browser = await chromium.launch({ headless: true }); // Launching chromium browser instance
    if (!browser) {
        console.error('Browser launching failed.');
        process.exit(1);
    }

    // Creating new browser context
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true
    });

    // Timing logs
    fs.writeFileSync('timing_logs.txt', "");

    for (const project of projects) {
        const startTime = Date.now()
        const page = await context.newPage();

        // Initializing variables
        let status;
        let interactive;
        let ui_elements = [];
        let error_message = null;
        let screenshotPathLocation;
        let tag;
        let is404 = false;

        try {
            // Project review logic with 10s timeout
            await Promise.race([
                (async () => {
                    //Navigating to demo url
                    const response = await page.goto(project.demo_url, {
                        timeout: 10000,
                        waitUntil: 'domcontentloaded'
                    });

                    // Basic 404 check from HTTP status
                    if (response.status() === 404) {
                        is404 = true;
                        throw new Error("404 Not Found: The provided URL does not exist.");
                    }

                    // Wait for network to settle and UI elements to appear
                    await page.waitForLoadState('networkidle');
                    await page.waitForSelector('input, button', { timeout: 5000 });

                    // Text based detection for 404 or Page Not Found errors
                    if (response.status() === 200) {
                        const visibleText = await page.innerText('body');
                        if (/404|not found|page not found/i.test(visibleText)) {
                            is404 = true;
                            throw new Error("404 Not Found: The provided URL does not exist.");
                        }
                    }

                    // If all above checks pass, we can say that the project is live
                    status = "live";

                    // Detecting framework used (Next.js, React, or Vanilla))
                    const contentFound = await page.content();
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
                        tag = "Vanilla HTML/CSS/JS";
                    }

                    // Extracting UI elements (input, button)
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

                    // Taking screenshot of the project
                    screenshotPathLocation = path.join(screenshotsDir, `${candidate_id}_${project.name}.png`);
                    await page.screenshot({ path: screenshotPathLocation, fullPage: true });

                    // Checking interactivity: fill input and click button
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
                        interactive = false; // If interaction fails, set interactive to false
                    }
                })(),
                // Timeout after 10 seconds, rejecting the review if it takes more than 10 seconds
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Project ${project.name} took more than 10 seconds for a review.`)), 10000)
                )
            ]);
        } catch (error) {
            // Handling errors and setting status accordingly
            status = 'error';
            interactive = false;
            ui_elements = [];
            error_message = error.message;
            framework = tag || 'Unknown';
        }
        finally {
            await page.close(); // Closeing page to free up resources
        }

        // Storing the review results for particular project
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
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        fs.appendFileSync('timing_logs.txt', `-> Project "${project.name}" took ${duration}s to review.\n\n`); // Logging duration
    }
    // Cleaning up resources
    await context.close();
    await browser.close();

    // Output the review results
    console.log(JSON.stringify(reviewProjectsResults, null, 2));
}

// Starting the script
reviewProject();