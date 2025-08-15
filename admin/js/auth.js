// Authentication functions
const Auth = {
    // Check if user is authenticated
    isAuthenticated: () => {
        const token = API.getToken();
        return token !== null;
    },
    
    // Login function
    login: async (username, password) => {
        try {
            const response = await API.post(API_CONFIG.ENDPOINTS.LOGIN, {
                username,
                password
            });

            if (response.token) {
                API.setToken(response.token);
                return { success: true };
            }

            return { success: false, error: 'Login failed' };
        } catch (error) {
            console.error('Login error:', error);

            // Handle specific error messages
            if (error.message && error.message.includes('Access denied')) {
                return { success: false, error: 'Bạn không có quyền truy cập.' };
            } else if (error.message && error.message.includes('Invalid credentials')) {
                return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
            }

            return { success: false, error: 'Đăng nhập thất bại. Vui lòng thử lại.' };
        }
    },
    
    // Logout function
    logout: () => {
        API.removeToken();
        window.location.href = 'login.html';
    },

    // Logout with confirmation
    logoutWithConfirm: async () => {
        const confirmed = await (window.Confirm ? Confirm.logout() : confirm('Bạn có chắc chắn muốn đăng xuất?'));
        if (confirmed) {
            Auth.logout();
        }
    },
    
    // Check authentication on page load
    checkAuth: () => {
        if (!Auth.isAuthenticated()) {
            // Redirect to login page if not authenticated
            window.location.href = 'login.html';
        }
    },

    // Verify token with server
    verifyToken: async () => {
        try {
            const url = API_CONFIG.BASE_URL + '/users';
            const token = API.getToken();

            if (!token) {
                return false;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    },

    // Start periodic token check
    startTokenCheck: () => {
        // Check token every 10 minutes
        setInterval(async () => {
            if (Auth.isAuthenticated()) {
                // First check connection
                const hasConnection = await API.checkConnection();
                if (!hasConnection) {
                    return; // Skip token check if no connection
                }

                const isValid = await Auth.verifyToken();
                if (!isValid) {
                    Auth.forceLogout();
                }
            }
        }, 10 * 60 * 1000); // 10 minutes
    },

    // Start connection monitoring
    startConnectionMonitor: () => {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            console.log('Connection restored');
            if (window.Toast) {
                Toast.success('Kết nối đã được khôi phục', 'Trực tuyến');
            }
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost');
            if (window.Toast) {
                Toast.warning('Mất kết nối mạng. Một số tính năng có thể không hoạt động.', 'Ngoại tuyến');
            }
        });
    },

    // Force logout without confirmation
    forceLogout: () => {
        API.removeToken();

        if (window.Toast) {
            Toast.warning('Phiên đăng nhập đã hết hạn. Đang chuyển hướng...', 'Hết phiên');
        }

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    },


};

// Global logout function
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        Auth.logout();
    }
}

// Check authentication when page loads (except for login page)
document.addEventListener('DOMContentLoaded', () => {
    // Don't check auth on login page
    if (!window.location.pathname.includes('login.html')) {
        // Wait for config to load before starting auth checks
        API.waitForConfig().then(() => {
            Auth.checkAuth();
            Auth.startTokenCheck();
            Auth.startConnectionMonitor();

            // Initial token verification (delayed to avoid immediate logout)
            setTimeout(async () => {
                if (Auth.isAuthenticated()) {
                    const isValid = await Auth.verifyToken();
                    if (!isValid) {
                        Auth.forceLogout();
                    }
                }
            }, 10000); // Check after 10 seconds
        }).catch(error => {
            console.error('Failed to load config:', error);
            if (window.Toast) {
                Toast.error('Không thể tải cấu hình hệ thống', 'Lỗi cấu hình');
            }
        });
    }
});
