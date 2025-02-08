const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('level');
const gameOverDisplay = document.getElementById('gameOver');
const playAgainButton = document.getElementById('playAgain');

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

function initMaze() {
    maze = new Array(COLS);
    for (let i = 0; i < COLS; i++) {
        maze[i] = new Array(ROWS);
        for (let j = 0; j < ROWS; j++) {
            maze[i][j] = { top: true, right: true, bottom: true, left: true, visited: false };
        }
    }
}

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

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    // Calculate visible area based on field of vision (only for levels 13+)
    let halfVision = fieldOfVision - 100;
    if (level < 13) {
        halfVision = canvas.width; // Full visibility for levels 1-12
    }

    const startX = Math.max(0, player.x * CELL_SIZE - halfVision);
    const startY = Math.max(0, player.y * CELL_SIZE - halfVision);
    const endX = Math.min(canvas.width, player.x * CELL_SIZE + halfVision);
    const endY = Math.min(canvas.height, player.y * CELL_SIZE + halfVision);

    // Draw only the visible area with a 10px feather (only for levels 13+)
    if (level >= 13) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(startX, startY, endX - startX, endY - startY);
        ctx.clip();

        // Add feather effect to the edges of the visible area
        const featherSize = 10;
        const gradient = ctx.createRadialGradient(
            player.x * CELL_SIZE + CELL_SIZE / 2,
            player.y * CELL_SIZE + CELL_SIZE / 2,
            halfVision + featherSize,
            player.x * CELL_SIZE + CELL_SIZE / 2,
            player.y * CELL_SIZE + CELL_SIZE / 2,
            halfVision
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw maze
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            const cell = maze[x][y];
            const xPos = x * CELL_SIZE;
            const yPos = y * CELL_SIZE;

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
    ctx.fillRect(player.x * CELL_SIZE + 2, player.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    // Draw exit (always visible)
    ctx.fillStyle = (level === MAX_LEVEL && subLevel === WINS_PER_LEVEL) ? '#ff0' : '#f00'; // Yellow for final level
    ctx.fillRect(exit.x * CELL_SIZE + 2, exit.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    if (level >= 13) {
        ctx.restore();
    }
}

function canMove(x, y, dir) {
    const cell = maze[x][y];
    if (dir === 'up' && !cell.top) return true;
    if (dir === 'down' && !cell.bottom) return true;
    if (dir === 'left' && !cell.left) return true;
    if (dir === 'right' && !cell.right) return true;
    return false;
}

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
}

function generateMaze() {
    COLS = Math.floor(canvas.width / CELL_SIZE);
    ROWS = Math.floor(canvas.height / CELL_SIZE);
    initMaze();
    carvePassage(0, 0);
    player.x = 0;
    player.y = 0;
    exit.x = COLS - 1;
    exit.y = ROWS - 1;
    drawMaze();
}

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
    drawMaze();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') movePlayer('up');
    if (e.key === 'ArrowDown') movePlayer('down');
    if (e.key === 'ArrowLeft') movePlayer('left');
    if (e.key === 'ArrowRight') movePlayer('right');
    drawMaze();
});

generateMaze();
