// Confirmation Modal System
class ConfirmManager {
    constructor() {
        this.overlay = null;
        this.currentResolve = null;
        this.init();
    }

    init() {
        // Create overlay if it doesn't exist
        if (!document.querySelector('.confirm-overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'confirm-overlay';
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.hide(false);
                }
            });
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.querySelector('.confirm-overlay');
        }

        // Handle ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('show')) {
                this.hide(false);
            }
        });
    }

    show(options = {}) {
        return new Promise((resolve) => {
            this.currentResolve = resolve;

            const {
                title = 'Xác nhận',
                message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
                type = 'danger', // danger, warning, info, success
                confirmText = 'Xác nhận',
                cancelText = 'Hủy',
                confirmIcon = '',
                cancelIcon = '',
                showCancel = true,
                danger = false // shorthand for type = 'danger'
            } = options;

            const modalType = danger ? 'danger' : type;
            const icon = this.getIcon(modalType);

            this.overlay.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-header">
                        <div class="confirm-icon ${modalType}">
                            ${icon}
                        </div>
                        <h3 class="confirm-title">${title}</h3>
                    </div>
                    <div class="confirm-body">
                        <p class="confirm-message">${message}</p>
                    </div>
                    <div class="confirm-actions">
                        ${showCancel ? `
                            <button class="confirm-btn secondary" data-action="cancel">
                                ${cancelIcon ? `<i class="${cancelIcon}"></i>` : ''}
                                ${cancelText}
                            </button>
                        ` : ''}
                        <button class="confirm-btn primary" data-action="confirm">
                            ${confirmIcon ? `<i class="${confirmIcon}"></i>` : ''}
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            // Add event listeners
            this.overlay.querySelectorAll('.confirm-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.closest('.confirm-btn').dataset.action;
                    this.hide(action === 'confirm');
                });
            });

            // Show modal
            this.overlay.classList.add('show');
            
            // Focus on confirm button
            setTimeout(() => {
                const confirmBtn = this.overlay.querySelector('[data-action="confirm"]');
                if (confirmBtn) confirmBtn.focus();
            }, 100);
        });
    }

    hide(result) {
        this.overlay.classList.remove('show');
        
        setTimeout(() => {
            if (this.currentResolve) {
                this.currentResolve(result);
                this.currentResolve = null;
            }
        }, 300);
    }

    getIcon(type) {
        const icons = {
            danger: '<i class="fas fa-exclamation-triangle"></i>',
            warning: '<i class="fas fa-exclamation-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            success: '<i class="fas fa-check-circle"></i>'
        };
        return icons[type] || icons.danger;
    }

    // Async confirm with loading state
    async confirmAsync(options = {}, asyncAction) {
        const result = await this.show(options);
        
        if (result && asyncAction) {
            const confirmBtn = this.overlay.querySelector('[data-action="confirm"]');
            const cancelBtn = this.overlay.querySelector('[data-action="cancel"]');
            
            // Show loading state
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.classList.add('loading');
                confirmBtn.innerHTML = '<div class="spinner"></div> Đang xử lý...';
            }
            if (cancelBtn) {
                cancelBtn.disabled = true;
            }

            try {
                await asyncAction();
                this.hide(true);
                return true;
            } catch (error) {
                // Reset button state on error
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.classList.remove('loading');
                    confirmBtn.innerHTML = options.confirmText || 'Xác nhận';
                }
                if (cancelBtn) {
                    cancelBtn.disabled = false;
                }
                throw error;
            }
        }
        
        return result;
    }
}

// Initialize confirm manager
const confirmManager = new ConfirmManager();

// Enhanced Confirm utility
const Confirm = {
    // Basic confirmation
    show: (message, title = 'Xác nhận') => {
        return confirmManager.show({ title, message });
    },

    // Delete confirmation
    delete: (itemName = 'mục này', title = 'Xác nhận xóa') => {
        return confirmManager.show({
            title,
            message: `Bạn có chắc chắn muốn xóa ${itemName}? Hành động này không thể hoàn tác.`,
            type: 'danger',
            confirmText: 'Xóa',
            confirmIcon: 'fas fa-trash',
            cancelText: 'Hủy'
        });
    },

    // Save confirmation
    save: (message = 'Bạn có muốn lưu các thay đổi?') => {
        return confirmManager.show({
            title: 'Lưu thay đổi',
            message,
            type: 'info',
            confirmText: 'Lưu',
            confirmIcon: 'fas fa-save',
            cancelText: 'Không lưu'
        });
    },

    // Warning confirmation
    warning: (message, title = 'Cảnh báo') => {
        return confirmManager.show({
            title,
            message,
            type: 'warning',
            confirmText: 'Tiếp tục',
            cancelText: 'Hủy'
        });
    },

    // Logout confirmation
    logout: () => {
        return confirmManager.show({
            title: 'Đăng xuất',
            message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
            type: 'warning',
            confirmText: 'Đăng xuất',
            confirmIcon: 'fas fa-sign-out-alt',
            cancelText: 'Ở lại'
        });
    },

    // Custom confirmation with async action
    async: (options, asyncAction) => {
        return confirmManager.confirmAsync(options, asyncAction);
    },

    // Quick danger confirmation
    danger: (message, title = 'Cảnh báo') => {
        return confirmManager.show({
            title,
            message,
            type: 'danger',
            confirmText: 'Xác nhận',
            cancelText: 'Hủy'
        });
    }
};

// Export for global use
window.Confirm = Confirm;
window.confirmManager = confirmManager;
