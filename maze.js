const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('level');
const gameOverDisplay = document.getElementById('gameOver');
const playAgainButton = document.getElementById('playAgain');
const gameDisplay = document.getElementById('gameDisplay');

let CELL_SIZE = 20;
let COLS, ROWS;
let maze = [];
let player = { x: 0, y: 0 };
let exit = { x: 0, y: 0 };
let level = 1;
let subLevel = 1;
let winsInLevel = 0;
const MAX_LEVEL = 24; // 12 levels to grow canvas, 12 levels to shrink field of vision
const WINS_PER_LEVEL = 5;
let fieldOfVision = 1200; // Starts at 1200x1200 when canvas reaches max size
let maskEnabled = true; // Toggle for field of view mask (only for testing)
let cameraOffset = { x: 0, y: 0 }; // Camera offset to follow the player

/**
 * Initialize the maze grid with walls on all sides.
 */
function initMaze() {
    maze = new Array(COLS);
    for (let i = 0; i < COLS; i++) {
        maze[i] = new Array(ROWS);
        for (let j = 0; j < ROWS; j++) {
            maze[i][j] = { top: true, right: true, bottom: true, left: true, visited: false };
        }
    }
}

/**
 * Recursively carve passages in the maze using Depth-First Search.
 * @param {number} x - Current cell's x-coordinate.
 * @param {number} y - Current cell's y-coordinate.
 */
function carvePassage(x, y) {
    maze[x][y].visited = true;

    const directions = [
        { dx: 1, dy: 0, wall: 'right', opposite: 'left' },
        { dx: -1, dy: 0, wall: 'left', opposite: 'right' },
        { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },
        { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' }
    ];

    directions.sort(() => Math.random() - 0.5);

    for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;

        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !maze[nx][ny].visited) {
            maze[x][y][dir.wall] = false;
            maze[nx][ny][dir.opposite] = false;
            carvePassage(nx, ny);
        }
    }
}

/**
 * Update the camera offset to center the player on the screen.
 * ORIGINAL FUNCTION
 */
// function updateCamera() {
//     const playerX = player.x * CELL_SIZE + CELL_SIZE / 2;
//     const playerY = player.y * CELL_SIZE + CELL_SIZE / 2;
//     cameraOffset.x = playerX - canvas.width / 2;
//     cameraOffset.y = playerY - canvas.height / 2;
// }


function updateCamera() {
    const gameDisplay = document.getElementById('gameDisplay'); // Get the gameDisplay div
    const gameDisplayWidth = gameDisplay.clientWidth; // Get the width of gameDisplay
    const gameDisplayHeight = gameDisplay.clientHeight; // Get the height of gameDisplay

    // Only update the camera if the canvas is larger than the gameDisplay
    if (canvas.width > gameDisplayWidth || canvas.height > gameDisplayHeight) {
        const playerX = player.x * CELL_SIZE + CELL_SIZE / 2;
        const playerY = player.y * CELL_SIZE + CELL_SIZE / 2;

        // Calculate the camera offset to center the player
        cameraOffset.x = playerX - canvas.width / 2;
        cameraOffset.y = playerY - canvas.height / 2;
    } else {
        // If the canvas is smaller than or equal to the gameDisplay, reset the camera offset
        cameraOffset.x = 0;
        cameraOffset.y = 0;
    }
}


/**
 * Draw the maze, player, and exit on the canvas.
 */
