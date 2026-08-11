AI-Assisted Job Application Engine

Project Overview

The AI-Assisted Job Application Engine is a modular job-search and application-assistance platform designed to search multiple job portals, filter relevant opportunities, prepare applications, upload resumes, fill common profile information, and assist with application submission.

The system automates repetitive work while pausing for user interaction whenever a website requires login, OTP, CAPTCHA, security verification, or other human confirmation.

Current Status: Core architecture and major features are implemented. Remaining work is primarily real-world connector stabilization and runtime testing.

Technology Stack

Frontend

React

TypeScript

Vite

Tailwind CSS

Responsive dashboard

Live automation console

Progress tracking

Backend

Node.js

Express

TypeScript

Playwright

CSV export

Session management

File management

Browser Automation

Playwright

Chromium

Firefox

WebKit

Browser contexts and sessions

Headless and visible modes

Supported Job Portals

Naukri

Indeed

LinkedIn

Foundit (Monster)

Internshala

Instahyre

Wellfound

Unstop

Freshersworld

TimesJobs

The connector architecture is modular so additional portals can be added independently.

Core Workflow

User Profile
    ↓
Resume Selection
    ↓
Website Selection
    ↓
Role / Skills / Location / Experience / Work Mode
    ↓
Authentication & Session Check
    ↓
Job Search
    ↓
Experience Filter
    ↓
7-Day Job Age Filter
    ↓
Duplicate / Active Job Validation
    ↓
Application Queue
    ↓
Resume Upload
    ↓
Profile & Screening Form Filling
    ↓
Apply / Assisted Apply
    ↓
Application Confirmation
    ↓
Logs + Screenshots + CSV Report

Resume Management

Resume upload

Multiple resume files

Active resume selection

Resume validation

Resume parsing

Resume storage

Resume upload verification

Candidate Profile

Supports information such as:

Name

Email

Phone

Experience

Skills

Keywords

LinkedIn

GitHub

Portfolio

Salary / CTC

Notice period

Qualification

Work mode

Location

This information can be used to populate application forms.

Authentication & Credentials

The system includes website-specific credentials and session architecture.

Features include:

Credentials Manager

Encrypted password storage

Login detection

Session storage

Session reuse

Session validation

Session refresh

Login-required state

Intended flow:

Select Website
    ↓
Check Credentials / Session
    ↓
Credentials Available?
    ├── Yes → Load Session → Continue
    └── No  → Ask User to Login → Save Session → Continue

The application must never claim successful authentication when login has not actually occurred.

Job Search

Search parameters include:

Job role

Location

Experience

Skills

Keywords

Work mode

Each connector implements website-specific search behavior and selectors. Where a portal provides native filters, native filters should be preferred over injecting filter values into keywords.

Experience Filtering

The system normalizes:

Fresher

0 Years

0–6 Months

0–1 Year

1–2 Years

2–3 Years

3–5 Years

5–8 Years

8+ Years

Non-matching jobs should be filtered before they reach the UI, CSV, application queue, or application attempts.

Job Age Filtering

The JobAgeParser supports:

Today

Yesterday

Hours ago

Days ago

Weeks ago

Months ago

Years ago

The current requirement is to keep only jobs posted within the last 7 days.

Older jobs should be excluded before UI display, CSV export, application queue, and application attempts. Unknown age should not silently be treated as recent.

Job Validation

Before queueing a job, validate:

Company

Role

Location

Experience

Posted date / job age

Apply URL

Active status

Duplicate status

Reject expired jobs, broken links, duplicate jobs, archived jobs, jobs outside the selected experience, and jobs older than the configured age limit.

Duplicate Protection

Before applying, check the application database using relevant identifiers such as company, role, website, and job URL.

If already applied:

Status = Already Applied

and skip the job.

Browser Automation

Supports:

Chromium

Firefox

WebKit

Headless mode

Visible mode

Browser contexts

Session reuse

The browser should remain available through search, filtering, queue, and application phases and close only after the automation run finishes.

New Tab / Popup Handling

Supports:

New tabs

Popup windows

window.open()

target="_blank"

The engine should wait for newly opened pages to load using appropriate load states such as domcontentloaded and networkidle. A blank page must never be treated as a valid job page.

Popup Management

Designed to handle:

Cookie consent

Newsletter popup

Signup popup

Advertisement

Subscription popup

Feedback popup

Notification popup

CAPTCHA & Security Verification

The system must not bypass CAPTCHA, Cloudflare challenges, or other human verification mechanisms.

Expected flow:

CAPTCHA Detected
    ↓
Pause Automation
    ↓
Notify User
    ↓
User Completes Verification
    ↓
Continue

The preferred behavior is to resume from the same page instead of restarting the entire search.

OTP Handling

OTP Detected
    ↓
Pause
    ↓
Ask User for OTP
    ↓
Verify Login
    ↓
Continue

OTP must never be guessed or bypassed.

Resume Upload

Verify:

Correct resume selected

Upload control found

File selected

Upload completed

Uploaded filename/state verified

Use limited retries for upload failures.

Application Form Filling

Common fields include:

Name

Email

Phone

Resume

Experience

Skills

LinkedIn

GitHub

Portfolio

Notice period

Current CTC

Expected CTC

Qualification

Relocation preference

Screening Questions

The screening engine can detect:

Tell me about yourself

Notice period

Current salary

Expected salary

Current CTC

Expected CTC

Visa sponsorship

Relocation

Current company

Current designation

Highest qualification

LinkedIn

GitHub

Portfolio

If confidence is insufficient, pause and ask the user instead of inventing an answer.

Multi-Step Application Forms

Support:

Next

Continue

Save

Save & Continue

Review

Submit

Finish

Do not assume the first page contains the final submission.

