// Window Manager for GM Chain - eCox Creation
class WindowManager {
    constructor() {
        this.isDragging = false;
        this.dragElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.windows = {};
        this.zIndex = 1000;
        this.notifications = [];
        this.notificationId = 0;
        
        // Bind methods to maintain 'this' context
        this.boundHandleDrag = this.handleDrag.bind(this);
        this.boundStopDrag = this.stopDrag.bind(this);
        
        this.initWindowManager();
        this.initNotificationSystem();
    }
    
    initWindowManager() {
        // Initialize window states
        this.windows = {
            'minigames-window': { 
                minimized: false, 
                maximized: false, 
                originalState: null,
                visible: false
            },
            'game-window': { 
                minimized: false, 
                maximized: false, 
                originalState: null,
                visible: false
            }
        };
        
        // Add global event listeners for dragging
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        // Prevent text selection during drag
        document.addEventListener('selectstart', (e) => {
            if (this.isDragging) e.preventDefault();
        });
    }
    
    startDrag(event, windowId) {
        const windowElement = document.getElementById(windowId);
        if (!windowElement) return;
        
        // Only allow dragging from header
        if (!event.target.closest('.window-header')) return;
        
        this.isDragging = true;
        this.dragElement = windowElement;
        
        // Bring window to front
        windowElement.style.zIndex = ++this.zIndex;
        
        // Get current position
        const rect = windowElement.getBoundingClientRect();
        
        // Calculate exact offset from mouse to window's current position
        this.dragOffset.x = event.clientX - rect.left;
        this.dragOffset.y = event.clientY - rect.top;
        
        // Ensure position is set before dragging
        if (!windowElement.style.left || !windowElement.style.top) {
            windowElement.style.left = rect.left + 'px';
            windowElement.style.top = rect.top + 'px';
        }
        
        // Set absolute positioning
        windowElement.style.position = 'absolute';
        
        // Add dragging class for visual feedback
        windowElement.classList.add('dragging');
        
        // Prevent text selection and default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Change cursor
        document.body.style.cursor = 'move';
        
        // Add temporary event listeners for better responsiveness
        document.addEventListener('mousemove', this.boundHandleDrag);
        document.addEventListener('mouseup', this.boundStopDrag);
    }
    
    handleDrag(event) {
        if (!this.isDragging || !this.dragElement) return;
        
        // Calculate new position with offset
        let newX = event.clientX - this.dragOffset.x;
        let newY = event.clientY - this.dragOffset.y;
        
        // Get viewport boundaries
        const maxX = window.innerWidth - this.dragElement.offsetWidth;
        const maxY = window.innerHeight - this.dragElement.offsetHeight - 30; // Account for taskbar
        
        // Constrain to viewport (with some tolerance for edge snapping)
        newX = Math.max(-10, Math.min(newX, maxX + 10));
        newY = Math.max(0, Math.min(newY, maxY));
        
        // Apply new position immediately
        this.dragElement.style.left = newX + 'px';
        this.dragElement.style.top = newY + 'px';
        
        // Prevent default behavior
        event.preventDefault();
    }
    
    stopDrag() {
        if (!this.isDragging) return;
        
        // Remove dragging class
        if (this.dragElement) {
            this.dragElement.classList.remove('dragging');
        }
        
        // Reset cursor
        document.body.style.cursor = '';
        
        // Remove temporary event listeners
        document.removeEventListener('mousemove', this.boundHandleDrag);
        document.removeEventListener('mouseup', this.boundStopDrag);
        
        // Reset dragging state
        this.isDragging = false;
        this.dragElement = null;
        this.dragOffset = { x: 0, y: 0 };
    }
    
    minimizeWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        const windowState = this.windows[windowId];
        
        if (!windowElement || !windowState) return;
        
