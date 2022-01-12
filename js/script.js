const canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");

class Tile {
    constructor(state, generationUpdate) {
        this.state = state;
        // Id of last generation that changed the state of the tile
        this.generationUpdate = generationUpdate;
    }
}

// Tiles are identified as x:y in the dictionnary
function getTileKey(x, y) {
    const tileKey = x + ':' + y;
    return tileKey;
}

let drawing = false;

// Pixel per zoom
const zoomStep = 5;
// Minimum / Maximum zoom level
const minTileWidth = 10;
const maxTileWidth = 100;

let tileWidth = 50;
let offsetX = (canvas.width - (Math.floor(canvas.width / tileWidth) * tileWidth)) / 2;
let offsetY = (canvas.height - (Math.floor(canvas.height / tileWidth) * tileWidth)) / 2;
// In grid there is 3 types of tile :
//      Alive tile
//          A normal alive tile
//      Dead tile
//          A normal dead tile
//      Empty tile
//          Isn't stored, doesn't exist but is dead
// Every tiles of the grid are dead
// If a tile becomes alive it's object is created and stored in the grid
// Once it died it's objetc state becomes dead but the tile isn't removed from the grid
//      Until the generation hasn't ended. Ths is due to the generation system. We need to know
//      The old state of a tile to update the other tiles (only during 1 generaton)
const grid = [];
let paused = false;
let gridX = 0;
let gridY = 0;

// Position of the neighbors of (x, y) tile
// Relative to (x, y) tile
const neighborsRelativePositions = [
    [-1, -1],  // TOP LEFT
    [0, -1],           // TOP
    [1, -1],   // TOP RIGHT
    [-1, 0],           // LEFT
    [1, 0],            // RIGHT
    [-1, 1],   // BOTTOM LEFT
    [0, 1],            // BOTTOM
    [1, 1]     // BOTTOM RIGHT
];

function countElements(arr, targetElm) {
    /* Return the number of times targetElm appears in the array arr */
    let n = 0;
    for (let elm of arr) {
        if (elm == targetElm) n++;
    }
    return n;
}

function getNeighborsStates(generationId, x, y) {
    /* Return an array of all the states of all the tiles surrounding a tile */
    let neighborsStates = [];
    // Get every surrounding tiles coords without much space
    for (let relativePosition of neighborsRelativePositions) {
        const relativeX = relativePosition[0];
        const relativeY = relativePosition[1];
        const neighborX = x + relativeX;
        const neighborY = y + relativeY;
        const key = getTileKey(neighborX, neighborY);
        const tile = grid[key];
        if (tile != undefined) {
            if (tile.generationUpdate != generationId) {
                neighborsStates.push(tile.state)
            } else {
                neighborsStates.push(Number(!tile.state))
            }
        } else {
            neighborsStates.push(0)
        }
    }
    return neighborsStates;
}

function updateTile(generationId, updateDepth, x, y) {
    /* Recursive function
     * Take one tile cahnge it's state depending on it's neighbors
     * Update it's neighbors
     */
    // Base case, don't propagate update more thant 1 time
    if (updateDepth > 1) return false;
    const key = getTileKey(x, y);
    const tile = grid[key];
    const neighborsStates = getNeighborsStates(generationId, x, y);
    const numberAliveNeighbors = countElements(neighborsStates, 1);
    // Get old state of the tile
    let tileState = -1;
    if (tile != undefined) {
        // don't update a tile more than 2 times in one generation
        // Wouldn't do anything bad but it's for efficiency
        if (tile.generationUpdate == generationId) return false;
        tileState = tile.state;
    } else {
        // Non stored tiles are dead
        tileState = 0;
    }
    // Logic of the game of life get new tile state (state for next generation)
    let nextTile = tile;
    if ((tileState == 1 && numberAliveNeighbors >= 2 && numberAliveNeighbors <= 3) || (tileState == 0 && numberAliveNeighbors == 3)) {
        // Tile alive
        // Don't update the tile unless the tile state changed
        if (tileState == 0) {
            nextTile = new Tile(1, generationId);
        }
    } else {
        // Tile dead
        // Create dead cell representation
        // Only if cell was alive before
        if (tileState == 1) {
            nextTile = new Tile(0, generationId);
        }
    }
    // Display new tile
    if (nextTile != undefined) {
        grid[key] = nextTile;
        displayTile(x, y)
    }
    // Update neighbors
    for (let relativePosition of neighborsRelativePositions) {
        const relativeX = relativePosition[0];
        const relativeY = relativePosition[1];
        const neighborX = x + relativeX;
        const neighborY = y + relativeY;
        const key = getTileKey(neighborX, neighborY);
        const tile = grid[key];
        // Alive tiles must be updated in the update() function otherwise
        // Tile that must be updated (that are not represented in grid) will not be updated
        // Due to the recursion loop. If the tile is alive don't update it.
        if (tile != undefined && tile.state == 1) {
            continue;
        }
        updateTile(generationId, updateDepth + 1, neighborX, neighborY)
    }
}

