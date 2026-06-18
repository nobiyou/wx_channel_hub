package services

import "testing"

func TestBuildSharedFeedProfileCompatResponseFallsBackDynamicExportID(t *testing.T) {
	result := BuildSharedFeedProfileCompatResponse(&SphFeedResponse{
		Data: SphFeedData{
			FeedInfo: SphFeedInfo{
				VideoURL: "https://cdn.example.com/video.mp4",
			},
		},
	})

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("data should be a map")
	}
	sceneInfo, ok := data["sceneInfo"].(map[string]interface{})
	if !ok {
		t.Fatalf("sceneInfo should be a map")
	}
	if got := sceneInfo["dynamicExportId"]; got != "shared_feed" {
		t.Fatalf("dynamicExportId = %#v, want shared_feed", got)
	}
}

func TestBuildSharedFeedProfileCompatResponseUsesOriginVideoURLFirst(t *testing.T) {
	result := BuildSharedFeedProfileCompatResponse(&SphFeedResponse{
		Data: SphFeedData{
			FeedInfo: SphFeedInfo{
				VideoURL:       "https://cdn.example.com/video.mp4",
				OriginVideoURL: "https://cdn.example.com/origin.mp4",
			},
		},
	})

	data := result["data"].(map[string]interface{})
	object := data["object"].(map[string]interface{})
	desc := object["objectDesc"].(map[string]interface{})
	media := desc["media"].([]interface{})[0].(map[string]interface{})

	if got := media["url"]; got != "https://cdn.example.com/origin.mp4" {
		t.Fatalf("media url = %#v, want origin video URL", got)
	}
}
