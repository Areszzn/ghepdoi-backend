// API Configuration
const API_CONFIG = {
    // Automatically detect environment
    BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'https://api.ghepdoi.live/api'
        : 'https://api.ghepdoi.live/api',
    ENDPOINTS: {
        // Health check endpoint
        HEALTH: '/health',

        // Auth endpoints
        LOGIN: '/auth/admin/login',

        // User endpoints
        USERS: '/users',
        USER_BY_ID: '/users/:id',

        // Bank account endpoints
        BANKS: '/bank-accounts?admin=true',
        BANK_BY_ID: '/bank-accounts/:id',
        BANK_CREATE: '/bank-accounts/admin',

        // Transaction endpoints
        TRANSACTIONS: '/transactions?admin=true',
        TRANSACTION_BY_ID: '/transactions/:id',
        TRANSACTION_CREATE: '/transactions/admin',

        // Settings endpoints
        SETTINGS: '/settings',
        SETTING_BY_NAME: '/settings/:name'
    }
};

// Utility functions
const Utils = {
    // Format currency
    formatCurrency: (amount) => {
        // Convert to integer to remove decimal places, then format with dots
        const integerAmount = Math.floor(amount);
        return integerAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VND';
    },
    
    // Format date
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Show loading
    showLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<tr><td colspan="100%" class="text-center">Đang tải...</td></tr>';
        }
    },
    
    // Show error
    showError: (elementId, message) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<tr><td colspan="100%" class="text-center" style="color: red;">Lỗi: ${message}</td></tr>`;
        }
    },
    
    // Show success message
    showSuccess: (message) => {
        alert('Thành công: ' + message);
    },
    
    // Show error message
    showErrorMessage: (message) => {
        alert('Lỗi: ' + message);
    },
    
    // Get status badge HTML
    getStatusBadge: (status) => {
        const statusMap = {
            'pending': { class: 'status-pending', text: 'Chờ xử lý' },
            'processing': { class: 'status-processing', text: 'Đang xử lý' },
            'completed': { class: 'status-completed', text: 'Hoàn thành' },
            'cancelled': { class: 'status-cancelled', text: 'Đã hủy' },
            'failed': { class: 'status-failed', text: 'Thất bại' }
        };
        
        const statusInfo = statusMap[status] || { class: 'status-pending', text: status };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    },
    
    // Get transaction type text
    getTransactionType: (type) => {
        return type === 'deposit' ? 'Nạp tiền' : 'Rút tiền';
    }
};

// API Helper functions
const API = {
    // Get auth token
    getToken: () => {
        return localStorage.getItem('admin_token');
    },
    
    // Set auth token
    setToken: (token) => {
        localStorage.setItem('admin_token', token);
    },
    
    // Remove auth token
    removeToken: () => {
        localStorage.removeItem('admin_token');
    },
    
    // Make API request
    request: async (endpoint, options = {}) => {
        const url = API_CONFIG.BASE_URL + endpoint;
        const token = API.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error || data.message || 'API request failed';
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // GET request
    get: (endpoint) => {
        return API.request(endpoint, { method: 'GET' });
    },
    
    // POST request
    post: (endpoint, data) => {
        return API.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // PUT request
    put: (endpoint, data) => {
        return API.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    // DELETE request
    delete: (endpoint) => {
        return API.request(endpoint, { method: 'DELETE' });
    },

    // Check API connection
    checkConnection: async () => {
        try {
            const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.HEALTH, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: data.message || 'API connected successfully',
                    status: data.status || 'OK'
                };
            } else {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }
        } catch (error) {
            console.error('API Connection Error:', error);
            return {
                success: false,
                error: error.message || 'Cannot connect to API server'
            };
        }
    },

    // Get current API URL
    getApiUrl: () => {
        return API_CONFIG.BASE_URL;
    }
};
