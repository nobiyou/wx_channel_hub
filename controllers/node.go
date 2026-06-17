package controllers

import (
	"encoding/json"
	"net/http"
	"wx_channel/hub_server/database"
	"wx_channel/hub_server/models"
)

func GetNodes(w http.ResponseWriter, r *http.Request) {
	nodes, err := database.GetNodes()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(serializeNodes(nodes))
}

func serializeNodes(nodes []models.Node) []models.Node {
	for i := range nodes {
		if nodes[i].MethodsJSON == "" {
			nodes[i].Methods = map[string]bool{}
			continue
		}
		methods := make(map[string]bool)
		if err := json.Unmarshal([]byte(nodes[i].MethodsJSON), &methods); err == nil {
			nodes[i].Methods = methods
		} else {
			nodes[i].Methods = map[string]bool{}
		}
	}
	return nodes
}