Real Application Verification

Never mark a job as Applied merely because a page opened or an Apply button was clicked.

Successful application status should require real evidence such as:

Resume uploaded

Apply button clicked

Submission completed

Success banner

Confirmation page

Application number

Confirmed application state

Relevant URL change

Possible statuses:

Searching

Preparing Application

Waiting Login

Waiting OTP

Waiting CAPTCHA

Waiting User Input

Ready For Final Confirmation

Submitting

Applied

Already Applied

Submission Failed

Skipped

Screenshots

Supports screenshots for:

Before Apply

After Apply

Failure state

CSV Reporting

The production CSV contains:

Company

Role

Website

Location

Experience

Posted Date

Job Age

Apply URL

Status

Started Time

Finished Time

Duration

Login Status

CAPTCHA Status

OTP Status

Resume Uploaded

Apply Button Clicked

Confirmation Verified

Failure Reason

Screenshot Before

Screenshot After

All values should reflect actual runtime state.

Live Console

Records:

Automation start

Resume selected

Browser launched

Session loaded

Login

Searching

Job found

Filtering

Resume upload

CAPTCHA

OTP

Apply

Confirmation

Retry

Failure

Skip

Completion

Retry Engine

Retries temporary failures such as:

Network timeout

Temporary navigation error

Resume upload failure

Temporary interaction failure

Use limited retries and backoff. Never create an infinite retry loop.

Error Handling

Handle gracefully:

Website layout changes

Missing selectors

Timeout

Navigation failure

Login failure

Session expiration

CAPTCHA

OTP

Popup overlays

Resume upload failure

Apply failure

External redirects

A single failed job should not unnecessarily terminate the entire run.

Dynamic Selectors

Website-specific selector configuration can contain:

Search input

Search button

Job card

Company

Role

Location

Experience

Posted date

Apply button

Resume upload

Next button

Submit button

Success indicator

Selectors are maintenance points because job portals can change their HTML.

External ATS

Some jobs may redirect to:

Workday

Greenhouse

Lever

iCIMS

Oracle Recruiting

SmartRecruiters

Ashby

Jobvite

Taleo

SuccessFactors

These systems can have different forms and requirements and may require connector-specific handling.

AI-Assisted Design

The system is an AI-Assisted Job Application Engine, not a blind unattended automation system.

It should automate repetitive tasks wherever technically and legitimately possible while involving the user when required.

User intervention may be required for:

Login

OTP

CAPTCHA

Security verification

Unknown screening question

Mandatory final confirmation

The system must never:

Bypass CAPTCHA

Bypass security verification

Guess OTPs

Fake application success

Generate fake jobs

Generate fake companies

Claim an application was submitted when it was not

Recommended Operating Model

Search
    ↓
Filter
    ↓
Validate
    ↓
Queue
    ↓
Prepare
    ↓
User Verification if Required
    ↓
Submit / Assisted Apply
    ↓
Verify
    ↓
Report

Current Development Status

Implemented / Strong

React dashboard

Resume management

Candidate profile

Credentials architecture

Session architecture

Playwright automation

Dynamic selectors

Job search architecture

Experience normalization

Job age parsing

Duplicate protection

Popup handling

New-tab handling

Screening field detection

CSV reporting

Live console

Screenshot support

Apply verification architecture

Retry/error handling architecture

Remaining Work

Primarily real-world connector stabilization and runtime QA:

Verify authentication flow on every selected website.

Verify session reuse after first login.

Test experience filtering on every connector.

Test the 7-day job age filter on every connector.

Test popup and new-tab behavior.

Test CAPTCHA pause/resume behavior.

Verify resume upload on every portal.

Verify actual application confirmation.

Update selectors when portals change their layout.

Test external ATS flows individually.

Recommended Next Phase

Perform connector-by-connector runtime QA:

Naukri

Indeed

Foundit

LinkedIn

Internshala

Instahyre

Wellfound

Unstop

Freshersworld

TimesJobs

For every connector verify:

Login

Session reuse

Search

Experience filter

7-day filter

Job extraction

Duplicate detection

Resume upload

CAPTCHA handling

OTP handling

Application submission

Confirmation verification

CSV accuracy

Final Assessment


Step 1: Download / Export the Project
Download as ZIP (and extract it into a folder on your computer), OR
Export to GitHub (and clone the repository to your computer).
Step 2: Prerequisites
Make sure you have installed on your computer:
Node.js (v18.0 or higher) — Download Node.js
Git (if cloning via GitHub)
Step 3: Open Terminal / Command Prompt
Open VS Code, Terminal, or Command Prompt.
Navigate into your project directory:
code
Bash
cd path/to/your-project-folder
Step 4: Install Dependencies
Run the following command to install all NPM packages:
code
Bash
npm install
Step 5: Install Playwright Browsers
Since the app uses Playwright for automated job searching and applying, you must install the Chromium browser binaries locally:
code
Bash
npx playwright install chromium
Step 6: Configure Environment Variables
Create a file named .env in the root directory of the project.
Add your Gemini API key inside .env:
code
Env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
(You can get a free Gemini API key from Google AI Studio).
Step 7: Start the App in Development Mode
Run the development command:
code
Bash
npm run dev
Once started, open your web browser and go to:
👉 http://localhost:3000
Step 8: Build for Production (Optional)
If you want to run the production build locally:
code
Bash
# 1. Build client and server bundle
npm run build

# 2. Start production server
npm run start


The project has evolved from a basic job scraper into a modular AI-Assisted Job Application Engine.

The architecture and core automation framework are largely implemented. The primary remaining challenge is validating and stabilizing each website connector against real-world behavior.

The next phase should focus on runtime testing and connector-specific fixes rather than adding generic features.