function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    // Update camera to follow the player
    updateCamera();

    // Calculate visible area based on field of vision (only for levels 13+)
    let halfVision = fieldOfVision / 2;
    if (level < 13) {
        halfVision = canvas.width; // Full visibility for levels 1-12
    }

    const startX = Math.max(0, player.x * CELL_SIZE - halfVision - cameraOffset.x);
    const startY = Math.max(0, player.y * CELL_SIZE - halfVision - cameraOffset.y);
    const endX = Math.min(canvas.width, player.x * CELL_SIZE + halfVision - cameraOffset.x);
    const endY = Math.min(canvas.height, player.y * CELL_SIZE + halfVision - cameraOffset.y);

    // Draw only the visible area with a 10px feather (only for levels 13+)
    if (level >= 13 && maskEnabled) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(startX, startY, endX - startX, endY - startY);
        ctx.clip();

        // Draw the maze
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                const cell = maze[x][y];
                const xPos = x * CELL_SIZE - cameraOffset.x;
                const yPos = y * CELL_SIZE - cameraOffset.y;

                if (cell.top) {
                    ctx.beginPath();
                    ctx.moveTo(xPos, yPos);
                    ctx.lineTo(xPos + CELL_SIZE, yPos);
                    ctx.stroke();
                }
                if (cell.right) {
                    ctx.beginPath();
                    ctx.moveTo(xPos + CELL_SIZE, yPos);
                    ctx.lineTo(xPos + CELL_SIZE, yPos + CELL_SIZE);
                    ctx.stroke();
                }
                if (cell.bottom) {
                    ctx.beginPath();
                    ctx.moveTo(xPos, yPos + CELL_SIZE);
                    ctx.lineTo(xPos + CELL_SIZE, yPos + CELL_SIZE);
                    ctx.stroke();
                }
                if (cell.left) {
                    ctx.beginPath();
                    ctx.moveTo(xPos, yPos);
                    ctx.lineTo(xPos, yPos + CELL_SIZE);
                    ctx.stroke();
                }
            }
        }

        // Draw player
        ctx.fillStyle = '#0f0';
        ctx.fillRect(
            player.x * CELL_SIZE - cameraOffset.x + 2,
            player.y * CELL_SIZE - cameraOffset.y + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );

        ctx.restore();

        // Add feather effect to the edges of the visible area
        const gradient = ctx.createRadialGradient(
            player.x * CELL_SIZE - cameraOffset.x + CELL_SIZE / 2,
            player.y * CELL_SIZE - cameraOffset.y + CELL_SIZE / 2,
            halfVision - 10, // Start gradient 10px inside the edge
            player.x * CELL_SIZE - cameraOffset.x + CELL_SIZE / 2,
            player.y * CELL_SIZE - cameraOffset.y + CELL_SIZE / 2,
            halfVision // End gradient at the edge
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Transparent at the center
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)'); // Opaque at the edge

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Draw the maze without clipping for levels 1-12 or when mask is disabled
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                const cell = maze[x][y];
                const xPos = x * CELL_SIZE - cameraOffset.x;
                const yPos = y * CELL_SIZE - cameraOffset.y;

                if (cell.top) {
                    ctx.beginPath();
                    ctx.moveTo(xPos, yPos);
                    ctx.lineTo(xPos + CELL_SIZE, yPos);
                    ctx.stroke();
                }
                if (cell.right) {
                    ctx.beginPath();
                    ctx.moveTo(xPos + CELL_SIZE, yPos);
                    ctx.lineTo(xPos + CELL_SIZE, yPos + CELL_SIZE);
                    ctx.stroke();
                }
                if (cell.bottom) {
                    ctx.beginPath();
                    ctx.moveTo(xPos, yPos + CELL_SIZE);
                    ctx.lineTo(xPos + CELL_SIZE, yPos + CELL_SIZE);
                    ctx.stroke();
                }
                if (cell.left) {
                    ctx.beginPath();
                    ctx.moveTo(xPos, yPos);
                    ctx.lineTo(xPos, yPos + CELL_SIZE);
                    ctx.stroke();
                }
            }
        }

        // Draw player
        ctx.fillStyle = '#0f0';
        ctx.fillRect(
            player.x * CELL_SIZE - cameraOffset.x + 2,
            player.y * CELL_SIZE - cameraOffset.y + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );
    }

    // Draw exit (always visible, on top of everything)
    ctx.fillStyle = (level === MAX_LEVEL && subLevel === WINS_PER_LEVEL) ? '#ff0' : '#f00'; // Yellow for final level
    ctx.fillRect(
        exit.x * CELL_SIZE - cameraOffset.x + 2,
        exit.y * CELL_SIZE - cameraOffset.y + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
    );
}

/**
 * Check if the player can move in the specified direction.
 * @param {number} x - Player's x-coordinate.
 * @param {number} y - Player's y-coordinate.
 * @param {string} dir - Direction to move ('up', 'down', 'left', 'right').
 * @returns {boolean} - True if the player can move, false otherwise.
 */
function canMove(x, y, dir) {
    const cell = maze[x][y];
    if (dir === 'up' && !cell.top) return true;
    if (dir === 'down' && !cell.bottom) return true;
    if (dir === 'left' && !cell.left) return true;
    if (dir === 'right' && !cell.right) return true;
    return false;
}

/**
 * Move the player in the specified direction.
 * @param {string} dir - Direction to move ('up', 'down', 'left', 'right').
 */
