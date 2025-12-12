var config = {
    width: 40,
    height: 70,
    mineCount: 200,
    blankClick: true,
    debug: false,
}

// config mine by page size
const auto_config = (minePercent = 0.2) => {
    config.height = (Math.floor(window.innerWidth / 20) - 10)
    config.width = (Math.floor(window.innerHeight / 20) - 5)
    const totalCells = config.width * config.height;
    config.mineCount = minePercent * totalCells;
}
auto_config();

var mineArr = [];
var gameStateArr = [];
var isFirstClick = true;

const DOMS = {
    field: document.querySelector("#field"),
    btn_reset: document.querySelector("#btn_reset"),
}

function randomR(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    // The maximum is exclusive and the minimum is inclusive
    return Math.floor(Math.random() * (max - min) + min);
}

function isSafeZone(x, y, excludeX, excludeY, config) {
    // Check the exact clicked cell first
    if (x === excludeX && y === excludeY) return true;

    // Check the 3x3 area around the clicked cell
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const neighborX = excludeX + dx;
            const neighborY = excludeY + dy;

            // Ensure the neighbor coordinates are within the board bounds
            const withinBoundsX = neighborX >= 0 && neighborX < config.width;
            const withinBoundsY = neighborY >= 0 && neighborY < config.height;

            if (withinBoundsX && withinBoundsY) {
                // If the potential mine location matches a safe neighbor location, it's unsafe to place a mine here.
                if (x === neighborX && y === neighborY) {
                    return true;
                }
            }
        }
    }
    return false; // The spot is safe to place a mine
};

const addConfetti = (dom) => {
    const box = dom.getBoundingClientRect();
    const color = (() => {
        const colorArr = ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
        const index = randomR(0, colorArr.length - 1);
        return colorArr[index]
    })()

    confetti({
        ticks: 50,
        startVelocity: randomR(0, 4),
        angle: randomR(55, 125),
        spread: randomR(50, 70),
        scalar: 1.5,
        drift: randomR(-0.4, 0.4),
        origin: { x: box.x / window.innerWidth, y: box.y / window.innerHeight },
        particleCount: 1,
        colors: [color]
    });
}

// onZero = T, not place mine around it
const randomMine = (excludeX = null, excludeY = null, onZero = false) => {
    // make arr - moved inside randomMine so it resets cleanly
    mineArr = []; // Clear array before filling
    for (let x = 0; x < config.width; x++) {
        const row = [];
        for (let y = 0; y < config.height; y++) row.push("o");
        mineArr.push(row);
    }
    gameStateArr = [...mineArr];

    // add mine
    for (let i = 0; i < config.mineCount; i++) {
        let minePlaced = false;
        while (!minePlaced) {
            const x = randomR(0, config.width - 1); // Ensure randomR is inclusive/exclusive correctly
            const y = randomR(0, config.height - 1);

            // Check if the spot is already occupied
            if (mineArr[x][y] === "x") {
                continue; // Spot already has a mine, try again
            }

            // Check if we are enforcing the safe zone rule and if this spot is in it
            if (onZero && isSafeZone(x, y, excludeX, excludeY, config)) {
                continue; // Spot is in the safe zone, try again
            }

            // If we reach here, the spot is valid. Place the mine and break the while loop.
            mineArr[x][y] = "x";
            minePlaced = true;
        }
    }
}

const genField = () => {
    DOMS.field.innerHTML = "";
    for (let i = 0; i < config.width; i++) {
        var rowText = '<div class="row">'
        for (let j = 0; j < config.height; j++) rowText += `<div class="cell" data-index="${i}-${j}"></div>`
        rowText += "</div>"
        DOMS.field.innerHTML += rowText;
    }
}

const cellNumber = (x, y) => {
    var totalMine = 0;

    // Iterate over all 8 potential neighbors
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            // Skip the center cell itself
            if (dx === 0 && dy === 0) continue;

            const neighborX = x + dx;
            const neighborY = y + dy;

            // Check boundaries: ensure neighbor coordinates are within the grid
            const withinBoundsX = neighborX >= 0 && neighborX < config.width;
            const withinBoundsY = neighborY >= 0 && neighborY < config.height;

            if (withinBoundsX && withinBoundsY) {
                // Access the array correctly using [][], not [, ]
                if (mineArr[neighborX][neighborY] === "x") {
                    totalMine++;
                }
            }
        }
    }

    return totalMine;
}

