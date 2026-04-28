package main

import "testing"

func TestOpenURLCommandAllowsOnlyHTTPURLs(t *testing.T) {
	cmd, ok := openURLCommand("https://example.com/jobs/123", "linux")
	if !ok {
		t.Fatal("expected https URL to be openable")
	}
	if cmd.Path == "" || len(cmd.Args) == 0 {
		t.Fatalf("expected command to be populated: %#v", cmd)
	}

	blocked := []string{
		"javascript:alert(1)",
		"file:///etc/passwd",
		"http://",
		"not a url",
		"",
	}
	for _, raw := range blocked {
		if _, ok := openURLCommand(raw, "linux"); ok {
			t.Fatalf("expected %q to be blocked", raw)
		}
	}
}

func TestOpenURLCommandAvoidsShellForWindows(t *testing.T) {
	cmd, ok := openURLCommand("https://example.com/?q=a&calc=1", "windows")
	if !ok {
		t.Fatal("expected https URL to be openable")
	}
	if cmd.Args[0] == "cmd" {
		t.Fatalf("windows opener must not invoke cmd.exe: %#v", cmd.Args)
	}
}
