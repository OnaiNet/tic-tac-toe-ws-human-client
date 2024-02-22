import { WebSocket } from 'ws';

let socket;
let gameId;
let mark; // X or O
let serverUrl = 'ws://localhost:8080';
let botName = "TicTacAIV1";

let cells;

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

function getBestMove(cells, mark) {

	const winningCombinations = [
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
		[0, 4, 8],
		[2, 4, 6]
	];
	
	// Check for winning move
	for (let combination of winningCombinations) {
		if (cells[combination[0]] === mark && cells[combination[1]] === mark && cells[combination[2]] === null) {
			return combination[2];
		}
		if (cells[combination[0]] === mark && cells[combination[2]] === mark && cells[combination[1]] === null) {
			return combination[1];
		}
		if (cells[combination[1]] === mark && cells[combination[2]] === mark && cells[combination[0]] === null) {
			return combination[0];
		}
	}
	
	// Check for blocking move
	const opponentMark = mark === 'X' ? 'O' : 'X';
	for (let combination of winningCombinations) {
		if (cells[combination[0]] === opponentMark && cells[combination[1]] === opponentMark && cells[combination[2]] === null) {
			return combination[2];
		}
		if (cells[combination[0]] === opponentMark && cells[combination[2]] === opponentMark && cells[combination[1]] === null) {
			return combination[1];
		}
		if (cells[combination[1]] === opponentMark && cells[combination[2]] === opponentMark && cells[combination[0]] === null) {
			return combination[0];
		}
	}
	
	// Check for corner move
	const corners = [0, 2, 6, 8];
	for (let corner of corners) {
		if (cells[corner] === null) {
			return corner;
		}
	}
	
	// Make a random move
	while (true) {
		const randomMove = Math.floor(Math.random() * 9);
		if (cells[randomMove] === null) {
			return randomMove;
		}
	}
}

function makeYourMove() {
	sendMove(getBestMove(cells, mark));
	setStatus('Waiting for turn...');
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
