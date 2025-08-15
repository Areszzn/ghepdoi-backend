// Connection Status Manager
class ConnectionStatusManager {
    constructor() {
        this.indicator = null;
        this.isOnline = navigator.onLine;
        this.lastCheckTime = Date.now();
        this.init();
    }

    init() {
        // Create status indicator
        this.createIndicator();
        
        // Listen to online/offline events
        window.addEventListener('online', () => this.setStatus('online'));
        window.addEventListener('offline', () => this.setStatus('offline'));
        
        // Start periodic connection check
        this.startPeriodicCheck();
    }

    createIndicator() {
        if (document.querySelector('.connection-status')) {
            this.indicator = document.querySelector('.connection-status');
            return;
        }

        this.indicator = document.createElement('div');
        this.indicator.className = 'connection-status';
        this.indicator.innerHTML = `
            <div class="status-icon"></div>
            <span class="status-text">Đang kiểm tra kết nối...</span>
        `;
        document.body.appendChild(this.indicator);
    }

    setStatus(status, message = '') {
        if (!this.indicator) return;

        const statusText = this.indicator.querySelector('.status-text');
        
        // Remove all status classes
        this.indicator.classList.remove('online', 'offline', 'reconnecting', 'show');
        
        switch (status) {
            case 'online':
                this.indicator.classList.add('online', 'show');
                statusText.textContent = message || 'Kết nối ổn định';
                this.isOnline = true;
                // Hide after 3 seconds
                setTimeout(() => this.hide(), 3000);
                break;
                
            case 'offline':
                this.indicator.classList.add('offline', 'show');
                statusText.textContent = message || 'Mất kết nối mạng';
                this.isOnline = false;
                break;
                
            case 'reconnecting':
                this.indicator.classList.add('reconnecting', 'show');
                statusText.textContent = message || 'Đang kết nối lại...';
                break;
                
            case 'error':
                this.indicator.classList.add('offline', 'show');
                statusText.textContent = message || 'Lỗi kết nối server';
                this.isOnline = false;
                break;
        }
        
        this.lastCheckTime = Date.now();
    }

    hide() {
        if (this.indicator) {
            this.indicator.classList.remove('show');
        }
    }

    show() {
        if (this.indicator) {
            this.indicator.classList.add('show');
        }
    }

    async checkConnection() {
        try {
            // Check browser online status first
            if (!navigator.onLine) {
                this.setStatus('offline');
                return false;
            }

            // Check server connection
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(API_CONFIG.BASE_URL + '/health', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                if (!this.isOnline) {
                    this.setStatus('online', 'Kết nối đã được khôi phục');
                }
                return true;
            } else {
                this.setStatus('error', 'Server không phản hồi');
                return false;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.setStatus('error', 'Timeout kết nối server');
            } else {
                this.setStatus('offline', 'Không thể kết nối server');
            }
            return false;
        }
    }

    startPeriodicCheck() {
        // Check connection every 30 seconds
        setInterval(async () => {
            await this.checkConnection();
        }, 30000);
        
        // Initial check after 2 seconds
        setTimeout(() => {
            this.checkConnection();
        }, 2000);
    }

    // Manual connection check
    async manualCheck() {
        this.setStatus('reconnecting', 'Đang kiểm tra kết nối...');
        const isConnected = await this.checkConnection();
        
        if (isConnected) {
            this.setStatus('online', 'Kết nối thành công');
        } else {
            this.setStatus('error', 'Không thể kết nối');
        }
        
        return isConnected;
    }
}

// Initialize connection status manager
let connectionStatus = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on admin pages (not login)
    if (!window.location.pathname.includes('login.html')) {
        connectionStatus = new ConnectionStatusManager();
        
        // Make it globally available
        window.ConnectionStatus = connectionStatus;
    }
});

// Enhanced API error handling with connection status
if (window.API) {
    const originalHandleNetworkError = API.handleNetworkError;
    
    API.handleNetworkError = () => {
        if (connectionStatus) {
            connectionStatus.setStatus('error', 'Lỗi kết nối API');
        }
        
        // Call original handler
        if (originalHandleNetworkError) {
            originalHandleNetworkError();
        }
    };
}
