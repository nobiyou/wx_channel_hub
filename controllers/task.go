package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"wx_channel/hub_server/database"
	"wx_channel/hub_server/middleware"
	"wx_channel/hub_server/models"
	"wx_channel/hub_server/ws"
)

func requiredCapability(action string, data json.RawMessage) string {
	switch action {
	case "search_channels", "search_videos":
		return "search"
	case "download_video":
		return "ready"
	}

	if action != "api_call" {
		return ""
	}
	var apiData struct {
		Key string `json:"key"`
	}
	if err := json.Unmarshal(data, &apiData); err != nil {
		return ""
	}
	switch apiData.Key {
	case "key:channels:contact_list":
		return "search"
	case "key:channels:feed_list":
		return "feed"
	case "key:channels:feed_profile", "key:channels:shared_feed_profile", "key:channels:shared_feed_resolve":
		return "profile"
	case "key:channels:download_video":
		return "ready"
	default:
		return ""
	}
}

func nodeSupportsCapability(node models.Node, capability string) bool {
	switch capability {
	case "ready":
		return node.APIReady || node.ReadyClients > 0
	case "search":
		return node.SupportsSearch
	case "feed":
		return node.SupportsFeed
	case "profile":
		return node.SupportsProfile
	default:
		return true
	}
}

func remoteCallTimeout(action string, data json.RawMessage) time.Duration {
	switch action {
	case "search_channels", "search_videos":
		return 3 * time.Minute
	case "download_video":
		return 10 * time.Minute
	case "get_profile", "get_channel_info", "get_video_info":
		return 1 * time.Minute
	case "api_call":
		var apiData struct {
			Key string `json:"key"`
		}
		if err := json.Unmarshal(data, &apiData); err == nil {
			switch apiData.Key {
			case "key:channels:contact_list":
				return 3 * time.Minute
			case "key:channels:download_video":
				return 10 * time.Minute
			}
		}
	}

	return 2 * time.Minute
}

func GetTasks(w http.ResponseWriter, r *http.Request) {
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	nodeID := r.URL.Query().Get("node_id")

	userID := r.Context().Value(middleware.ContextKeyUserID).(uint)

	if limit <= 0 {
		limit = 20
	}

	tasks, count, err := database.GetTasks(userID, nodeID, offset, limit)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"total": count,
		"list":  tasks,
	})
}

func GetTaskDetail(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", 400)
		return
	}

	userID := r.Context().Value(middleware.ContextKeyUserID).(uint)
	task, err := database.GetTaskByID(uint(id), userID)
	if err != nil {
		http.Error(w, "Task not found", 404)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func RemoteCall(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ClientID string          `json:"client_id"`
			Action   string          `json:"action"`
			Data     json.RawMessage `json:"data"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"code":    -1,
				"message": err.Error(),
			})
			return
		}

		// Check Credits
		userID := r.Context().Value(middleware.ContextKeyUserID).(uint)
		cost := int64(0)

		switch req.Action {
		case "search_channels", "search_videos":
			cost = 1
		case "download_video":
			cost = 10
		case "api_call":
			// Check specific API calls for browsing cost
			var apiData struct {
				Key string `json:"key"`
			}
			if err := json.Unmarshal(req.Data, &apiData); err == nil {
				switch apiData.Key {
				case "key:channels:feed_profile": // Video Detail
					cost = 1
				case "key:channels:feed_list": // User Profile / Channel Feed
					cost = 1
				}
			}
		}

		if cost > 0 {
			user, err := database.GetUserByID(userID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{
					"code":    -1,
					"message": "User not found",
				})
				return
			}

			if user.Credits < cost {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{
					"code":    -1,
					"message": "Insufficient credits",
				})
				return
			}

			// Deduct credits
			if err := database.AddCredits(userID, -cost); err != nil {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{
					"code":    -1,
					"message": "Transaction failed",
				})
				return
			}

			// Record Transaction
			database.RecordTransaction(&models.Transaction{
				UserID:      userID,
				Amount:      -cost,
				Type:        req.Action,
				Description: "API Call: " + req.Action,
				RelatedID:   req.ClientID,
				CreatedAt:   time.Now(),
			})
		}

		// Auto-detect online client if not provided
		clientID := req.ClientID
		if clientID == "" {
			user, err := database.GetUserByID(userID)
			if err != nil || len(user.Devices) == 0 {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{
					"code":    -1,
					"message": "No device found",
				})
				return
			}

			required := requiredCapability(req.Action, req.Data)

			// Prefer a ready online device with required capability.
			for _, device := range user.Devices {
				if device.Status == "online" && nodeSupportsCapability(device, required) {
					clientID = device.ID
					break
				}
			}

			// Fallback to any online device for backward compatibility.
			if clientID == "" {
				for _, device := range user.Devices {
					if device.Status == "online" {
						clientID = device.ID
						break
					}
				}
			}

			if clientID == "" {
				msg := "No online device found"
				if required != "" {
					msg = "No online ready device supports this action"
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{
					"code":    -1,
					"message": msg,
				})
				return
			}
		}

		timeout := remoteCallTimeout(req.Action, req.Data)

		resp, err := hub.Call(userID, clientID, req.Action, req.Data, timeout)
		if err != nil {
			// 调用失败，退还已扣积分
			if cost > 0 {
				if refundErr := database.AddCredits(userID, cost); refundErr != nil {
					log.Printf("[RemoteCall] 退还积分失败 userID=%d cost=%d: %v", userID, cost, refundErr)
				}
			}
			// Return JSON error instead of plain text
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"code":    -1,
				"message": err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}
