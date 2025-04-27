// ai.js - Autonomous Bot Steering & Combat AI Controller

function updateBotAI(bot, player, otherBots, foodItems, arenaSize) {
    if (bot.isDead) return;

    let targetX = arenaSize / 2;
    let targetY = arenaSize / 2;
    
    // 1. Compile list of potential combat targets
    let targets = [];
    if (!player.isDead) {
        targets.push(player);
    }
    for (const other of otherBots) {
        if (other.id !== bot.id && !other.isDead) {
            targets.push(other);
        }
    }

    // 2. Resolve target coordinates based on threat/food proximity
    let closestTarget = null;
    let closestTargetDist = Infinity;
    
    for (const t of targets) {
        const dist = Math.hypot(t.x - bot.x, t.y - bot.y);
        if (dist < closestTargetDist) {
            closestTargetDist = dist;
            closestTarget = t;
        }
    }

    // Wall Avoidance (Highest priority)
    const wallMargin = 150;
    let nearWall = false;
    let wallAvoidX = 0;
    let wallAvoidY = 0;

    if (bot.x < wallMargin) {
        wallAvoidX = bot.x + wallMargin;
        nearWall = true;
    } else if (bot.x > arenaSize - wallMargin) {
        wallAvoidX = bot.x - wallMargin;
        nearWall = true;
    }
    if (bot.y < wallMargin) {
        wallAvoidY = bot.y + wallMargin;
        nearWall = true;
    } else if (bot.y > arenaSize - wallMargin) {
        wallAvoidY = bot.y - wallMargin;
        nearWall = true;
    }

    if (nearWall) {
        // Steer away from walls
        targetX = wallAvoidX === 0 ? bot.x : wallAvoidX;
        targetY = wallAvoidY === 0 ? bot.y : wallAvoidY;
    } 
    // Attack Decision State (Medium-high range)
    else if (closestTarget && closestTargetDist < 250) {
        // Target is close: initiate combat steering!
        if (bot.type === 'snake') {
            // Snake Combat Behavior: Circle & Sweep
            // To swing the tail into the target, the bot needs to cut in front of them
            // or circle them. So we steer slightly ahead or rotate around them.
            if (closestTargetDist < 120) {
                // If extremely close, trigger attack and perform a sharp circular turn to swing tail
                bot.triggerAttack();
                
                // Steer at 90 degrees offset to create a circular swing
                const angleToTarget = Math.atan2(closestTarget.y - bot.y, closestTarget.x - bot.x);
                targetX = bot.x + Math.cos(angleToTarget + Math.PI/2) * 100;
                targetY = bot.y + Math.sin(angleToTarget + Math.PI/2) * 100;
            } else {
                // Steer directly towards target head to cut them off
                targetX = closestTarget.x + Math.cos(closestTarget.angle) * 30;
                targetY = closestTarget.y + Math.sin(closestTarget.angle) * 30;
            }
        } else {
            // Scorpion Combat Behavior: Direct Stinger Strike
            // Aim claws directly at the target head, and trigger stinger jab
            targetX = closestTarget.x;
            targetY = closestTarget.y;

            if (closestTargetDist < 100) {
                bot.triggerAttack();
            }
        }
    } 
    // Feed State: Seek food (Default state)
    else if (foodItems.length > 0) {
        let closestFood = null;
        let closestFoodDist = Infinity;

        for (const f of foodItems) {
            const dist = Math.hypot(f.x - bot.x, f.y - bot.y);
            if (dist < closestFoodDist) {
                closestFoodDist = dist;
                closestFood = f;
            }
        }

        if (closestFood) {
            targetX = closestFood.x;
            targetY = closestFood.y;
        }
    }

    // Update bot movement
    bot.update(targetX, targetY, arenaSize);
}
