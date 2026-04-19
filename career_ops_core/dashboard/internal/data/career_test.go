package data

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseApplicationsEnrichesURLsFromDataScanHistory(t *testing.T) {
	root := t.TempDir()
	dataDir := filepath.Join(root, "data")
	reportsDir := filepath.Join(root, "reports")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(reportsDir, 0o755); err != nil {
		t.Fatal(err)
	}

	applications := `# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-04-01 | Fresh Co | AI Product Manager | 4.4/5 | Evaluated | no | [001](reports/001.md) | |
`
	if err := os.WriteFile(filepath.Join(dataDir, "applications.md"), []byte(applications), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dataDir, "scan-history.tsv"), []byte("url\tfirst_seen\tportal\ttitle\tcompany\tstatus\nhttps://jobs.example.com/job-4\t2026-04-01\tgreenhouse-api\tAI Product Manager\tFresh Co\tadded\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	apps := ParseApplications(root)
	if len(apps) != 1 {
		t.Fatalf("expected 1 application, got %d", len(apps))
	}
	if apps[0].JobURL != "https://jobs.example.com/job-4" {
		t.Fatalf("expected scan-history URL, got %q", apps[0].JobURL)
	}
}
