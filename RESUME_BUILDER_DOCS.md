# Resume Builder & Template Engine Architecture

## 1. Template System Architecture

The template system is **decoupled** from the AI logic. Templates are stored as static assets with metadata, making the system highly scalable.

### Directory Structure
```text
backend/app/templates/
├── classic/
│   ├── index.html        # Jinja2 template
│   ├── style.css         # Print-ready CSS
│   └── metadata.json     # { "name": "Classic", "category": "ats-safe", "is_premium": false }
├── modern/
│   └── ...
```

### Rendering Pipeline
1. **Input**: Structured JSON from the Builder or AI Optimizer.
2. **Template Selection**: User selects a `template_id`.
3. **HTML Rendering**: `PDFService` uses Jinja2 to inject data into `index.html`.
4. **PDF Generation**: `WeasyPrint` converts HTML + `style.css` into a pixel-perfect PDF.

## 2. API Design for Builder & Templates

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/templates` | GET | List all available templates (checks for locked status). |
| `/templates/render-preview` | POST | Returns raw HTML for real-time iframe preview. |
| `/templates/export` | POST | Returns a generated PDF file. |
| `/api/v1/resumes` | POST | Create a new resume version from scratch. |
| `/api/v1/resumes/{id}/versions` | GET | List version history (v1, v2, v3). |

## 3. Example Template (HTML + Placeholders)

**index.html snippet:**
```html
<header>
  <h1>{{ name }}</h1>
  <p>{{ contact.email }} | {{ contact.phone }}</p>
</header>

<section>
  <h2>Experience</h2>
  {% for job in experience %}
    <div class="job">
      <strong>{{ job.title }}</strong> at {{ job.company }}
      <ul>
        {% for bullet in job.bullets %}
          <li>{{ bullet }}</li>
        {% endfor %}
      </ul>
    </div>
  {% endfor %}
</section>
```

## 4. Frontend Component Structure (Next.js)

### /app/builder/page.tsx
Main page orchestrating the layout:
* **Sidebar (BuilderForm)**: Left panel with accordion sections (Summary, Experience, etc.).
* **Center (LivePreview)**: Iframe displaying the rendered HTML from `/render-preview`.
* **Right (TemplateGallery)**: Drawer to switch and preview styles.

### /components/builder/
* **ExperienceEditor.tsx**: Dynamic list of jobs. Each job is a sub-form.
* **BulletListEditor.tsx**: Draggable list items for experience bullets.
* **SkillTagger.tsx**: Multi-select chip input for normalized skills.

### /lib/builder-hooks.ts
* `useDebouncedPreview`: Custom hook to hit the backend every 500ms of typing to refresh the iframe.

## 5. SaaS Tier Integration
* **Free Tier**: Only `classic` and `ats-safe` templates are unlocked.
* **Paid Tier**: All templates (`modern`, `premium`) are available.
* **Logic**: The `/templates` API returns a `locked: true` field for premium templates if the user's `subscription_tier` is not `pro`.
