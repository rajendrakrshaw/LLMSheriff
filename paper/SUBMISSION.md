# Submission PDF

## Files
- Named draft: `llmsheriff_ieee.tex` (keep for yourself / repo)
- **Submit this:** `llmsheriff_ieee_anonymous.tex` → PDF

## Build (after MiKTeX install)
```powershell
cd paper
pdflatex llmsheriff_ieee_anonymous.tex
pdflatex llmsheriff_ieee_anonymous.tex
```

Rename output to something like `LLMSheriff_EPFL_anonymous.pdf`.

## Anonymization checklist
- [x] Author name / email / affiliation removed in anonymous tex
- [ ] PDF metadata author field empty (check Properties after compile)
- [ ] No live personal URLs in the body
- [ ] Email PDF to board@epflaiteam.ch by 31 Aug 2026