        if (!windowState.minimized) {
            // Store current state
            windowState.originalState = {
                display: windowElement.style.display,
                position: windowElement.style.position,
                left: windowElement.style.left,
                top: windowElement.style.top,
                width: windowElement.style.width,
                height: windowElement.style.height
            };
            
            // Minimize
            windowElement.style.display = 'none';
            windowState.minimized = true;
            windowState.visible = false;
            
            // Update taskbar
            this.updateTaskbar(windowId, false);
        } else {
            // Restore from minimize
            this.restoreWindow(windowId);
        }
    }
    
    maximizeWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        const windowState = this.windows[windowId];
        
        if (!windowElement || !windowState) return;
        
        if (!windowState.maximized) {
            // Store current state
            windowState.originalState = {
                position: windowElement.style.position,
                left: windowElement.style.left,
                top: windowElement.style.top,
                width: windowElement.style.width,
                height: windowElement.style.height
            };
            
            // Maximize
            windowElement.style.position = 'absolute';
            windowElement.style.left = '0px';
            windowElement.style.top = '0px';
            windowElement.style.width = '100vw';
            windowElement.style.height = 'calc(100vh - 30px)'; // Account for taskbar
            windowState.maximized = true;
        } else {
            // Restore from maximize
            this.restoreWindow(windowId);
        }
    }
    
    restoreWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        const windowState = this.windows[windowId];
        
        if (!windowElement || !windowState || !windowState.originalState) return;
        
        // Restore original state
        const original = windowState.originalState;
        windowElement.style.position = original.position || 'absolute';
        windowElement.style.left = original.left || '';
        windowElement.style.top = original.top || '';
        windowElement.style.width = original.width || '';
        windowElement.style.height = original.height || '';
        windowElement.style.display = original.display || 'block';
        
        // Reset states
        windowState.minimized = false;
        windowState.maximized = false;
        windowState.visible = true;
        windowState.originalState = null;
        
        // Update taskbar
        this.updateTaskbar(windowId, true);
    }
    
    closeWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        const windowState = this.windows[windowId];
        
        if (!windowElement || !windowState) return;
        
        windowElement.style.display = 'none';
        windowState.visible = false;
        windowState.minimized = false;
        windowState.maximized = false;
        
        // Update taskbar
        this.updateTaskbar(windowId, false);
    }
    
    showWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        const windowState = this.windows[windowId];
        
        if (!windowElement || !windowState) return;
        
        windowElement.style.display = 'block';
        windowElement.style.zIndex = ++this.zIndex;
        windowState.visible = true;
        windowState.minimized = false;
        
        // Center window if not positioned yet
        if (!windowElement.style.left || windowElement.style.left === '') {
            this.centerWindow(windowElement, windowId);
        }
        
        // Update taskbar
        this.updateTaskbar(windowId, true);
    }
    
    centerWindow(windowElement, windowId) {
        const rect = windowElement.getBoundingClientRect();
        let windowWidth = rect.width || 800;
        let windowHeight = rect.height || 600;
        
        // Specific sizing for different windows
        if (windowId === 'minigames-window') {
            windowWidth = 400;
            windowHeight = 300;
        } else if (windowId === 'game-window') {
            windowWidth = 800;
            windowHeight = 600;
        }
        
        const centerX = (window.innerWidth - windowWidth) / 2;
        const centerY = (window.innerHeight - windowHeight) / 2 - 15; // Account for taskbar
        
        windowElement.style.left = Math.max(20, centerX) + 'px';
        windowElement.style.top = Math.max(20, centerY) + 'px';
        windowElement.style.position = 'absolute';
    }
    
    // Windows 95/98 Style Notification System
    initNotificationSystem() {
        this.notificationContainer = document.getElementById('notification-container');
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.className = 'notification-container';
            this.notificationContainer.id = 'notification-container';
            document.body.appendChild(this.notificationContainer);
        }
    }
    
    showNotification(options = {}) {
        const {
            title = 'Notification',
            message = '',
            type = 'info', // info, success, warning, error
            duration = 5000,
            icon = null,
            buttons = [],
            sound = true,
            progress = true
        } = options;
        
        const notificationId = ++this.notificationId;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${notificationId}`;
        
        // Get appropriate icon
        const iconSvg = this.getNotificationIcon(type, icon);
        const messageIconSvg = this.getMessageIcon(type);
        
        // Create notification HTML
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    ${iconSvg}
                    <span>${title}</span>
                </div>
                <button class="notification-close" onclick="windowManager.closeNotification(${notificationId})">×</button>
            </div>
            <div class="notification-content">
                ${messageIconSvg}
                <div class="notification-text">
                    ${message}
                    ${buttons.length > 0 ? `
                        <div class="notification-buttons">
                            ${buttons.map((btn, index) => 
                                `<button class="notification-button" onclick="${btn.action}; windowManager.closeNotification(${notificationId})">${btn.text}</button>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            ${progress ? `
                <div class="notification-progress">
                    <div class="notification-progress-bar"></div>
                </div>
            ` : ''}
            ${sound ? '<div class="notification-sound"></div>' : ''}
        `;
        
        // Add to container
        this.notificationContainer.appendChild(notification);
        this.notifications.push({ id: notificationId, element: notification });
        
        // Play notification sound
        if (sound && window.gmChainGame && window.gmChainGame.audioContext) {
            this.playNotificationSound(type);
        }
        
        // Auto-close after duration
        if (duration > 0) {
            setTimeout(() => {
                this.closeNotification(notificationId);
            }, duration);
        }
        
        return notificationId;
    }
    
    closeNotification(notificationId) {
        const notification = document.getElementById(`notification-${notificationId}`);
        if (notification) {
            notification.classList.add('closing');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications = this.notifications.filter(n => n.id !== notificationId);
            }, 300);
        }
    }
    
    getNotificationIcon(type, customIcon) {
        if (customIcon) return customIcon;
        
        const icons = {
            info: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'><circle fill=\'%230080ff\' cx=\'8\' cy=\'8\' r=\'8\'/><path fill=\'white\' d=\'M7,3 L9,3 L9,5 L7,5 Z M7,7 L9,7 L9,13 L7,13 Z\'/></svg>" class="notification-icon">',
            success: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'><circle fill=\'%2300ff00\' cx=\'8\' cy=\'8\' r=\'8\'/><path fill=\'white\' d=\'M6,8 L7,9 L10,6 L11,7 L7,11 L5,9 Z\'/></svg>" class="notification-icon">',
            warning: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'><polygon fill=\'%23ff8000\' points=\'8,1 15,14 1,14\'/><path fill=\'white\' d=\'M7,5 L9,5 L9,9 L7,9 Z M7,11 L9,11 L9,13 L7,13 Z\'/></svg>" class="notification-icon">',
            error: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'><circle fill=\'%23ff0000\' cx=\'8\' cy=\'8\' r=\'8\'/><path fill=\'white\' d=\'M6,6 L10,10 M10,6 L6,10\' stroke=\'white\' stroke-width=\'2\'/></svg>" class="notification-icon">'
        };
        
        return icons[type] || icons.info;
    }
    
    getMessageIcon(type) {
        const icons = {
            info: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'><circle fill=\'%230080ff\' cx=\'16\' cy=\'16\' r=\'16\'/><path fill=\'white\' d=\'M14,6 L18,6 L18,10 L14,10 Z M14,14 L18,14 L18,26 L14,26 Z\'/></svg>" class="notification-message-icon">',
            success: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'><circle fill=\'%2300ff00\' cx=\'16\' cy=\'16\' r=\'16\'/><path fill=\'white\' d=\'M12,16 L14,18 L20,12 L22,14 L14,22 L10,18 Z\'/></svg>" class="notification-message-icon">',
            warning: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'><polygon fill=\'%23ff8000\' points=\'16,2 30,28 2,28\'/><path fill=\'white\' d=\'M14,10 L18,10 L18,18 L14,18 Z M14,22 L18,22 L18,26 L14,26 Z\'/></svg>" class="notification-message-icon">',
            error: '<img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'><circle fill=\'%23ff0000\' cx=\'16\' cy=\'16\' r=\'16\'/><path fill=\'white\' d=\'M12,12 L20,20 M20,12 L12,20\' stroke=\'white\' stroke-width=\'3\'/></svg>" class="notification-message-icon">'
        };
        
        return icons[type] || icons.info;
    }
    
    playNotificationSound(type) {
        const frequencies = {
            info: [800, 1000],
            success: [440, 880, 1320],
            warning: [400, 300],
            error: [200, 150, 100]
        };
        
        const freq = frequencies[type] || frequencies.info;
        
        if (window.gmChainGame && window.gmChainGame.audioContext) {
            freq.forEach((f, index) => {
                setTimeout(() => {
                    window.gmChainGame.playSound(f, 0.1, 'sine', 0.05);
                }, index * 100);
            });
        }
    }
    
    updateTaskbar(windowId, visible) {
        const taskbarItem = document.getElementById(windowId.replace('-window', '-taskbar'));
        if (taskbarItem) {
            taskbarItem.style.display = visible ? 'flex' : 'none';
        }
    }
}

