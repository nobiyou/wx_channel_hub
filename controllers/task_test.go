package controllers

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/nobiyou/wx_channel_hub/models"
)

func TestRequiredCapabilitySemanticActions(t *testing.T) {
	if got := requiredCapability("search_channels", nil); got != "search" {
		t.Fatalf("requiredCapability(search_channels) = %q, want search", got)
	}
	if got := requiredCapability("search_videos", nil); got != "search" {
		t.Fatalf("requiredCapability(search_videos) = %q, want search", got)
	}
	if got := requiredCapability("download_video", nil); got != "ready" {
		t.Fatalf("requiredCapability(download_video) = %q, want ready", got)
	}
}

func TestRequiredCapabilityAPIDownloadVideo(t *testing.T) {
	got := requiredCapability("api_call", json.RawMessage(`{"key":"key:channels:download_video"}`))
	if got != "ready" {
		t.Fatalf("requiredCapability(api_call download_video) = %q, want ready", got)
	}
}

func TestNodeSupportsCapabilityReady(t *testing.T) {
	if !nodeSupportsCapability(models.Node{APIReady: true}, "ready") {
		t.Fatalf("APIReady node should support ready capability")
	}
	if !nodeSupportsCapability(models.Node{ReadyClients: 1}, "ready") {
		t.Fatalf("ReadyClients node should support ready capability")
	}
	if nodeSupportsCapability(models.Node{}, "ready") {
		t.Fatalf("empty node should not support ready capability")
	}
}

func TestRemoteCallTimeoutForAPISearchAndDownload(t *testing.T) {
	if got := remoteCallTimeout("api_call", json.RawMessage(`{"key":"key:channels:contact_list"}`)); got != 3*time.Minute {
		t.Fatalf("remoteCallTimeout(api_call contact_list) = %v, want 3m", got)
	}
	if got := remoteCallTimeout("api_call", json.RawMessage(`{"key":"key:channels:download_video"}`)); got != 10*time.Minute {
		t.Fatalf("remoteCallTimeout(api_call download_video) = %v, want 10m", got)
	}
}
