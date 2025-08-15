// Environment Configuration
const ENV_CONFIG = {
    // Cached config from server
    _serverConfig: null,
    _isLoaded: false,

    // Environment detection based on hostname
    isDevelopment: () => {
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('192.168.') ||
               window.location.port !== '';
    },

    // Load config from server
    loadConfig: async () => {
        if (ENV_CONFIG._isLoaded) {
            return ENV_CONFIG._serverConfig;
        }

        try {
            // Get config from server - use absolute URL for Live Server compatibility
            const configUrl = window.location.hostname === '127.0.0.1' && window.location.port === '5501'
                ? 'http://localhost:5000/api/config'  // Live Server
                : '/api/config';  // Direct server access

            const response = await fetch(configUrl);
            if (response.ok) {
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Server returned unsuccessful response');
                }

                // Validate required config fields
                if (!data.config || !data.config.backendUrl) {
                    throw new Error('Invalid config: missing backendUrl');
                }

                ENV_CONFIG._serverConfig = data.config;
                ENV_CONFIG._isLoaded = true;
                return ENV_CONFIG._serverConfig;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Config API returned ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to load server config:', error);
            throw new Error('Cannot load configuration from server. Please check .env file and server status.');
        }
    },

    // Get backend URL
    getBackendUrl: () => {
        if (!ENV_CONFIG._serverConfig) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return ENV_CONFIG._serverConfig.backendUrl;
    },

    // Get frontend URL
    getFrontendUrl: () => {
        if (!ENV_CONFIG._serverConfig) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return ENV_CONFIG._serverConfig.frontendUrl;
    },

    // Get environment
    getEnvironment: () => {
        if (!ENV_CONFIG._serverConfig) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return ENV_CONFIG._serverConfig.environment;
    },

    // Debug mode (only in development)
    isDebugMode: () => {
        try {
            return ENV_CONFIG.getEnvironment() === 'development';
        } catch (error) {
            // Fallback to hostname detection if config not loaded
            return ENV_CONFIG.isDevelopment();
        }
    },

    // Check if config is loaded
    isConfigLoaded: () => {
        return ENV_CONFIG._isLoaded && ENV_CONFIG._serverConfig !== null;
    },

    // Get config status
    getConfigStatus: () => {
        return {
            loaded: ENV_CONFIG._isLoaded,
            hasConfig: ENV_CONFIG._serverConfig !== null,
            backendUrl: ENV_CONFIG._serverConfig?.backendUrl || null,
            environment: ENV_CONFIG._serverConfig?.environment || null
        };
    }
};

// Auto-load config when script loads
ENV_CONFIG.loadConfig().catch(error => {
    console.error('❌ Configuration Error:', error.message);

    // Show error to user if Toast is available
    setTimeout(() => {
        if (window.Toast) {
            Toast.error('Không thể tải cấu hình hệ thống. Vui lòng kiểm tra server.', 'Lỗi cấu hình');
        } else {
            alert('Lỗi cấu hình: ' + error.message);
        }
    }, 1000);
});

// Make it globally available
window.ENV_CONFIG = ENV_CONFIG;
