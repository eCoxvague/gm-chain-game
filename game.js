// GM Chain Game - EthereumOS Mini Game v2.0 by eCox
class GMChainGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.streak = 0;
        this.missStreak = 0;
        this.totalMisses = 0;
        this.maxMisses = 10;
        this.health = 100;
        this.timeLeft = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
        this.startTime = Date.now();
        this.gmButtons = [];
        this.bombs = [];
        this.particles = [];
        this.lastTime = 0;
        this.spawnRate = 2000; // Initial spawn rate in ms
        this.bombSpawnRate = 8000; // Initial bomb spawn rate
        this.lastSpawn = 0;
        this.lastBombSpawn = 0;
        this.maxButtons = 5;
        this.maxBombs = 2;
        this.buttonLifespan = 3000; // 3 seconds
        this.bombLifespan = 5000; // 5 seconds
        
        this.audioContext = null;
        this.initAudio();
        this.initElements();
        this.bindEvents();
        this.updateDisplay();
        this.startClock();
        this.drawBackground();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    playSound(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.value = volume;
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    initElements() {
        this.elements = {
            startBtn: document.getElementById('start-game'),
            resetBtn: document.getElementById('reset-game'),
            streakDisplay: document.getElementById('current-streak'),
            missStreakDisplay: document.getElementById('miss-streak'),
            timeDisplay: document.getElementById('time-left'),
            scoreDisplay: document.getElementById('score'),
            healthFill: document.getElementById('health-fill'),
            taskbarTime: document.getElementById('taskbar-time'),
            aboutDialog: document.getElementById('about-dialog'),
            closeAbout: document.getElementById('close-about'),
            aboutOk: document.getElementById('about-ok')
        };
    }
    
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startGame());
        this.elements.resetBtn.addEventListener('click', () => this.resetGame());
        this.elements.closeAbout.addEventListener('click', () => this.hideAbout());
        this.elements.aboutOk.addEventListener('click', () => this.hideAbout());
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    if (!this.isRunning) this.startGame();
                    break;
                case 'KeyR':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.resetGame();
                    }
                    break;
            }
        });
    }
    
    showAbout() {
        this.elements.aboutDialog.style.display = 'block';
    }
    
    hideAbout() {
        this.elements.aboutDialog.style.display = 'none';
    }
    
    startClock() {
        setInterval(() => {
            const now = new Date();
            this.elements.taskbarTime.textContent = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
        }, 1000);
    }
    
    startGame() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.elements.startBtn.disabled = true;
        this.lastTime = performance.now();
        this.startTime = Date.now();
        this.gameLoop();
        this.playSound(440, 0.2);
        document.body.classList.add('game-active');
        
        // Show game start notification
        if (windowManager) {
            windowManager.showNotification({
                title: '🎮 GM Chain Started!',
                message: '<strong>Game On!</strong><br>Click GM buttons, avoid bombs!<br>Good luck, champion! 🚀',
                type: 'success',
                duration: 4000
            });
        }
    }
    
    resetGame() {
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.streak = 0;
        this.missStreak = 0;
        this.totalMisses = 0;
        this.health = 100;
        this.timeLeft = 48 * 60 * 60 * 1000;
        this.startTime = Date.now();
        this.gmButtons = [];
        this.bombs = [];
        this.particles = [];
        this.spawnRate = 2000;
        this.bombSpawnRate = 8000;
        this.lastSpawn = 0;
        this.lastBombSpawn = 0;
        
        this.elements.startBtn.disabled = false;
        this.updateDisplay();
        this.drawBackground();
        document.body.classList.remove('game-active');
        this.playSound(220, 0.3);
    }
    
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        // Check game over conditions
        if (this.totalMisses >= this.maxMisses || this.timeLeft <= 0) {
            this.gameOver();
            return;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // Update time left
        this.timeLeft = Math.max(0, this.timeLeft - deltaTime);
        
        // Progressive difficulty - increase spawn rates over time
        const difficultyFactor = Math.min(5, (Date.now() - this.startTime) / (60000 * 5)); // Max difficulty after 5 minutes
        this.spawnRate = Math.max(600, 2000 - (difficultyFactor * 200));
        this.bombSpawnRate = Math.max(4000, 8000 - (difficultyFactor * 600));
        
        // Spawn GM buttons
        this.lastSpawn += deltaTime;
        if (this.lastSpawn >= this.spawnRate && this.gmButtons.length < this.maxButtons) {
            this.spawnGMButton();
            this.lastSpawn = 0;
        }
        
        // Spawn bombs
        this.lastBombSpawn += deltaTime;
        if (this.lastBombSpawn >= this.bombSpawnRate && this.bombs.length < this.maxBombs) {
            this.spawnBomb();
            this.lastBombSpawn = 0;
        }
        
        // Update GM buttons
        for (let i = this.gmButtons.length - 1; i >= 0; i--) {
            const button = this.gmButtons[i];
            button.life -= deltaTime;
            button.scale = 1 + Math.sin(button.life / 200) * 0.1;
            
            if (button.life <= 0) {
                this.missGM(button);
                this.gmButtons.splice(i, 1);
            }
        }
        
        // Update bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.life -= deltaTime;
            bomb.scale = 1 + Math.sin(bomb.life / 150) * 0.15;
            bomb.rotation += deltaTime / 100;
            
            if (bomb.life <= 0) {
                this.bombs.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx * deltaTime / 16;
            particle.y += particle.vy * deltaTime / 16;
            particle.life -= deltaTime;
            particle.alpha = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        this.updateDisplay();
    }
    
    spawnGMButton() {
        const button = {
            x: Math.random() * (this.canvas.width - 80) + 40,
            y: Math.random() * (this.canvas.height - 80) + 40,
            radius: 30,
            life: this.buttonLifespan,
            maxLife: this.buttonLifespan,
            scale: 1,
            color: this.getRandomColor(),
            id: Date.now() + Math.random(),
            type: 'gm'
        };
        
        this.gmButtons.push(button);
        this.playSound(660, 0.1, 'square', 0.05);
    }
    
    spawnBomb() {
        const bomb = {
            x: Math.random() * (this.canvas.width - 80) + 40,
            y: Math.random() * (this.canvas.height - 80) + 40,
            radius: 35,
            life: this.bombLifespan,
            maxLife: this.bombLifespan,
            scale: 1,
            rotation: 0,
            id: Date.now() + Math.random(),
            type: 'bomb'
        };
        
        this.bombs.push(bomb);
        this.playSound(200, 0.2, 'square', 0.03);
    }
    
    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    handleCanvasClick(e) {
        if (!this.isRunning || this.isPaused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check bomb clicks first (they cause immediate game over)
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            const distance = Math.sqrt((x - bomb.x) ** 2 + (y - bomb.y) ** 2);
            
            if (distance <= bomb.radius) {
                this.clickBomb(bomb, x, y);
                return;
            }
        }
        
        // Check GM button clicks
        for (let i = this.gmButtons.length - 1; i >= 0; i--) {
            const button = this.gmButtons[i];
            const distance = Math.sqrt((x - button.x) ** 2 + (y - button.y) ** 2);
            
            if (distance <= button.radius) {
                this.clickGM(button, x, y);
                this.gmButtons.splice(i, 1);
                return;
            }
        }
        
        // Empty space click - counts as miss
        this.missStreak++;
        this.totalMisses++;
        const scorePenalty = Math.min(200, 20 + (this.missStreak * 10));
        
        this.score = Math.max(0, this.score - scorePenalty);
        
        // Show miss warnings
        if (this.totalMisses === 7 && windowManager) {
            windowManager.showNotification({
                title: '⚠️ Critical Warning!',
                message: `<strong>Danger Zone!</strong><br>You have ${this.maxMisses - this.totalMisses} misses left!<br>Be more careful! 🎯`,
                type: 'warning',
                duration: 4000
            });
        } else if (this.totalMisses === 9 && windowManager) {
            windowManager.showNotification({
                title: '🚨 FINAL WARNING!',
                message: `<strong>Last chance!</strong><br>Only 1 miss remaining!<br>Next miss = Game Over! ☠️`,
                type: 'error',
                duration: 5000
            });
        } else if (this.missStreak === 3 && windowManager) {
            windowManager.showNotification({
                title: '😵 Miss Streak!',
                message: `<strong>Focus up!</strong><br>3 misses in a row!<br>Take your time and aim carefully! 🎯`,
                type: 'warning',
                duration: 3000
            });
        }
        
        this.createParticles(x, y, '#FF0000', `MISS -${scorePenalty}`);
        this.playSound(150 - (this.missStreak * 10), 0.2, 'sawtooth', 0.1);
        
        // Check if max misses reached
        if (this.totalMisses >= this.maxMisses) {
            this.gameOver();
        }
    }
    
    clickBomb(bomb, x, y) {
        // Immediate game over when bomb is clicked
        this.isRunning = false;
        
        // Show bomb explosion notification
        if (windowManager) {
            windowManager.showNotification({
                title: '💥 BOMB EXPLODED!',
                message: '<strong>Game Over!</strong><br>You clicked a bomb!<br>Better luck next time! 💀',
                type: 'error',
                duration: 6000,
                progress: false
            });
        }
        
        // Create explosion effect
        this.createExplosion(x, y);
        this.playSound(100, 0.5, 'sawtooth', 0.2);
        setTimeout(() => this.playSound(80, 0.7, 'sawtooth', 0.15), 200);
        
        // Remove the clicked bomb
        this.bombs = this.bombs.filter(b => b.id !== bomb.id);
        
        // Show game over after explosion animation
        setTimeout(() => this.gameOver('bomb'), 1000);
    }
    
    createExplosion(x, y) {
        // Create explosion particles
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const speed = Math.random() * 8 + 4;
            const distance = Math.random() * 50 + 20;
            
            this.particles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 2000,
                maxLife: 2000,
                alpha: 1,
                color: ['#FF0000', '#FF4400', '#FF8800', '#FFAA00'][Math.floor(Math.random() * 4)],
                size: Math.random() * 8 + 4,
                type: 'explosion'
            });
        }
        
        // Add explosion text
        this.particles.push({
            x: x,
            y: y - 30,
            vx: 0,
            vy: -3,
            life: 3000,
            maxLife: 3000,
            alpha: 1,
            color: '#FF0000',
            text: '💥 BOOM! GAME OVER 💥',
            fontSize: 20,
            type: 'text'
        });
    }
    
    clickGM(button, x, y) {
        // Reset miss streak on successful click
        this.missStreak = 0;
        
        // Calculate score bonuses
        const timeBonus = Math.floor((button.life / button.maxLife) * 50);
        const streakBonus = this.streak * 10;
        const totalPoints = 100 + timeBonus + streakBonus;
        
        this.score += totalPoints;
        this.streak++;
        
        // Show high score notifications
        if (this.score >= 10000 && this.score - totalPoints < 10000 && windowManager) {
            windowManager.showNotification({
                title: '🏆 HIGH SCORE!',
                message: `<strong>INCREDIBLE!</strong><br>You've reached 10,000 points!<br>You're a GM Chain legend! 👑`,
                type: 'success',
                duration: 6000,
                sound: true
            });
        } else if (this.score >= 5000 && this.score - totalPoints < 5000 && windowManager) {
            windowManager.showNotification({
                title: '🌟 Excellent Score!',
                message: `<strong>Fantastic!</strong><br>5,000 points achieved!<br>You're dominating! 💪`,
                type: 'success',
                duration: 4000
            });
        } else if (this.score >= 1000 && this.score - totalPoints < 1000 && windowManager) {
            windowManager.showNotification({
                title: '🎯 Nice Score!',
                message: `<strong>Well done!</strong><br>1,000 points reached!<br>Keep climbing! 📈`,
                type: 'info',
                duration: 3000
            });
        }
        
        // Show streak milestones
        if (this.streak > 0 && this.streak % 10 === 0 && windowManager) {
            windowManager.showNotification({
                title: '🔥 Streak Milestone!',
                message: `<strong>Amazing!</strong><br>You've reached a ${this.streak} GM streak!<br>Keep it up, champion! 🏆`,
                type: 'success',
                duration: 4000,
                sound: true
            });
        } else if (this.streak === 5 && windowManager) {
            windowManager.showNotification({
                title: '⚡ Getting Hot!',
                message: `<strong>Nice work!</strong><br>5 GM streak achieved!<br>You're on fire! 🔥`,
                type: 'info',
                duration: 3000
            });
        }
        
        // Health bonus for quick clicks
        if (button.life > button.maxLife * 0.7) {
            this.health = Math.min(100, this.health + 5);
        }
        
        // Create visual feedback
        this.createParticles(x, y, button.color, `+${totalPoints}`);
        this.createConfetti(x, y);
        
        // Play success sound with increasing pitch
        const pitch = 440 + (this.streak * 20);
        this.playSound(pitch, 0.15, 'triangle', 0.08);
        
        // Animate streak counter
        this.elements.streakDisplay.classList.add('streak-bonus');
        setTimeout(() => {
            this.elements.streakDisplay.classList.remove('streak-bonus');
        }, 600);
    }
    
    missGM(button) {
        this.missStreak++;
        this.totalMisses++;
        const scorePenalty = Math.min(300, 50 + (this.missStreak * 15));
        
        this.score = Math.max(0, this.score - scorePenalty);
        this.streak = Math.max(0, this.streak - Math.ceil(this.missStreak / 2));
        
        this.createParticles(button.x, button.y, '#FF4444', `EXPIRED -${scorePenalty}`);
        
        // Play miss sound with decreasing pitch
        const pitch = Math.max(100, 200 - (this.missStreak * 15));
        this.playSound(pitch, 0.4 + (this.missStreak * 0.1), 'sawtooth', 0.1);
        
        // Check if max misses reached
        if (this.totalMisses >= this.maxMisses) {
            this.gameOver();
        }
    }
    
    createParticles(x, y, color, text) {
        // Text particle
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: -2,
            life: 1500,
            maxLife: 1500,
            alpha: 1,
            color: color,
            text: text,
            fontSize: 16,
            type: 'text'
        });
        
        // Small explosion particles
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 800,
                maxLife: 800,
                alpha: 1,
                color: color,
                size: Math.random() * 4 + 2,
                type: 'circle'
            });
        }
    }
    
    createConfetti(x, y) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: Math.random() * -8 - 2,
                life: 2000,
                maxLife: 2000,
                alpha: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 6 + 3,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                type: 'confetti'
            });
        }
    }
    
    draw() {
        // Clear canvas with dark background
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid background
        this.drawGrid();
        
        // Draw game objects
        this.gmButtons.forEach(button => this.drawGMButton(button));
        this.bombs.forEach(bomb => this.drawBomb(bomb));
        this.particles.forEach(particle => this.drawParticle(particle));
        
        // Draw UI overlay
        this.drawUIOverlay();
    }
    
    drawBackground() {
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        
        if (!this.isRunning) {
            this.drawCenterLogo();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#003333';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawCenterLogo() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        // Draw EthereumOS diamond
        this.ctx.fillStyle = '#4a9eff';
        this.ctx.globalAlpha = 0.7;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -40);
        this.ctx.lineTo(30, -10);
        this.ctx.lineTo(0, 40);
        this.ctx.lineTo(-30, -10);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw GM text
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px "MS Sans Serif"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GM', 0, 0);
        
        // Instructions
        this.ctx.font = '12px "MS Sans Serif"';
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.fillText('Click START to begin your GM Chain!', 0, 80);
        this.ctx.fillText('Avoid bombs! 10 misses = Game Over!', 0, 100);
        
        this.ctx.restore();
    }
    
    drawGMButton(button) {
        this.ctx.save();
        this.ctx.translate(button.x, button.y);
        this.ctx.scale(button.scale, button.scale);
        
        // Button gradient
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, button.radius);
        gradient.addColorStop(0, button.color);
        gradient.addColorStop(1, this.darkenColor(button.color));
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, button.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Button border
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // GM text
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 14px "MS Sans Serif"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GM', 0, 0);
        
        // Life indicator
        const progress = button.life / button.maxLife;
        this.ctx.strokeStyle = progress > 0.3 ? '#00FF00' : '#FF0000';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, button.radius + 5, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress));
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawBomb(bomb) {
        this.ctx.save();
        this.ctx.translate(bomb.x, bomb.y);
        this.ctx.scale(bomb.scale, bomb.scale);
        this.ctx.rotate(bomb.rotation);
        
        // Bomb body
        this.ctx.fillStyle = '#333333';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Bomb highlight
        this.ctx.fillStyle = '#666666';
        this.ctx.beginPath();
        this.ctx.arc(-8, -8, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Fuse
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -bomb.radius);
        this.ctx.lineTo(15, -bomb.radius - 15);
        this.ctx.stroke();
        
        // Sparks
        const sparkTime = Date.now() / 100;
        for (let i = 0; i < 3; i++) {
            const sparkX = 15 + Math.sin(sparkTime + i) * 5;
            const sparkY = -bomb.radius - 15 + Math.cos(sparkTime + i) * 5;
            this.ctx.fillStyle = ['#FF0000', '#FF8800', '#FFFF00'][i];
            this.ctx.beginPath();
            this.ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Danger border
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, bomb.radius + 2, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Life indicator
        const progress = bomb.life / bomb.maxLife;
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, bomb.radius + 8, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress));
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawParticle(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.alpha;
        
        if (particle.type === 'text') {
            this.ctx.fillStyle = particle.color;
            this.ctx.font = `bold ${particle.fontSize}px "MS Sans Serif"`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(particle.text, particle.x, particle.y);
        } else if (particle.type === 'circle' || particle.type === 'explosion') {
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (particle.type === 'confetti') {
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate((particle.rotation += particle.rotationSpeed) * Math.PI / 180);
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        }
        
        this.ctx.restore();
    }
    
    drawUIOverlay() {
        if (!this.isRunning) return;
        
        // Game stats overlay
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '10px "MS Sans Serif"';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`GM Buttons: ${this.gmButtons.length}`, this.canvas.width - 10, 20);
        this.ctx.fillText(`Bombs: ${this.bombs.length}`, this.canvas.width - 10, 35);
        this.ctx.fillText(`Misses: ${this.totalMisses}/${this.maxMisses}`, this.canvas.width - 10, 50);
    }
    
    updateDisplay() {
        this.elements.streakDisplay.textContent = this.streak;
        this.elements.missStreakDisplay.textContent = this.missStreak;
        this.elements.scoreDisplay.textContent = this.score.toLocaleString();
        this.elements.healthFill.style.width = `${this.health}%`;
        
        // Miss streak visual feedback
        if (this.missStreak >= 3) {
            this.elements.missStreakDisplay.style.animation = 'gmButtonPulse 0.5s ease-in-out infinite';
            this.elements.missStreakDisplay.style.color = '#CC0000';
        } else if (this.missStreak >= 2) {
            this.elements.missStreakDisplay.style.color = '#FF3333';
            this.elements.missStreakDisplay.style.animation = 'none';
        } else {
            this.elements.missStreakDisplay.style.color = '#FF0000';
            this.elements.missStreakDisplay.style.animation = 'none';
        }
        
        // Format time display
        const hours = Math.floor(this.timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((this.timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((this.timeLeft % (1000 * 60)) / 1000);
        this.elements.timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    gameOver(reason = 'misses') {
        this.isRunning = false;
        document.body.classList.remove('game-active');
        
        // Play game over sound
        this.playSound(220, 0.1);
        setTimeout(() => this.playSound(196, 0.1), 150);
        setTimeout(() => this.playSound(174, 0.3), 300);
        
        // Calculate survival time
        const survivalTime = 48 * 60 * 60 * 1000 - this.timeLeft;
        const hours = Math.floor(survivalTime / (1000 * 60 * 60));
        const minutes = Math.floor((survivalTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((survivalTime % (1000 * 60)) / 1000);
        
        // Show game over dialog
        setTimeout(() => {
            document.getElementById('final-score').textContent = this.score.toLocaleString();
            document.getElementById('final-streak').textContent = this.streak;
            document.getElementById('time-survived').textContent = `${hours}h ${minutes}m ${seconds}s`;
            document.getElementById('total-misses').textContent = this.totalMisses;
            
            // Set appropriate title
            const title = reason === 'bomb' ? '💥 Exploded!' : '❌ Too Many Misses!';
            document.getElementById('game-over-title').textContent = title;
            
            document.getElementById('game-over-dialog').style.display = 'block';
        }, 500);
        
        this.elements.startBtn.disabled = false;
    }
    
    darkenColor(color) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🎮 GM Chain v2.0 loaded! Created by eCox for EthereumOS');
        console.log('💡 Press SPACE to start, Ctrl+R to reset');
        console.log('🎯 Rules: Click GM buttons, avoid bombs, 10 misses = Game Over');
    }, 100);
});