// Global window manager instance
const windowManager = new WindowManager();

// Global functions for HTML onclick events
function startDrag(event, windowId) {
    windowManager.startDrag(event, windowId);
}

function minimizeWindow(windowId) {
    windowManager.minimizeWindow(windowId);
}

function maximizeWindow(windowId) {
    windowManager.maximizeWindow(windowId);
}

function closeWindow(windowId) {
    windowManager.closeWindow(windowId);
}

function closeGameWindow() {
    // Stop game if running
    if (window.gmChainGame && window.gmChainGame.isRunning) {
        window.gmChainGame.resetGame();
    }
    windowManager.closeWindow('game-window');
}

// Desktop functionality
function openMinigamesFolder() {
    windowManager.showWindow('minigames-window');
}

function openGMChain() {
    windowManager.closeWindow('minigames-window');
    windowManager.showWindow('game-window');
    
    // Initialize game if not already done
    if (!window.gmChainGame) {
        setTimeout(() => {
            window.gmChainGame = new GMChainGame();
        }, 100);
    }
}

// Game Over functions
function closeGameOver() {
    document.getElementById('game-over-dialog').style.display = 'none';
}

function restartGame() {
    closeGameOver();
    if (window.gmChainGame) {
        window.gmChainGame.resetGame();
    }
}

