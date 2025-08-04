# 🕵️‍♂️ Project Reviewer – Playwright + Node.js Automation Tool

This tool reviews and tags web projects automatically using Playwright and Node.js. It detects the frontend framework (React, Next.js, Vanilla), validates if the project demo is live, takes a screenshot, checks for interactiveness, and handles broken URLs gracefully.

## 🚀 Features

For each project with a demo_url, the tool:

- Navigates to the demo page using Playwright
- Captures a full-page screenshot
- Detects if the page is live
- Checks whether it is interactive (basic interaction with input fields or buttons)
- Extracts visible UI elements like input, button.
- Identifies the frontend framework (React, Next.js, or Vanilla HTML/CSS/JS)
- Error Handling
- Returns a structured JSON summary for all reviewed projects

## 📁 Folder Structure

```
project-reviewer/
│
├── input.json               # Input file with `candidate_id` and project URLs
├── output.json              # Output file with review results (auto-generated)
├── review_projects.js       # Main script to run the review
├── screenshots/             # Stores screenshots
│   ├── project1.png         # Example: Screenshot files
│   └── project2.png
└── README.md                # Project documentation
```

## 📦 Prerequisites

- Node.js (v18+ recommended)
- NPM installed globally


## 🧱 Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/your-username/project-reviewer.git
   cd project-reviewer

2. Install the required Node.js dependencies:

   ```bash
   npm install

3. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

## 🛠 How to Run

1. Create an `input.json` file with your project details inside root folder:

   ```json
   {
     "candidate_id": "cand_umair_23a4e1",
     "projects": [
       {
         "name": "Project One",
         "demo_url": "https://example.com"
       },
       {
         "name": "Project Two",
         "demo_url": "https://example2.com"
       }
     ]
   }

2. Run this command and `output.json` file will be created automatically inside root folder:
   ```bash
   node review_projects.js input.json > output.json
   ```

## 📊 Output Format (Sample)

```json
{
  "candidate_id": "cand_umair_23a4e1",
  "project_reviews": [
    {
      "name": "AI ChatPDF",
      "status": "live",
      "interactive": true,
      "ui_elements": ["button"],
      "framework": "React JS",
      "error_message": null,
      "screenshot_path": "D:\\project-reviewer\\screenshots\\cand_umair_23a4e1_AI ChatPDF.png"
    }
  ]
}
```