function movePlayer(dir) {
    let nx = player.x;
    let ny = player.y;

    if (dir === 'up' && canMove(player.x, player.y, 'up')) ny--;
    if (dir === 'down' && canMove(player.x, player.y, 'down')) ny++;
    if (dir === 'left' && canMove(player.x, player.y, 'left')) nx--;
    if (dir === 'right' && canMove(player.x, player.y, 'right')) nx++;

    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
        player.x = nx;
        player.y = ny;
    }

    if (player.x === exit.x && player.y === exit.y) {
        winsInLevel++;
        if (winsInLevel >= WINS_PER_LEVEL) {
            if (level < 12) {
                level++;
                canvas.width = 100 * level;
                canvas.height = 100 * level;
            } else if (level < MAX_LEVEL) {
                level++;
                fieldOfVision = Math.max(100, 1200 - (level - 12) * 100); // Shrink field of vision
            }
            winsInLevel = 0;
            subLevel++;
            if (subLevel > WINS_PER_LEVEL) {
                subLevel = 1;
            }
        }
        levelDisplay.textContent = `Level: ${level}-${subLevel}`;

        if (level === MAX_LEVEL && subLevel === WINS_PER_LEVEL) {
            gameOverDisplay.style.display = 'block';
            playAgainButton.style.display = 'block';
            canvas.style.display = 'none';
            return;
        }
        generateMaze();
    }
    drawMaze(); // Redraw the maze after moving the player
}

/**
 * Generate a new maze and reset player and exit positions.
 */
function generateMaze() {
    COLS = Math.floor(canvas.width / CELL_SIZE);
    ROWS = Math.floor(canvas.height / CELL_SIZE);
    initMaze();
    carvePassage(0, 0);

    // Set player position to the center of the maze
    player.x = Math.floor(COLS / 2);
    player.y = Math.floor(ROWS / 2);

    // Randomly place the exit at one of the edges of the maze
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    switch (edge) {
        case 0: // Top edge
            exit.x = Math.floor(Math.random() * COLS);
            exit.y = 0;
            break;
        case 1: // Right edge
            exit.x = COLS - 1;
            exit.y = Math.floor(Math.random() * ROWS);
            break;
        case 2: // Bottom edge
            exit.x = Math.floor(Math.random() * COLS);
            exit.y = ROWS - 1;
            break;
        case 3: // Left edge
            exit.x = 0;
            exit.y = Math.floor(Math.random() * ROWS);
            break;
    }

    drawMaze();
}

/**
 * Restart the game from Level 1-1.
 */
function restartGame() {
    level = 1;
    subLevel = 1;
    winsInLevel = 0;
    fieldOfVision = 1200;
    canvas.width = 100;
    canvas.height = 100;
    canvas.style.display = 'block';
    gameOverDisplay.style.display = 'none';
    playAgainButton.style.display = 'none';
    levelDisplay.textContent = `Level: ${level}-${subLevel}`;
    generateMaze();
}

/**
 * Jump to a specific level and sub-level.
 */
function jumpToLevel() {
    const levelInput = document.getElementById('levelInput');
    const subLevelInput = document.getElementById('subLevelInput');
    const newLevel = parseInt(levelInput.value, 10);
    const newSubLevel = parseInt(subLevelInput.value, 10);

    if (newLevel >= 1 && newLevel <= MAX_LEVEL && newSubLevel >= 1 && newSubLevel <= WINS_PER_LEVEL) {
        level = newLevel;
        subLevel = newSubLevel;
        winsInLevel = 0;
        if (level <= 12) {
            canvas.width = 100 * level;
            canvas.height = 100 * level;
            fieldOfVision = 1200; // Reset field of vision
        } else {
            canvas.width = 1200;
            canvas.height = 1200;
            fieldOfVision = Math.max(100, 1200 - (level - 12) * 100); // Adjust field of vision
        }
        levelDisplay.textContent = `Level: ${level}-${subLevel}`;
        gameOverDisplay.style.display = 'none';
        playAgainButton.style.display = 'none';
        canvas.style.display = 'block';
        generateMaze();
    } else {
        alert("Please enter valid level (1-24) and sub-level (1-5).");
    }
}

/**
 * Toggle the field of view mask on and off (for testing).
 */
function toggleMask() {
    maskEnabled = !maskEnabled;
    drawMaze();
}

// Swipe controls for mobile
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) movePlayer('right');
        else movePlayer('left');
    } else {
        if (dy > 0) movePlayer('down');
        else movePlayer('up');
    }
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') movePlayer('up');
    if (e.key === 'ArrowDown') movePlayer('down');
    if (e.key === 'ArrowLeft') movePlayer('left');
    if (e.key === 'ArrowRight') movePlayer('right');
});

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    CELL_SIZE = Math.min(canvas.width / COLS, canvas.height / ROWS);
    drawMaze();
});

// Initialize the game
generateMaze();