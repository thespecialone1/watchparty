package tunnel

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"time"
)

// StartTunnel starts a cloudflared tunnel for the given port and returns the public URL
func StartTunnel(ctx context.Context, port string) (string, error) {
	cmd := exec.CommandContext(ctx, "cloudflared", "tunnel", "--url", fmt.Sprintf("http://localhost:%s", port))
	
	// Create pipes for stdout and stderr (cloudflared outputs url to stderr usually)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to start cloudflared: %w", err)
	}

	// Channel to receive the URL
	urlChan := make(chan string)
	errChan := make(chan error)

	go func() {
		scanner := bufio.NewScanner(stderr)
		urlRegex := regexp.MustCompile(`https://[a-zA-Z0-9-]+\.trycloudflare\.com`)
		
		for scanner.Scan() {
			line := scanner.Text()
			// fmt.Println("[Cloudflared]", line) // Debug log
			if url := urlRegex.FindString(line); url != "" {
				urlChan <- url
				return
			}
		}
		if err := scanner.Err(); err != nil {
			errChan <- err
		}
	}()

	select {
	case url := <-urlChan:
		return url, nil
	case err := <-errChan:
		return "", fmt.Errorf("error reading tunnel output: %w", err)
	case <-time.After(15 * time.Second):
		return "", fmt.Errorf("timed out waiting for tunnel URL")
	case <-ctx.Done():
		return "", ctx.Err()
	}
}
