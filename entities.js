// entities.js - Snake and Scorpion Segment Kinematics & Combat Physics

class Particle {
    constructor(x, y, color, speed, size, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.life--;
    }

    draw(ctx, camera) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Gladiator {
    constructor(id, name, type, isBot, x, y) {
        this.id = id;
        this.name = name;
        this.type = type; // 'snake' or 'scorpion'
        this.isBot = isBot;
        
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 3.5;
        this.turnSpeed = 0.08;
        
        this.score = 0;
        this.kills = 0;
        this.isDead = false;
        
        // Base Stats
        this.maxHealth = 100;
        this.health = 100;
        this.armor = this.type === 'scorpion' ? 0.35 : 0.15; // Damage reduction ratio
        
        // Attack Cooldown
        this.attackCooldown = 0; // 0 to 100
        this.attackDuration = 0;
        this.isAttacking = false;
        
        // Body Segment Setup
        this.segments = [];
        this.baseSegmentCount = this.type === 'snake' ? 18 : 8;
        this.segmentCount = this.baseSegmentCount;
        this.segmentSpacing = this.type === 'snake' ? 15 : 12;
        this.baseRadius = this.type === 'snake' ? 20 : 25;
        
        this.initSegments();
    }

    initSegments() {
        this.segments = [];
        for (let i = 0; i < this.segmentCount; i++) {
            // Radial scaling for snake body taper or scorpion tail structure
            let radius = this.baseRadius;
            if (this.type === 'snake') {
                // Taper down slightly at the tail
                radius = this.baseRadius * (1 - (i / this.segmentCount) * 0.4);
            } else {
                // Scorpion tail segments are smaller, sting tip is larger
                if (i === this.segmentCount - 1) radius = 18; // Stinger bulb
                else radius = 14 - (i * 0.5);
            }

            this.segments.push({
                x: this.x - Math.cos(this.angle) * i * this.segmentSpacing,
                y: this.y - Math.sin(this.angle) * i * this.segmentSpacing,
                radius: radius,
                vx: 0,
                vy: 0
            });
        }
    }

    grow(amount) {
        this.score += amount;
        
        // Calculate new segment targets
        const addedSegments = Math.floor(this.score / 250);
        const targetCount = this.baseSegmentCount + addedSegments;
        
        if (targetCount > this.segmentCount && this.type === 'snake') {
            const diff = targetCount - this.segmentCount;
            const last = this.segments[this.segments.length - 1];
            for (let i = 0; i < diff; i++) {
                this.segments.push({
                    x: last.x,
                    y: last.y,
                    radius: this.baseRadius * 0.6,
                    vx: 0,
                    vy: 0
                });
            }
            this.segmentCount = this.segments.length;
            this.maxHealth = 100 + (this.segmentCount - this.baseSegmentCount) * 15;
            this.health = Math.min(this.maxHealth, this.health + 20); // Heal slightly on grow
        }
    }

    triggerAttack() {
        if (this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.attackCooldown = 100;
        this.attackDuration = this.type === 'snake' ? 25 : 12; // Duration in ticks
    }

    takeDamage(amount, attackerName, particles) {
        const actualDamage = amount * (1 - this.armor);
        this.health = Math.max(0, this.health - actualDamage);
        
        // Spawn damage blood particles
        const color = this.type === 'scorpion' ? '#ff0055' : '#00ff66';
        for (let i = 0; i < 8; i++) {
            particles.push(new Particle(this.x, this.y, color, 4, 3 + Math.random() * 3, 20 + Math.random() * 15));
        }

        if (this.health <= 0) {
            this.isDead = true;
        }
        return this.isDead;
    }

    update(targetX, targetY, arenaSize) {
        if (this.isDead) return;

        // 1. Move Head towards target coordinate
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // Handle smooth steering angle interpolation
        let angleDiff = targetAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        this.angle += Math.max(-this.turnSpeed, Math.min(this.turnSpeed, angleDiff));
        
        // Set attack velocity boost
        let currentSpeed = this.speed;
        if (this.isAttacking && this.type === 'snake') {
            currentSpeed = this.speed * 1.5; // Acceleration swing
        }
        
        this.x += Math.cos(this.angle) * currentSpeed;
        this.y += Math.sin(this.angle) * currentSpeed;

        // Constrain head to arena bounds
        const boundaryPadding = 50;
        if (this.x < boundaryPadding) this.x = boundaryPadding;
        if (this.x > arenaSize - boundaryPadding) this.x = arenaSize - boundaryPadding;
        if (this.y < boundaryPadding) this.y = boundaryPadding;
        if (this.y > arenaSize - boundaryPadding) this.y = arenaSize - boundaryPadding;

        this.segments[0].x = this.x;
        this.segments[0].y = this.y;

        // 2. Cooldown mechanics
        if (this.attackCooldown > 0) {
            this.attackCooldown = Math.max(0, this.attackCooldown - 1.5);
        }
        if (this.attackDuration > 0) {
            this.attackDuration--;
            if (this.attackDuration === 0) {
                this.isAttacking = false;
            }
        }

        // 3. Update Body Segment Verlet/Kinematic follower chain
        if (this.type === 'snake') {
            this.updateSnakeBody();
        } else {
            this.updateScorpionBody();
        }
    }

    updateSnakeBody() {
        const whipForce = this.isAttacking ? 22 : 0;
        
        for (let i = 1; i < this.segmentCount; i++) {
            const leader = this.segments[i - 1];
            const current = this.segments[i];

            // Verlet follower constraint distance logic
            const dx = current.x - leader.x;
            const dy = current.y - leader.y;
            const dist = Math.hypot(dx, dy);

            // Target vector direction
            let angle = Math.atan2(dy, dx);

            // Apply centrifugal whipping offset force to tail end segments if attacking
            if (whipForce > 0 && i > this.segmentCount - 8) {
                // Swing tail perpendicular to the general direction of travel
                const swingDirection = Math.sin(this.angle - angle) > 0 ? 1 : -1;
                angle += (whipForce * swingDirection * (i / this.segmentCount) * 0.035);
            }

            // Move current segment to exact spacing constraint
            current.x = leader.x + Math.cos(angle) * this.segmentSpacing;
            current.y = leader.y + Math.sin(angle) * this.segmentSpacing;
        }
    }

    updateScorpionBody() {
        // Scorpion has a compact body cluster (segments 0, 1, 2) and an arched tail (segments 3 to 7)
        // Segment 0: Main claw joint / face
        // Segment 1: Shell core
        // Segment 2: Rear legs joint
        
        // Core cluster spacing
        for (let i = 1; i <= 2; i++) {
            const leader = this.segments[i - 1];
            const current = this.segments[i];
            const dx = current.x - leader.x;
            const dy = current.y - leader.y;
            const angle = Math.atan2(dy, dx);
            current.x = leader.x + Math.cos(angle) * 14;
            current.y = leader.y + Math.sin(angle) * 14;
        }

        // Tail segments (segments 3 to 7)
        const isStinging = this.isAttacking;
        const stingProgress = isStinging ? (this.attackDuration / 12) : 0; // 0 to 1 back and forth
        
        // Stinger strike stretch extension multiplier
        let stretch = 1.0;
        if (isStinging) {
            // Rapid jab out and retract sine wave
            stretch = 1.0 + Math.sin(Math.PI * (1 - stingProgress)) * 2.5;
        }

        for (let i = 3; i < this.segmentCount; i++) {
            const leader = this.segments[i - 1];
            const current = this.segments[i];
            
            const dx = current.x - leader.x;
            const dy = current.y - leader.y;
            let angle = Math.atan2(dy, dx);

            // Tail follows but arches upwards/backwards.
            // When stinging, stinger whips forward over the head
            if (isStinging) {
                // Pull stinger vector directly toward the head's heading direction
                let diff = this.angle - angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                angle += diff * 0.25;
            } else {
                // Natural back arch trail
                let diff = (this.angle + Math.PI) - angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                angle += diff * 0.15;
            }

            const spacing = this.segmentSpacing * (i === this.segmentCount - 1 ? stretch : 1.0);
            current.x = leader.x + Math.cos(angle) * spacing;
            current.y = leader.y + Math.sin(angle) * spacing;
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;

        ctx.save();

        const nodeColor = this.type === 'scorpion' ? 'rgba(255, 0, 85, 0.9)' : 'rgba(0, 255, 102, 0.9)';
        const glowColor = this.type === 'scorpion' ? 'rgba(255, 0, 85, 0.4)' : 'rgba(0, 255, 102, 0.4)';

        // 1. Draw Body Segments (Tail first, so head renders on top)
        ctx.shadowBlur = this.isAttacking ? 20 : 8;
        ctx.shadowColor = nodeColor;

        if (this.type === 'snake') {
            // Draw connecting spine line
            ctx.beginPath();
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = this.baseRadius * 0.8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = this.segmentCount - 1; i >= 0; i--) {
                const s = this.segments[i];
                if (i === this.segmentCount - 1) ctx.moveTo(s.x - camera.x, s.y - camera.y);
                else ctx.lineTo(s.x - camera.x, s.y - camera.y);
            }
            ctx.stroke();

            // Draw individual segmented scales
            for (let i = this.segmentCount - 1; i > 0; i--) {
                const s = this.segments[i];
                ctx.fillStyle = i % 2 === 0 ? nodeColor : '#1e1e24';
                ctx.beginPath();
                ctx.arc(s.x - camera.x, s.y - camera.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        } else {
            // Draw Scorpion tail links
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.3)';
            ctx.lineWidth = 6;
            for (let i = 2; i < this.segmentCount; i++) {
                const s = this.segments[i];
                if (i === 2) ctx.moveTo(s.x - camera.x, s.y - camera.y);
                else ctx.lineTo(s.x - camera.x, s.y - camera.y);
            }
            ctx.stroke();

            for (let i = this.segmentCount - 1; i >= 2; i--) {
                const s = this.segments[i];
                ctx.fillStyle = i === this.segmentCount - 1 ? '#00f3ff' : '#ff0055'; // Neon blue stinger tip
                ctx.beginPath();
                // Draw stinger bulbous tail or needles
                if (i === this.segmentCount - 1) {
                    // Sharp stinger triangular wedge shape
                    const angle = Math.atan2(s.y - this.segments[i-1].y, s.x - this.segments[i-1].x);
                    ctx.translate(s.x - camera.x, s.y - camera.y);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(18, 0);
                    ctx.lineTo(-8, -10);
                    ctx.lineTo(-8, 10);
                    ctx.closePath();
                    ctx.fill();
                    ctx.rotate(-angle);
                    ctx.translate(-(s.x - camera.x), -(s.y - camera.y));
                } else {
                    ctx.arc(s.x - camera.x, s.y - camera.y, s.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw Scorpion legs and claws
            this.drawScorpionClawsAndLegs(ctx, camera);
        }

        // 2. Draw Head segment (on top of spine)
        const head = this.segments[0];
        ctx.fillStyle = this.type === 'scorpion' ? '#ff0055' : '#00ff66';
        ctx.beginPath();
        ctx.arc(head.x - camera.x, head.y - camera.y, head.radius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw Eyes (facing direction of travel)
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0; // disable shadow for eyes
        
        const eyeOffsetRadius = head.radius * 0.45;
        const eyeAngleOffset = 0.5; // angle spread
        
        const eyeL_X = head.x - camera.x + Math.cos(this.angle - eyeAngleOffset) * eyeOffsetRadius;
        const eyeL_Y = head.y - camera.y + Math.sin(this.angle - eyeAngleOffset) * eyeOffsetRadius;
        const eyeR_X = head.x - camera.x + Math.cos(this.angle + eyeAngleOffset) * eyeOffsetRadius;
        const eyeR_Y = head.y - camera.y + Math.sin(this.angle + eyeAngleOffset) * eyeOffsetRadius;

        ctx.beginPath();
        ctx.arc(eyeL_X, eyeL_Y, 4, 0, Math.PI * 2);
        ctx.arc(eyeR_X, eyeR_Y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(eyeL_X + Math.cos(this.angle)*1, eyeL_Y + Math.sin(this.angle)*1, 2, 0, Math.PI * 2);
        ctx.arc(eyeR_X + Math.cos(this.angle)*1, eyeR_Y + Math.sin(this.angle)*1, 2, 0, Math.PI * 2);
        ctx.fill();

        // 4. Draw Gladiator Tag Name Overlay
        ctx.font = 'bold 12px Rajdhani';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, head.x - camera.x, head.y - camera.y - head.radius - 8);

        ctx.restore();
    }

    drawScorpionClawsAndLegs(ctx, camera) {
        const head = this.segments[0];
        const body = this.segments[1];
        
        ctx.save();
        ctx.fillStyle = '#ff0055';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 4;
        
        // Leg offsets
        const legSides = [-1, 1]; // Left and right
        const bodyAngle = Math.atan2(body.y - head.y, body.x - head.x);

        for (const side of legSides) {
            // Draw 3 legs on each side of the body
            for (let i = 0; i < 3; i++) {
                const legJointX = body.x - camera.x + Math.cos(bodyAngle + (Math.PI/2)*side - (i*0.2)*side) * 12;
                const legJointY = body.y - camera.y + Math.sin(bodyAngle + (Math.PI/2)*side - (i*0.2)*side) * 12;
                
                const kneeX = legJointX + Math.cos(bodyAngle + (Math.PI/2)*side + (0.3)*side) * 22;
                const kneeY = legJointY + Math.sin(bodyAngle + (Math.PI/2)*side + (0.3)*side) * 22;

                const footX = kneeX + Math.cos(bodyAngle + (Math.PI/2)*side - (0.5)*side) * 14;
                const footY = kneeY + Math.sin(bodyAngle + (Math.PI/2)*side - (0.5)*side) * 14;

                ctx.beginPath();
                ctx.moveTo(legJointX, legJointY);
                ctx.lineTo(kneeX, kneeY);
                ctx.lineTo(footX, footY);
                ctx.stroke();
            }

            // Draw Pincers/Claws extending forward from head
            const clawJointX = head.x - camera.x + Math.cos(this.angle + (0.8)*side) * 18;
            const clawJointY = head.y - camera.y + Math.sin(this.angle + (0.8)*side) * 18;

            const clawKneeX = clawJointX + Math.cos(this.angle + (0.3)*side) * 20;
            const clawKneeY = clawJointY + Math.sin(this.angle + (0.3)*side) * 20;

            const clawTipX = clawKneeX + Math.cos(this.angle + (1.2)*side) * 15;
            const clawTipY = clawKneeY + Math.sin(this.angle + (1.2)*side) * 15;

            ctx.beginPath();
            ctx.moveTo(clawJointX, clawJointY);
            ctx.lineTo(clawKneeX, clawKneeY);
            ctx.lineTo(clawTipX, clawTipY);
            ctx.stroke();

            // Pincer bulb
            ctx.beginPath();
            ctx.arc(clawKneeX, clawKneeY, 7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
