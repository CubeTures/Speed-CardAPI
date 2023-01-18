let rightCurrent = 0, leftCurrent = 0, cardsPerHand = 20;
let deckID, p1Lock, p2Lock, spareText, p1Timeout, p2Timeout, spareTimeout;
let p1Info, p2Info;
let gameStart, completeStartup, allowDuplicates = false;
let spareHand, p1Hand, p2Hand, leftHand, rightHand;
let order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K'];

document.addEventListener('DOMContentLoaded', () => {
    let gamemode = document.getElementById('gamemode');
    gamemode.addEventListener('click', function() 
    { 
        if(!gameStart)
        {
            let gamemode = document.getElementById('gamemode');
            gamemode.innerHTML = gamemode.innerHTML == "Original" ? "Duplicates" : "Original";
            allowDuplicates = !allowDuplicates;
        }
    });
})

document.addEventListener('keydown', (event) => {
    var code = event.code;

    RemoveHighlight('p1', leftCurrent);
    RemoveHighlight('p2', rightCurrent);

    ProcessCommand(code);
    AdjustHandIndex();

    if(completeStartup) {
        HighlightCard('p1', leftCurrent);
        HighlightCard('p2', rightCurrent);
    }  
    else {
        RemoveHighlight('p1', leftCurrent);
        RemoveHighlight('p2', rightCurrent);
    }    
}, false);

