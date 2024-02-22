let socket;
let closeTimeout;
let waitingForTurnTimeout;
let gameId;
let mark; // X or O
let yourTurn = false;
let backgroundColors = ['#FFC', '#CFF'];

function gameOver(msg) {
	setStatus(msg);

	// Unbind cell events since game is over!
	$('.cell').each(function () {
		$(this).unbind();
	});
}

function setStatus(status) {
	$('#status').html(status);
}

function setTournamentStatus(status) {
	$('#tournament-status').html(status);
}

function joinTournament() {
	let serverUrl = $('#server-url').val();
	setTournamentStatus('Connecting to ' + serverUrl);
	clearTimeout(closeTimeout);
	$('#server-url').prop("disabled", true);
	$('#connect-button').prop("disabled", true);
	
	socket = new WebSocket(serverUrl);
	
	socket.onopen = () => {
		setTournamentStatus('Connected to ' + serverUrl);
		setStatus('Waiting for game to start...');
		setTimeout(() => {
			setTournamentStatus('Waiting for tournament...');
		}, 1000);

		startGame(); // Reset game board

		$('#connect-button').hide();
		$('#disconnect-button').show();
	};

	socket.onmessage = (msg) => {
		console.log(msg);
		handleMessage(JSON.parse(msg.data));
	};

	socket.onerror = (err) => {
		console.log(err);
		setTournamentStatus('Error: Unable to Connect to ' + serverUrl);
	};

	socket.onclose = () => {
		console.log('Disconnected from ' + serverUrl);
		setTournamentStatus('Disconnected from ' + serverUrl);
		closeTimeout = setTimeout(() => {
			setTournamentStatus('Not connected');
		}, 3500);

		$('#server-url').prop("disabled", false);
		$('#connect-button').prop("disabled", false).show();
		$('#disconnect-button').hide();
	};
}

function makeYourMove(cellIndex) {
	//recordMove(cellIndex, mark);
	sendMove(cellIndex);
	setStatus('Waiting for turn...');
	$('#game').removeClass('yourTurn');
	yourTurn = false;
}

function sendMove(cellIndex) {
	let message = {
		type: 'tic-tac-toe:move',
		id: gameId,
		cellIndex: cellIndex,
	};

	console.log('Sending move: ', message);

	socket.send(JSON.stringify(message));
}

function leaveTournament() {
	setTournamentStatus('Leaving tournament...');
	setTimeout(() => {
		socket.close();
	}, 1000);
}

function handleMessage(msg) {
	console.log('Handle message: ', msg);

	switch (msg.type) {
		case 'hello':
			socket.send(JSON.stringify({ type: 'hello', clientType: 'player', name: 'Human' }));
			break;

		case 'illegal':
			setStatus('Illegal move: ' + msg.reason);
			break;

		case 'tournament-started':
			setTournamentStatus('Tournament started! Waiting for game...');
			break;
		
		case 'tournament-ended':
			setTournamentStatus('Tournament ended!');
			break;

		case 'tic-tac-toe:game-started':
			gameId = msg.id;
			setTournamentStatus(`Game ${gameId} started!`);
			startGame();
			waitingForTurnTimeout = setTimeout(() => {
				setStatus('Waiting for turn...');
			}, 1500);
			break;

		case 'tic-tac-toe:game-ended':
			let result;

			if (msg.winningMark === null) {
				result = 'Stalemate!';
			} else {
				result = msg.winningMark + ' wins!';
				drawWinner(msg.winningPattern);
			}

			setStatus('Game ended: ' + result);
			break;

		case 'tic-tac-toe:your-turn':
			clearTimeout(waitingForTurnTimeout);
			mark = msg.mark;
			yourTurn = true;
			setStatus(`Your turn! You are ${mark}`);
			$('#game').addClass('yourTurn');
			break;

		case 'tic-tac-toe:move-accepted':
			console.log(`${msg.mark} to ${msg.cellIndex}`);
			setStatus('Move accepted. Waiting for turn...');
			recordMove(msg.cellIndex, msg.mark);
			break;

		default:
			console.log('Message type not undertood: ', msg.type, '\nReason: ', msg.reason);
			setTournamentStatus('Received unknown message type: ' + msg.type);
			break;
	}
}

function startGame() {
	yourTurn = false;

	bindCells();
	$('#game').css('background-color', backgroundColors[(gameId % backgroundColors.length)]);
	$('#winner').hide();
}

function bindCells() {
	$('.cell')
		.removeClass('selected')
		.html('')
		.click(function () {
			console.log('CLICK! cell # = ' + $(this).index() + ', ' + (yourTurn ? '' : 'NOT') + ' your turn! ' + (yourTurn ? 'YAY!' : 'BOO!') + ', Mark is ' + mark);

			if (!yourTurn) return;

			makeYourMove($(this).index());
		});
}

function recordMove(cellIndex, mark) {
	$('.cell:nth-child(' + (cellIndex + 1) + ')')
		.html(mark)
		.addClass('selected')
		.unbind();
}

function drawWinner(pattern) {
	$('#winner').show();
	let canvas = $('#winner').get(0);
	let context = canvas.getContext('2d');
	canvas.width = 300;
	canvas.height = 300;
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.beginPath();

	let bitsFound = 0;
	let coordinates = [];

	for (let bit = 0; bit < 9; bit++) {
		let bitValue = Math.pow(2, bit);
		if ((pattern & bitValue) === bitValue) {
			let row = Math.floor(bit / 3);
			let column = (bit % 3);
			coordinates.push([column, row]);
		}
	}
	let cellWidth = canvas.width / 3;
	let cellHeight = canvas.height / 3;
	let x1 = cellWidth * coordinates[0][0] + (((coordinates[0][0] - coordinates[2][0]) / 2 + 1) * cellWidth / 2);
	let y1 = cellHeight * coordinates[0][1] + (((coordinates[0][1] - coordinates[2][1]) / 2 + 1) * cellHeight / 2);
	let x2 = cellWidth * coordinates[2][0] + (((coordinates[2][0] - coordinates[0][0]) / 2 + 1) * cellWidth / 2);
	let y2 = cellHeight * coordinates[2][1] + (((coordinates[2][1] - coordinates[0][1]) / 2 + 1) * cellHeight / 2);
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.strokeStyle = '#F00';
	context.lineWidth = 6;
	context.lineCap = 'round';
	context.stroke();
}
