const fs = require("fs");
const path = require("path");
const lighthouse = require("lighthouse").default;
const chromeLauncher = require("chrome-launcher");
const { exec } = require("child_process");


// Path for storing audit reports
const auditFolder = path.join(__dirname, "lighthouse_reports");
if (!fs.existsSync(auditFolder)) {
  fs.mkdirSync(auditFolder);
}

const auditProject = async (projects) => {
  //Launch Chrome Instance
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  if (!chrome) {
    console.error("Chrome launching failed.");
    process.exit(1);
  }

  // Setting up Lighthouse options
  const options = {
    logLevel: "info",
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    port: chrome.port,
  };

  for (const project of projects) {
    try {
      // Run Lighthouse audit for each project 
      const result = await lighthouse(project.demo_url, options);

      const auditReportPath = path.join(
        auditFolder,
        `${project.name}_report.json`
      );

      // Save the Lighthouse report
      fs.writeFileSync(
        auditReportPath,
        JSON.stringify(result.lhr.categories, null, 2)
      );
    } catch (error) {
      console.error(`Audit failed for ${project.name}: ${error.message}`);
    }
  }

  //Cleanup chrome process
  try {
    await chrome.kill();
  } catch (e) {
    console.log("Cleaning up Chrome process failed, falling back to manual termination.");

    // I added this child because sometimnes the chrome process does not terminate properly
    // due to firmware issues or other reasons.
    try {
      exec(`taskkill /PID ${chrome.pid} /F`, (error, std_out, std_error) => {
        if (error) {
          console.error("Manual chrome cleanup failed:", std_error);
        } else {
          console.log("Manually killed Chrome:", std_out);
        }
      });
    } catch (error2) {
      console.error("Failed to manually kill Chrome:", error2.message);
    }
  }
}


module.exports = auditProject;
