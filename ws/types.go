package ws

import "encoding/json"

type MessageType string

const (
	MsgTypeHeartbeat MessageType = "heartbeat"
	MsgTypeCommand   MessageType = "command"
	MsgTypeResponse  MessageType = "response"
	MsgTypeBind      MessageType = "bind"
	MsgTypeSyncData  MessageType = "sync_data" // 客户端主动推送同步数据
)

type CloudMessage struct {
	ID         string          `json:"id"`
	Type       MessageType     `json:"type"`
	ClientID   string          `json:"client_id"`
	Payload    json.RawMessage `json:"payload"`
	Timestamp  int64           `json:"timestamp"`
	Compressed bool            `json:"compressed,omitempty"`
}

type HeartbeatPayload struct {
	Hostname            string          `json:"hostname"`
	Version             string          `json:"version"`
	Status              string          `json:"status"`
	HardwareFingerprint string          `json:"hardware_fingerprint,omitempty"` // JSON string of hardware fingerprint
	PagePath            string          `json:"page_path,omitempty"`
	Href                string          `json:"href,omitempty"`
	APIReady            bool            `json:"api_ready,omitempty"`
	WSClients           int             `json:"ws_clients,omitempty"`
	ReadyClients        int             `json:"ready_clients,omitempty"`
	SearchReadyClients  int             `json:"search_ready_clients,omitempty"`
	FeedReadyClients    int             `json:"feed_ready_clients,omitempty"`
	ProfileReadyClients int             `json:"profile_ready_clients,omitempty"`
	SupportsSearch      bool            `json:"supports_search,omitempty"`
	SupportsFeed        bool            `json:"supports_feed,omitempty"`
	SupportsProfile     bool            `json:"supports_profile,omitempty"`
	Methods             map[string]bool `json:"methods,omitempty"`
}

type CommandPayload struct {
	Action string          `json:"action"`
	Data   json.RawMessage `json:"data"`
}

type ResponsePayload struct {
	RequestID string          `json:"request_id"`
	Success   bool            `json:"success"`
	Data      json.RawMessage `json:"data"`
	Error     string          `json:"error"`
}

// SyncDataPayload 同步数据负载
type SyncDataPayload struct {
	SyncType string          `json:"sync_type"` // "browse" or "download"
	Records  json.RawMessage `json:"records"`   // 记录数组
	Count    int             `json:"count"`
	HasMore  bool            `json:"has_more"`
}