function clearCanvas() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function displayTile(tileX, tileY) {
    const tileKey = getTileKey(tileX, tileY);
    const tile = grid[tileKey];
    if (tile.state == 1) {
        ctx.fillStyle = "black";
    }else {
        ctx.fillStyle = "white";
    }
    ctx.fillRect((tileX - gridX) * tileWidth + offsetX, (tileY - gridY) * tileWidth + offsetY, tileWidth - 2, tileWidth - 2)
}

function displayTiles() {
    for (let tileKey of Object.keys(grid)) {
        const tileX = Number(tileKey.split(':')[0]);
        const tileY = Number(tileKey.split(':')[1]);
        displayTile(tileX, tileY)
    }
}

function displayGrid() {
    // lines
    for (let i = 0; i < canvas.width / tileWidth + 1; i++) {
        const x = i * tileWidth - 1 + offsetX;
        const y = canvas.height;
        ctx.fillStyle = "black";
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, y)
        ctx.stroke()
    }
    // cols
    for (let j = 0; j < canvas.height / tileWidth + 1; j++) {
        const x = canvas.width;
        const y = j * tileWidth - 1 + offsetY;
        ctx.fillStyle = "black";
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(x, y)
        ctx.stroke()
    }
}

let generationId = 0;
function update() {
    if (!paused) {
        clearCanvas()
        displayGrid()
        for (let tileKey of Object.keys(grid)) {
            const tileX = Number(tileKey.split(':')[0]);
            const tileY = Number(tileKey.split(':')[1]);
            const key = getTileKey(tileX, tileY);
            const tile = grid[key];
            if (tile.state == 1) {
                updateTile(generationId, 0, tileX, tileY)
            } else {
                // Delete dead cells representation if it's generation has passed
                // Saves memory
                if (generationId - tile.generationUpdate > 1) {
                    delete grid[key];
                }
            }
        }
        generationId++;
    }
}
setInterval(update, 100)

window.addEventListener("keydown", (e) => {
    switch (e.code) {
        case "Space":
            paused = paused ? false : true;
            break;
        case "ArrowUp":
            gridY -= 1;
            clearCanvas()
            displayGrid()
            displayTiles()
            break;
        case "ArrowLeft":
            gridX -= 1;
            clearCanvas()
            displayGrid()
            displayTiles()
            break;
        case "ArrowDown":
            gridY += 1;
            clearCanvas()
            displayGrid()
            displayTiles()
            break;
        case "ArrowRight":
            gridX += 1;
            clearCanvas()
            displayGrid()
            displayTiles()
            break;
    }
})

function changeTileClicked(event) {
    const clickX = event.clientX - offsetX;
    const clickY = event.clientY - offsetY;
    const tileX = Math.floor(clickX / tileWidth) + gridX;
    const tileY = Math.floor(clickY / tileWidth) + gridY;
    const key = getTileKey(tileX, tileY);
    const tile = grid[key];
    let newTile = undefined;
    // generation of the new tile must not be equal to the current generation
    // Otherwise the tile state will not count corretly in the current generation
    if (tile != undefined) {
        const newState = Number(!tile.state);
        newTile = new Tile(newState, generationId - 1);
    } else {
        newTile = new Tile(1, generationId - 1);
    }
    grid[key] = newTile;
    displayTile(tileX, tileY);
}

canvas.addEventListener("mousedown", (e) => {
    drawing = true;
})

canvas.addEventListener("mousemove", (e) => {
    if (drawing) {
        const clickX = event.clientX - offsetX;
        const clickY = event.clientY - offsetY;
        const tileX = Math.floor(clickX / tileWidth) + gridX;
        const tileY = Math.floor(clickY / tileWidth) + gridY;
        const key = getTileKey(tileX, tileY);
        const tile = grid[key];
        // Change tile only if it is dead
        if (tile == undefined || tile.state != 1) {
            changeTileClicked(e)
        }
    }
})

canvas.addEventListener("mouseup", (e) => {
    changeTileClicked(e)
    drawing = false;
})

function zoomIn() {
    tileWidth = tileWidth < maxTileWidth ? tileWidth + zoomStep : tileWidth;
}

function zoomOut() {
    tileWidth = tileWidth > minTileWidth ? tileWidth - zoomStep : tileWidth;
}

window.addEventListener("wheel", (e) => {
    clearCanvas()

    const mouseX = e.x;
    const mouseY = e.y;
    const tileX = Math.floor(mouseX / tileWidth) + gridX;
    const tileY = Math.floor(mouseY / tileWidth) + gridY;

    const wheelDirection = e.wheelDelta;
    if (wheelDirection < 0) {
        zoomOut()
    } else {
        zoomIn()
    }

    // Zoom on / out on the targeted tile
    const newTileX = Math.floor(mouseX / tileWidth) + gridX;
    const newTileY = Math.floor(mouseY / tileWidth) + gridY;
    const gridOffsetX = newTileX - tileX;
    const gridOffsetY = newTileY - tileY;

    gridX -= gridOffsetX;
    gridY -= gridOffsetY;

    // Update offsets depending on new tileWidth
    offsetX = (canvas.width - (Math.floor(canvas.width / tileWidth) * tileWidth)) / 2;
    offsetY = (canvas.height - (Math.floor(canvas.height / tileWidth) * tileWidth)) / 2;

    displayTiles()
    displayGrid()
})