window.addEventListener("keydown", function(e) {
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, false);

function ProcessCommand(code) {
    if(!p1Lock) {
        if(completeStartup && code == "KeyA") {
            leftCurrent--;
        }
        else if(completeStartup && code == "KeyD") {
            leftCurrent++;
        }
        else if(code == "KeyW") {
            tryPlay(p1Hand, p1Hand[leftCurrent]);
        }
    }
    if(!p2Lock) {
        if(completeStartup && code == "ArrowLeft") {
            rightCurrent--;
        }
        else if(completeStartup && code =="ArrowRight") {
            rightCurrent++;
        }
        else if(code == "ArrowUp") {
            tryPlay(p2Hand, p2Hand[rightCurrent]);
        }
    }

    if(gameStart) { 
        if(completeStartup) { drawPiles(); }
        while(trySpare()) {
            if(spareTimeout != null) { clearTimeout(spareTimeout); }
            spareText.style.visibility = "visible";
            spareTimeout = setTimeout(function () {
                spareText.style.visibility = "hidden";
            }, 2000);
            setImage('left', leftHand[leftHand.length - 1]['image']);
            setImage('right', rightHand[rightHand.length - 1]['image']);
        } 
    } 

    if(!gameStart) {
        if(code == "Space") {
            document.getElementById('loading').style.visibility = "visible";
            gameStart = true;
            let gamemode = document.getElementById('gamemode');
            gamemode.classList.add('disabled');
            completeStartup = false;
            newGame();
        }
        else if(code == "KeyT") {

        }
    }  
    
}
function AdjustHandIndex() {
    if(p1Hand == null || p2Hand == null) { return; }
    let p1Count = Math.min(4, p1Hand.length - 1);
    let p2Count = Math.min(4, p2Hand.length - 1);

    if(leftCurrent > p1Count) {
        leftCurrent = 0;
    }
    else if(leftCurrent < 0) {
        leftCurrent = p1Count;
    }

    if(rightCurrent > p2Count) {
        rightCurrent = 0;
    }
    else if(rightCurrent < 0) {
        rightCurrent = p2Count;
    }
}
function HighlightCard(player, handValue) {
    if(!gameStart) { RemoveHighlight(player, handValue); }
    let card = document.getElementById(player + "-" + handValue);
    card.style = "border: 10px solid red";
}
function RemoveHighlight(player, handValue) {
    let card = document.getElementById(player + "-" + handValue);
    if(card == null) { return; }
    card.style.removeProperty("border");
}


async function newGame() {
    let data = await command('https://www.deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
    deckID = data['deck_id'];
    await createPiles(data);    

    drawPiles();

    HighlightCard('p1', leftCurrent);
    HighlightCard('p2', rightCurrent);
}

function tryPlay(playerHand, card) {
    let li = order.indexOf(leftHand[leftHand.length - 1]['code'].substring(0, 1));
    let ri = order.indexOf(rightHand[rightHand.length - 1]['code'].substring(0, 1));
    let ci = order.indexOf(card['code'].substring(0, 1));
    //console.log("Left: " + li + ", Right: " + ri + ", Given: " + ci);

    if(withinRange(li, ci)) {
        leftHand.push(card);
        playerHand.splice(playerHand.indexOf(card), 1);
    }
    else if(withinRange(ri, ci)) {
        rightHand.push(card);
        playerHand.splice(playerHand.indexOf(card), 1);
    }
    else {
        penalty(playerHand);
    }

    if(p1Hand.length == 0 || p2Hand.length == 0) {
        alert('The player on the ' + (p1Hand.length == 0 ? 'left' : 'right') + ' wins!');
        clearTimeout(p1Timeout);
        clearTimeout(p2Timeout);
        p1Lock = true;
        p2Lock = true;
        gameStart = false;
        let gamemode = document.getElementById('gamemode');
        gamemode.classList.remove('disabled');
        completeStartup = false;
        setAllBack();
    }
}

function penalty(playerHand) {
    if(playerHand == p1Hand) {
        if(p1Timeout != null) { clearTimeout(p1Timeout); }
        clearTimeout(p1Timeout);
        p1Lock = true;
        setPlayerInfo();
        p1Timeout = setTimeout(function () {
            p1Lock = false;
            setPlayerInfo();
        }, 1000);
    }
    else if(playerHand == p2Hand) {
        if(p2Timeout != null) { clearTimeout(p2Timeout); }
        p2Lock = true;
        setPlayerInfo();
        p2Timeout = setTimeout(function () {
            p2Lock = false;
            setPlayerInfo();
        }, 1000);
    }
}

function trySpare() {
    let li = order.indexOf(leftHand[leftHand.length - 1]['code'].substring(0, 1));
    let ri = order.indexOf(rightHand[rightHand.length - 1]['code'].substring(0, 1));

    let leftInHand = Math.min(5, p1Hand.length);
    let rightInHand = Math.min(5, p2Hand.length);

    for(let x = 0; x < leftInHand; x++) {
        let ci = order.indexOf(p1Hand[x]['code'].substring(0, 1));
        if(withinRange(li, ci) || withinRange(ri, ci)) {
            return false;
        }
    }
    for(let x = 0; x < rightInHand; x++) {
        let ci = order.indexOf(p2Hand[x]['code'].substring(0, 1));
        if(withinRange(li, ci) || withinRange(ri, ci)) {
            return false;
        }
    }

    if(spare.length > 0) {
        leftHand.push(spare[0]);
        rightHand.push(spare[1]);
        spare.splice(0, 2);
    }
    else {
        alert('There are no more spare cards left.\nThe game is a draw.');
        clearTimeout(p1Timeout);
        clearTimeout(p2Timeout);
        p1Lock = true;
        p2Lock = true;
        gameStart = false;
        let gamemode = document.getElementById('gamemode');
        gamemode.classList.remove('disabled');
    }

    return true;
}

function withinRange(otherIndex, cardIndex) {
    let duplicate = allowDuplicates && otherIndex - cardIndex == 0;
    return Math.abs(otherIndex - cardIndex) == 1 || Math.abs(otherIndex - cardIndex) == 12 || duplicate;
}

async function createPiles(data) {
    let temp = await command('https://www.deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
    temp = await command('https://www.deckofcardsapi.com/api/deck/' + temp['deck_id'] + '/draw/?count=52');
    spare = temp['cards'];

    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/draw/?count=1');
    await createPileWithCards('left', data);
    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/draw/?count=1');
    await createPileWithCards('right', data);
    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/draw/?count=' + cardsPerHand);
    await createPileWithCards('p1', data);
    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/draw/?count=' + cardsPerHand);
    await createPileWithCards('p2', data);

    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/pile/' + 'p1' + '/list/');
    p1Hand = data['piles']['p1']['cards'];
    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/pile/' + 'p2' + '/list/');
    p2Hand = data['piles']['p2']['cards'];
    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/pile/' + 'left' + '/list/');
    leftHand = data['piles']['left']['cards'];
    data = await command('https://www.deckofcardsapi.com/api/deck/' + deckID + '/pile/' + 'right' + '/list/');
    rightHand = data['piles']['right']['cards'];

    p1Lock = false;
    p2Lock = false;
    p1Info = document.getElementById('p1Info');
    p2Info = document.getElementById('p2Info');
    spareText = document.getElementById('spare');
    spareText.style.visibility = "hidden";

    document.getElementById('loading').style.visibility = "hidden";
    completeStartup = true;
}

function drawPlayerHand(playerName, hand) {
    let inHand = Math.min(5, hand.length);
    for(let x = 0; x < inHand; x++) {
        setImage(playerName + '-' + x, hand[x]['image']);
    }
    for(let x = inHand; x < 5; x++) {
        setImage(playerName + '-' + x, null);
    }
}

function setAllBack() {
    for(let x = 0; x < 5; x++) {
        let image = document.getElementById('p1-' + x);
        image.style.visibility = "visible";
        image.src = "https://deckofcardsapi.com/static/img/back.png";

        image = document.getElementById('p2-' + x);
        image.style.visibility = "visible";
        image.src = "https://deckofcardsapi.com/static/img/back.png";
    }
    document.getElementById('left').src = "https://deckofcardsapi.com/static/img/back.png";
    document.getElementById('right').src = "https://deckofcardsapi.com/static/img/back.png";
    RemoveHighlight('p1', leftCurrent);
    RemoveHighlight('p2', rightCurrent);
    console.log("success");
}

function drawPiles() {
    setImage('left', leftHand[leftHand.length - 1]['image']);
    setImage('right', rightHand[rightHand.length - 1]['image']);
    drawPlayerHand('p1', p1Hand);
    drawPlayerHand('p2', p2Hand);
    setPlayerInfo();
}
function setPlayerInfo() {
    if(p1Lock) {
        p1Info.innerHTML = "&nbsp;&nbsp;Left is on Cooldown&nbsp;&nbsp;";
        p1Info.style = "background-color: red";
    }
    else {
        p1Info.innerHTML = "&nbsp;&nbsp;" + p1Hand.length + " " + (p1Hand.length == 1 ? 'Card' : 'Cards') + " Remaining&nbsp;&nbsp;";
        p1Info.style = "background-color: none";
    }
    if(p2Lock) {
        p2Info.innerHTML = "&nbsp;&nbsp;Right is on Cooldown&nbsp;&nbsp;";
        p2Info.style = "background-color: red";
    }   
    else {
        p2Info.innerHTML = "&nbsp;&nbsp;" + p2Hand.length + " " + (p2Hand.length == 1 ? 'Card' : 'Cards') + " Remaining&nbsp;&nbsp;";
        p2Info.style = "background-color: none";
    }
}

async function createPileWithCards(pileName, data) {
    names = "";
    data['cards'].forEach(card => { names += card['code'] + ',' });
    names = names.substring(0, names.length - 1);

    await fetch('https://www.deckofcardsapi.com/api/deck/' + deckID + '/pile/' + pileName + '/add/?cards=' + names);
}

function setImage(id, img) {
    let image = document.getElementById(id);
    if(img == null) {
        image.style.visibility = "hidden";
    }
    else {
        image.src = img;
    }
}

async function command(command) {
    let response = await fetch(command);
    let data = await response.json();
    return data;
}
