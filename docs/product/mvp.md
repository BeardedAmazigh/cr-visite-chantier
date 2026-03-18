# Application Scope (V2)

This document outlines the expanded scope for the compte rendu generator, moving beyond a stateless MVP to a full project management tool.

## 1. Authentication & Accounts
- **Personal Accounts:** Users must be able to log in to their own personal account.
- **Data Isolation:** A user can only see the projects and reports associated with their account.

## 2. Project Management
- **Multiple Projects:** Users can create and manage multiple distinct construction projects (chantiers).
- **Navigation:** A dashboard interface allowing the user to easily switch between different projects.

## 3. Report History & Tracking
- **Report Ledger:** Within a project, the user can see a chronological list of all previously generated test reports sorted by date.
- **Generation:** From a project view, the user can launch the generator to create or edit a new "compte rendu".
- **Status Tracking:**
  - **Unsent (Yellow):** Reports that have been generated/exported but not yet distributed.
  - **Sent (Green):** Reports that the user has marked as sent.

## 4. Actor Management (Stakeholders)
- **Directory:** Each project maintains an address book of actors (Maitre d'oeuvre, Maitre d'ouvrage, Entreprises, Bureau de contrôle, CSPS).
- **Custom Types:** Users can define custom types/roles for actors.
- **Profiles:** Each actor has a detailed profile including: Photo, Nom, Prénom, Société, Adresse, Poste, Email, and Numéro de téléphone. All fields are in French.

## 5. Processing Engine (AI)
- **Rule Enforcement:** A backend prompt engine that strictly applies the rules from `.agents/rules`.
- **JSON Extraction:** Synthesizes unstructured input into a structured JSON object reflecting the 8-part structure defined in `docs/domain/cr-structure.md`.

## 6. Output Interface & Distribution
- **Editable Form Fields:** Displays the generated report as editable form fields for each section.
- **Photo Upload:** Clean inline gallery for adding and commenting on site photos.
- **Distribution Menu:** When finalizing a report, the user is presented with a menu of the project's actors allowing them to select who should receive the generated report.
- **Export:** Export PDF functionality tied directly to the report view.
