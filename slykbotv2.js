import { WebSocket } from 'ws';

let socket;
let gameId;
let mark; // X or O
let serverUrl = 'ws://localhost:8080';
let botName = "SlykBotV2";

let cells;

let winPatterns = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]].map((winPattern) => {
	let sum = winPattern.reduce((sum, cur, idx) => {
		if (idx === 1) sum = Math.pow(2, sum);
		return sum + Math.pow(2, cur);
	});
	return sum;
});

function gameOver(msg) {
	setStatus(msg);
}

function setStatus(status) {
	console.log('STATUS: ' + status);
}

function setTournamentStatus(status) {
	console.log('TOURNAMENT: ' + status);
}

function joinTournament() {
	setTournamentStatus('Connecting to ' + serverUrl);
	
	socket = new WebSocket(serverUrl);
	
	socket.on('open', () => {
		setTournamentStatus('Connected to ' + serverUrl);
		setTournamentStatus('Waiting for tournament...');
		
		startGame(); // Reset game board
	});

	socket.on('message', (msg) => {
		setStatus('RECEIVED: ' + msg);
		handleMessage(JSON.parse(msg));
	});

	socket.onerror = (err) => {
		setTournamentStatus('Error: Unable to Connect to ' + serverUrl);
	};

	socket.onclose = () => {
		setTournamentStatus('Disconnected from ' + serverUrl);
	};
}

function makeYourMove(cellIndex) {
	let mySum = 0, theirSum = 0;

	// Calculate the players' sums
	for (var i = 0; i < cells.length; i++) {
		if (cells[i] === mark) {
			mySum += Math.pow(2, i);
		} else if (cells[i] !== null) {
			theirSum += Math.pow(2, i);
		}
	}

	for (let i = 0; i < cells.length; i++) {
		if (cells[i] !== null) continue;

		for (let x = 0; x < winPatterns.length; x++) {
			let goal = winPatterns[x];
			if (mySum & i & goal === goal) {
				sendMove(i);
				setStatus('Waiting for turn...');
			} else if (theirSum & i & goal === goal) {
				sendMove(i);
				setStatus('Waiting for turn...');				
			}
		}
	}

	// fall back to pick the next available cell
	for (let i = 0; i < cells.length; i++) {
		if (cells[i] === null) {
			sendMove(i);
			setStatus('Waiting for turn...');
			return;
		}
	}
}

function sendMove(cellIndex) {
	let message = {
		type: 'tic-tac-toe:move',
		id: gameId,
		cellIndex: cellIndex,
	};

	setStatus('Sending move: ', message);
	socket.send(JSON.stringify(message));
}

function handleMessage(msg) {
	switch (msg.type) {
		case 'hello':
			let response = JSON.stringify({ type: 'hello', clientType: 'player', name: botName });
			setStatus('SEND: ' + response)
			socket.send(response);
			break;

		case 'illegal':
			setStatus('Illegal move: ' + msg.reason);
			break;

		case 'tournament-started':
			setTournamentStatus('Tournament started!');
			setStatus('Waiting for game to start...');
			break;
		
		case 'tournament-ended':
			setTournamentStatus('Tournament ended!');
			break;

		case 'tic-tac-toe:game-started':
			gameId = msg.id;
			setTournamentStatus(`Game ${gameId} started!`);
			startGame();
			setStatus('Waiting for turn...');
			break;

		case 'tic-tac-toe:game-ended':
			let result;

			if (msg.winningMark === null) {
				result = 'Stalemate!';
			} else {
				result = msg.winningMark + ' wins!';
			}

			setStatus('Game ended: ' + result);
			break;

		case 'tic-tac-toe:your-turn':
			mark = msg.mark;
			setStatus(`Your turn! You are ${mark}`);
			makeYourMove();
			break;

		case 'tic-tac-toe:move-accepted':
			setStatus(`${msg.mark} to cell ${msg.cellIndex}`);
			setStatus('Move accepted. Waiting for turn...');
			recordMove(msg.cellIndex, msg.mark);
			break;

		default:
			setTournamentStatus('Received unknown message type: ' + msg.type);
			break;
	}
}

function startGame() {
	cells = [null, null, null, null, null, null, null, null, null];
}

function recordMove(cellIndex, mark) {
	cells[cellIndex] = mark;
}

joinTournament();
