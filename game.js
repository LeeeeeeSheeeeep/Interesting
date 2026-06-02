// game.js - Core Arena Loops, Grid Renderers, Combat Hit Resolution & HUD Syncs

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const ARENA_SIZE = 3000;
let player = null;
let bots = [];
let food = [];
let particles = [];
let camera = { x: 0, y: 0 };
let isGameRunning = false;
let mouseX = 0;
let mouseY = 0;

// Setup layout resize listeners
window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// Class selection listeners
const classCards = document.querySelectorAll('.class-card');
let selectedClass = 'snake';

classCards.forEach(card => {
    card.addEventListener('click', () => {
        classCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedClass = card.dataset.class;
    });
});

// Track Mouse Movement
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Track Spacebar/Click Attack Triggers
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isGameRunning && player) {
        e.preventDefault();
        player.triggerAttack();
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (isGameRunning && player) {
        player.triggerAttack();
    }
});

// Initialize and start the game
function startGame() {
    const nameInput = document.getElementById('player-name');
    const playerName = nameInput.value.trim() || 'Gladiator';
    
    // Spawn player in center
    player = new Gladiator('player', playerName, selectedClass, false, ARENA_SIZE / 2, ARENA_SIZE / 2);
    
    // Reset lists
    bots = [];
    food = [];
    particles = [];
    
    // Spawn initial bots
    const botNames = ['ApexPredator', 'PythonWhip', 'ScorpioMax', 'BlackWidow', 'BoaConstrictor', 'VenomStrike', 'TailBasher'];
    const classes = ['snake', 'scorpion'];
    for (let i = 0; i < botNames.length; i++) {
        const type = classes[Math.floor(Math.random() * classes.length)];
        const rx = Math.random() * (ARENA_SIZE - 200) + 100;
        const ry = Math.random() * (ARENA_SIZE - 200) + 100;
        bots.push(new Gladiator(`bot-${i}`, botNames[i], type, true, rx, ry));
    }

    // Spawn initial food items
    spawnFood(180);

    // Swap menus
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-over').classList.add('hidden');
    
    isGameRunning = true;
    
    // Initial camera placement
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    requestAnimationFrame(gameLoop);
}

function spawnFood(count) {
    const colors = ['#00f3ff', '#ff0055', '#00ff66', '#ffb700', '#ae00ff'];
    for (let i = 0; i < count; i++) {
        food.push({
            x: Math.random() * (ARENA_SIZE - 60) + 30,
            y: Math.random() * (ARENA_SIZE - 60) + 30,
            radius: 4 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            scoreValue: 40 + Math.floor(Math.random() * 60)
        });
    }
}

// Core Game Loop
function gameLoop() {
    if (!isGameRunning) return;

    updatePhysics();
    drawScene();

    requestAnimationFrame(gameLoop);
}