const revealEmptyCells = (x, y) => {
    if (x < 0 || x >= config.width || y < 0 || y >= config.height) return;

    const cell = [...[...DOMS.field.querySelectorAll(".row")][x].querySelectorAll(".cell")][y];
    if (cell.className.includes("revealed")) return;

    cell.classList.add("revealed");
    const mineCount = cellNumber(x, y);
    if (mineCount > 0) {
        cell.textContent = mineCount;
        cell.classList.add("num-" + mineCount);
        addConfetti(cell);
    }

    if (mineCount === 0) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                // Call the function recursively on the neighbors
                document.body.classList.add("bomb");
                setTimeout(() => {
                    document.body.classList.remove("bomb");
                }, 2000);
                revealEmptyCells(x + dx, y + dy);
            }
        }
    }
};

const cellFunction = () => {
    document.querySelector("#field").querySelectorAll(".cell").forEach(cell => {

        cell.addEventListener("click", () => {
            if ([...cell.classList].includes("flag")) return;

            const textindex = cell.dataset.index;
            const [x, y] = textindex.split("-").map(el => Number(el));

            if (isFirstClick) {
                isFirstClick = false;
                randomMine(x, y, config.blankClick); // Pass the first click coordinates to avoid placing a mine there
                timer("start");

                // Debug visualization (optional)
                if (config.debug) {
                    document.querySelector("#field").querySelectorAll(".cell").forEach(debugCell => {
                        const debugIndex = debugCell.dataset.index;
                        const [dx, dy] = debugIndex.split("-").map(el => Number(el));
                        const content = mineArr[dx][dy] === 'x' ? '💣' : cellNumber(dx, dy) || '';
                        debugCell.textContent = content;
                        twemoji.parse(document.body);
                    })
                }
            }

            const isMine = mineArr[x][y] === "x"
            if (!isMine) {
                const minesAround = cellNumber(x, y);
                cell.textContent = minesAround > 0 ? minesAround : '';
                revealEmptyCells(x, y);
                cell.classList.add('revealed');
                cell.classList.add("num-" + minesAround);
                gameStateArr[x, y] = "x";
            }
            else {
                console.log("game over");
                cell.textContent = '💥';
                cell.classList.add("bomb");
                timer("stop")
                document.body.classList.add("bomb");
                twemoji.parse(document.body);
            }
        })

        cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();

            if ([...cell.classList].includes("flag")) {
                cell.classList.remove("flag");
                cell.textContent = "";
            } else {
                cell.classList.add("flag");
                cell.textContent = "🚩";
            }

            twemoji.parse(document.body);
            updateFlag();
        })
    })
}

const timer = (() => {
    let sec_counter = 0;
    let timer_interval_id = null;
    const time_count_element = document.querySelector("#time_count");

    const parseTime = (sec) => {
        const minutes = Math.floor(sec / 60);
        const seconds = sec % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };


    return (fn) => {
        if (!time_count_element) {
            console.error("Element with ID 'time_count' not found.");
            return;
        }

        if (fn === "start") {
            if (timer_interval_id) return;

            timer_interval_id = setInterval(() => {
                sec_counter++;
                time_count_element.textContent = parseTime(sec_counter);
            }, 1000);

        } else if (fn === "stop") {
            clearInterval(timer_interval_id);
            timer_interval_id = null;
        } else if (fn === "reset") {
            clearInterval(timer_interval_id);
            timer_interval_id = null;
            sec_counter = 0;
            time_count_element.textContent = parseTime(sec_counter);
        }
    };
})();

const updateFlag = () => {
    const bomb_count = document.querySelector("#bomb_count");
    const flag_count = document.querySelectorAll(".cell.flag");
    bomb_count.textContent = config.mineCount - flag_count.length;
}

// Initialize the game field on load
genField();
cellFunction();
updateFlag();
twemoji.parse(document.body);

DOMS.btn_reset.addEventListener("click", () => {
    timer("reset");
    isFirstClick = true;
    genField();
    cellFunction();
    updateFlag();
})