function shareOnTwitter() {
    const score = document.getElementById('final-score').textContent;
    const streak = document.getElementById('final-streak').textContent;
    const time = document.getElementById('time-survived').textContent;

    const text = `🎮 Just played GM Chain by eCox!\n\n🚀 Score: ${score}\n⚡ Max Streak: ${streak}\n⏰ Survived: ${time}\n\n48-hour challenge inspired by @Ethereum_OS! Can you beat me? 🏆\n\n#GMChain #EthereumOS #eCox #Gaming`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function shareScreenshot() {
    // Create a canvas to capture the game over screen
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    // Create a nice background
    ctx.fillStyle = '#018281';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add game info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px "MS Sans Serif"';
    ctx.textAlign = 'center';
    ctx.fillText('GM Chain - EthereumOS Game', canvas.width/2, 80);
    
    ctx.font = 'bold 24px "MS Sans Serif"';
    ctx.fillText('Created by eCox', canvas.width/2, 120);
    
    // Add stats
    const score = document.getElementById('final-score').textContent;
    const streak = document.getElementById('final-streak').textContent;
    const time = document.getElementById('time-survived').textContent;
    
    ctx.font = 'bold 28px "MS Sans Serif"';
    ctx.fillText(`Final Score: ${score}`, canvas.width/2, 200);
    ctx.fillText(`Max Streak: ${streak}`, canvas.width/2, 250);
    ctx.fillText(`Time Survived: ${time}`, canvas.width/2, 300);
    
    ctx.font = 'bold 20px "MS Sans Serif"';
    ctx.fillText('48-Hour Challenge - Can you survive longer?', canvas.width/2, 400);
    ctx.fillText('#GMChain #EthereumOS #eCox', canvas.width/2, 450);
    
    // Convert to blob and copy to clipboard
    canvas.toBlob(async (blob) => {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            
            windowManager.showNotification({
                title: 'Screenshot Captured! 📸',
                message: '<strong>Success!</strong><br>Screenshot copied to clipboard.<br>Paste it in your X (Twitter) post!',
                type: 'success',
                duration: 7000,
                buttons: [
                    { text: 'Open X', action: 'window.open("https://x.com/compose/tweet", "_blank")' },
                    { text: 'OK', action: '' }
                ]
            });
        } catch (err) {
            console.error('Failed to copy screenshot:', err);
            
            windowManager.showNotification({
                title: 'Screenshot Failed ❌',
                message: '<strong>Error!</strong><br>Screenshot generation failed.<br>Try the text share instead!',
                type: 'error',
                duration: 5000,
                buttons: [
                    { text: 'Try Again', action: 'shareScreenshot()' },
                    { text: 'Text Share', action: 'shareOnTwitter()' }
                ]
            });
        }
    });
}

// Initialize desktop on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🖥️ Windows Desktop loaded - eCox Window Manager v1.0');
    
    // Set initial window positions
    const gameWindow = document.getElementById('game-window');
    const folderWindow = document.getElementById('minigames-window');
    
    if (gameWindow) {
        // Center the game window perfectly
        const windowWidth = 800;
        const windowHeight = 600;
        const centerX = (window.innerWidth - windowWidth) / 2;
        const centerY = (window.innerHeight - windowHeight) / 2 - 15; // Account for taskbar
        
        gameWindow.style.left = centerX + 'px';
        gameWindow.style.top = Math.max(20, centerY) + 'px';
        gameWindow.style.width = windowWidth + 'px';
    }
    
    if (folderWindow) {
        // Center the folder window but slightly offset
        const windowWidth = 400;
        const windowHeight = 300;
        const centerX = (window.innerWidth - windowWidth) / 2 - 100;
        const centerY = (window.innerHeight - windowHeight) / 2 - 50;
        
        folderWindow.style.left = Math.max(20, centerX) + 'px';
        folderWindow.style.top = Math.max(20, centerY) + 'px';
    }
});
