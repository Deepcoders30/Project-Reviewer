const fs = require("fs");
const path = require("path");
const lighthouse = require("lighthouse").default;
const chromeLauncher = require("chrome-launcher");

const auditFolder = path.join(__dirname, "lighthouse_reports");
if (!fs.existsSync(auditFolder)) {
  fs.mkdirSync(auditFolder);
}

const auditProject = async (projects) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  const options = {
    logLevel: "info",
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    port: chrome.port,
  };

  for (const project of projects) {
    try {
      const result = await lighthouse(project.demo_url, options);

      const auditReportPath = path.join(
        auditFolder,
        `${project.name}_report.json`
      );
      fs.writeFileSync(
        auditReportPath,
        JSON.stringify(result.lhr.categories, null, 2)
      );
    } catch (error) {
      console.error(`Audit failed for ${project.name}: ${error.message}`);
    }
  }

  try {
    await chrome.kill();
  } catch (e) {
    console.warn("Could not kill Chrome or cleanup temp folders.", e.message);
  }
};

module.exports = auditProject;