function updatePhysics() {
    // 1. Convert screen mouse coords to virtual world coords to steer player
    const worldMouseX = mouseX + camera.x;
    const worldMouseY = mouseY + camera.y;
    player.update(worldMouseX, worldMouseY, ARENA_SIZE);

    // Garbage Collection: Remove dead bots from the array to prevent memory leaks
    bots = bots.filter(b => !b.isDead);

    // Respawn Mechanic: Dynamically maintain arena population
    if (bots.length < 7) {
        const botNames = ['ApexPredator', 'PythonWhip', 'ScorpioMax', 'BlackWidow', 'BoaConstrictor', 'VenomStrike', 'TailBasher'];
        const classes = ['snake', 'scorpion'];
        const type = classes[Math.floor(Math.random() * classes.length)];
        
        // Spawn strategically near boundaries
        let rx = Math.random() > 0.5 ? Math.random() * 300 + 100 : ARENA_SIZE - (Math.random() * 300 + 100);
        let ry = Math.random() > 0.5 ? Math.random() * 300 + 100 : ARENA_SIZE - (Math.random() * 300 + 100);
        
        bots.push(new Gladiator(`bot-${Date.now()}-${Math.floor(Math.random()*1000)}`, botNames[Math.floor(Math.random() * botNames.length)], type, true, rx, ry));
    }

    // 2. Update Bots AI steering
    for (const bot of bots) {
        updateBotAI(bot, player, bots, food, ARENA_SIZE);
    }

    // 3. Resolve Collisions: Gladiator eating food
    const allGladiators = [player, ...bots];
    for (const g of allGladiators) {
        if (g.isDead) continue;

        const head = g.segments[0];
        for (let i = food.length - 1; i >= 0; i--) {
            const f = food[i];
            const dist = Math.hypot(head.x - f.x, head.y - f.y);
            if (dist < head.radius + f.radius) {
                // Restore health and grow
                g.health = Math.min(g.maxHealth, g.health + 8);
                g.grow(f.scoreValue);

                // Spawn eat particles
                for (let p = 0; p < 3; p++) {
                    particles.push(new Particle(f.x, f.y, f.color, 2, 2, 10));
                }

                // Respawn food item
                food.splice(i, 1);
                spawnFood(1);
            }
        }
    }

    // 4. Resolve Combat Hits: Tail swing vs Opponent heads
    for (const attacker of allGladiators) {
        if (attacker.isDead || !attacker.isAttacking) continue;

        // Establish the active weapon segments
        let weaponSegments = [];
        if (attacker.type === 'snake') {
            // Whipping tail: the last 5 segments of the snake
            const startIdx = Math.max(3, attacker.segments.length - 5);
            weaponSegments = attacker.segments.slice(startIdx);
        } else {
            // Scorpion: the stinger tip needle (the final segment)
            weaponSegments = [attacker.segments[attacker.segments.length - 1]];
        }

        // Check if any weapon segment collides with an opponent's head
        for (const victim of allGladiators) {
            if (victim.isDead || victim.id === attacker.id) continue;

            const victimHead = victim.segments[0];
            for (const ws of weaponSegments) {
                const dist = Math.hypot(ws.x - victimHead.x, ws.y - victimHead.y);
                const hitRadius = ws.radius + victimHead.radius + 5; // generous hit box margin
                
                if (dist < hitRadius) {
                    // Struck! Execute damage math
                    let dmg = attacker.type === 'scorpion' ? 38 : 22;
                    // Scale damage with snake length
                    if (attacker.type === 'snake') {
                        dmg += (attacker.segmentCount - attacker.baseSegmentCount) * 1.5;
                    }

                    const isDead = victim.takeDamage(dmg, attacker.name, particles);
                    
                    // Stop weapon animation on strike for scorpion
                    if (attacker.type === 'scorpion') {
                        attacker.isAttacking = false;
                        attacker.attackDuration = 0;
                    }

                    if (isDead) {
                        attacker.kills++;
                        attacker.grow(400); // Massive grow boost for kills

                        // Turn victim body into clusters of glowing food
                        victim.segments.forEach(s => {
                            food.push({
                                x: s.x + (Math.random() * 20 - 10),
                                y: s.y + (Math.random() * 20 - 10),
                                radius: 8,
                                color: attacker.type === 'scorpion' ? '#ff0055' : '#00ff66',
                                scoreValue: 120
                            });
                        });

                        // Check if player died
                        if (victim.id === 'player') {
                            endGame("Struck down by " + attacker.name);
                        }
                    }
                }
            }
        }
    }

    // 5. Update floating particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // 6. Camera smooth interpolation centering on player head
    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.08;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.08;

    // Keep camera within virtual boundary margins
    camera.x = Math.max(0, Math.min(ARENA_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(ARENA_SIZE - canvas.height, camera.y));

    // 7. Synchronize UI panels and HUDs
    updateHUD();
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    drawGrid();

    // Draw food items
    for (const f of food) {
        ctx.fillStyle = f.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = f.color;
        ctx.beginPath();
        ctx.arc(f.x - camera.x, f.y - camera.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0; // Reset shadow

    // Draw active particles
    for (const p of particles) {
        p.draw(ctx, camera);
    }

    // Draw all gladiators (Bots + Player)
    for (const bot of bots) {
        bot.draw(ctx, camera);
    }
    player.draw(ctx, camera);

    // Draw arena boundaries
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 10;
    ctx.strokeRect(-camera.x, -camera.y, ARENA_SIZE, ARENA_SIZE);
}

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    
    // Calculate viewport grid boundaries to optimize drawing off-screen
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const endX = startX + canvas.width + gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    const endY = startY + canvas.height + gridSize;

    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
    ctx.restore();
}

// Update DOM elements on HUD
function updateHUD() {
    if (!player) return;

    document.getElementById('hud-score').textContent = player.score;
    document.getElementById('hud-kills').textContent = player.kills;
    
    // Health bar calculations
    const pct = (player.health / player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = `${pct}%`;
    document.getElementById('health-text').textContent = `${Math.round(player.health)} / ${player.maxHealth}`;

    // Cooldown bar calculations
    const attackPct = 100 - player.attackCooldown;
    document.getElementById('attack-fill').style.width = `${attackPct}%`;

    // Leaderboards sync
    const leaderboard = [player, ...bots].sort((a, b) => b.score - a.score);
    const listEl = document.getElementById('leaderboard-list');
    listEl.innerHTML = '';

    leaderboard.slice(0, 5).forEach((g, idx) => {
        const li = document.createElement('li');
        if (g.id === 'player') li.className = 'self';
        li.innerHTML = `<span class="rank-name">${idx + 1}. ${g.name}</span> <span class="rank-score">${g.score}</span>`;
        listEl.appendChild(li);
    });
}

function endGame(reason) {
    isGameRunning = false;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');
    
    document.getElementById('game-over-reason').textContent = reason;
    document.getElementById('go-name').textContent = player.name;
    document.getElementById('go-score').textContent = player.score;
    document.getElementById('go-kills').textContent = player.kills;
}

function restartToMenu() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('start-menu').classList.remove('hidden');
}
