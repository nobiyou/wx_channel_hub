import { defineStore } from 'pinia'
import axios from 'axios'

export const useClientStore = defineStore('client', {
    state: () => ({
        clients: [], // 在线客户端列表
        loading: false,
        error: null,
        lastUpdated: null,
        currentClient: null, // 当前选中的客户端 (for remote ops)
    }),

    getters: {
        onlineCount: (state) => state.clients.length,
        getClientById: (state) => (id) => state.clients.find(c => c.id === id)
    },

    actions: {
        normalizeClient(client) {
            const methods = client.methods && typeof client.methods === 'object' ? client.methods : {}
            const enabledMethods = Object.keys(methods).filter(key => methods[key])
            return {
                ...client,
                methods,
                enabledMethods,
                api_ready: !!client.api_ready,
                supports_search: !!client.supports_search,
                supports_feed: !!client.supports_feed,
                supports_profile: !!client.supports_profile,
                ready_clients: Number(client.ready_clients || 0),
                search_ready_clients: Number(client.search_ready_clients || 0),
                feed_ready_clients: Number(client.feed_ready_clients || 0),
                profile_ready_clients: Number(client.profile_ready_clients || 0),
                ws_clients: Number(client.ws_clients || 0),
                page_path: client.page_path || '',
                href: client.href || ''
            }
        },

        findBestClient(preference = 'search') {
            const onlineClients = this.clients.filter(client => client.status === 'online')
            if (!onlineClients.length) return null

            const scoreClient = (client) => {
                let score = 0
                if (client.api_ready) score += 100
                if (client.ready_clients > 0) score += client.ready_clients * 5
                if (client.ws_clients > 0) score += Math.min(client.ws_clients, 5)
                if (preference === 'search' && client.supports_search) score += 60
                if (preference === 'feed' && client.supports_feed) score += 60
                if (preference === 'profile' && client.supports_profile) score += 60
                if (client.supports_search) score += 20
                if (client.supports_feed) score += 15
                if (client.supports_profile) score += 10
                return score
            }

            return [...onlineClients].sort((a, b) => scoreClient(b) - scoreClient(a))[0] || null
        },

        ensureBestClient(preference = 'search') {
            const bestClient = this.findBestClient(preference)
            if (bestClient) {
                this.setCurrentClient(bestClient.id)
            }
            return bestClient
        },

        async fetchClients() {
            this.loading = true
            try {
                const res = await axios.get('/api/clients')
                this.clients = (res.data || []).map(client => this.normalizeClient(client))
                this.lastUpdated = new Date()

                // Restore selection if exists
                const savedId = localStorage.getItem('hub_last_client_id')
                if (savedId && !this.currentClient) {
                    this.setCurrentClient(savedId)
                } else if (this.currentClient) {
                    // Update current client object with latest data
                    this.setCurrentClient(this.currentClient.id)
                } else {
                    this.ensureBestClient('search')
                }
            } catch (err) {
                this.error = err.message
                console.error('Failed to fetch clients:', err)
            } finally {
                this.loading = false
            }
        },

        setCurrentClient(clientId) {
            const client = this.getClientById(clientId) || null
            this.currentClient = client
            if (client) {
                localStorage.setItem('hub_last_client_id', clientId)
            }
        },

        // 远程调用通用方法
        async remoteCall(action, payload) {
            // 如果没有选中客户端，传递空 client_id，让后端自动选择
            const clientId = this.currentClient ? this.currentClient.id : ''

            const res = await axios.post('/api/call', {
                client_id: clientId,
                action: action,
                data: payload
            })

            // Hub Server returns { request_id, success, data, error }
            if (!res.data.success) {
                throw new Error(res.data.error || 'Remote call failed')
            }
            return res.data
        }
    }
})
