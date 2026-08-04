# Annotation study (web)

## Annotator URL
https://llmsheriff.rajendra.dev/study

(Local: http://localhost:3000/study with API at NEXT_PUBLIC_API_BASE_URL)

## How data is saved
1. **SQLite** table `annotation_labels` (primary)
2. **Append-only** `backend/data/study_annotations.jsonl` (backup on disk)
3. Export CSV (you only):

```text
GET /api/study/export.csv?token=YOUR_STUDY_EXPORT_TOKEN
```

Set `STUDY_EXPORT_TOKEN` on Render (do not commit the real token).

## Deploy checklist
- [ ] Push this commit
- [ ] Ensure Render has `STUDY_EXPORT_TOKEN` and CORS includes your Vercel domain
- [ ] Confirm `backend/study_assets/traces/` (40 files) is in the repo deploy
- [ ] Open `/study` after deploy and label one test trace
- [ ] Export CSV and verify the row appears

## Render warning
SQLite on ephemeral disk can reset on redeploy. Export CSV often while the study runs.
