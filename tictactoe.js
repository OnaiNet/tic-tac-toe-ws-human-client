let socket;
let closeTimeout;
let waitingForTurnTimeout;
let gameId;
let mark; // X or O
let yourTurn = false;
let backgroundColors = ['#FFC', '#CDF', '#FCF', '#DFD', ];
let clientType;
let players;

const RANDOM_NAMES = [
	'Luke Skywalker',
	'Leia Organa',
	'Anakin Skywalker',
	'Obi-Wan Kenobi',
	'Yoda',
	'Qui-Gon Jinn',
	'Padmé Amidala',
	'Chewbacca',
	'R2-D2',
	'C-3PO',
	'Jar Jar Binks',
	'Darth Vader',
	'Emperor Palpatine',
	'Count Dooku',
	'General Grievous',
	'Jean-Luc Picard',
	'William Riker',
	'Data',
	'Worf',
	'Beverly Crusher',
	'Deanna Troi',
	'Geordi La Forge',
	'Wesley Crusher',
	'Malcolm Reynolds',
	'Zoë Washburne',
	'Hoban Washburne',
	'Inara Serra',
	'Jayne Cobb',
	'Kaylee Frye',
	'Simon Tam',
	'River Tam',
	'Shepherd Book',
	'Homer Simpson',
	'Bart Simpson',
	'Marge Simpson',
	'Lisa Simpson',
	'Maggie Simpson',
	'Ned Flanders',
	'Montgomery Burns',
	'Waylon Smithers',
	'Krusty the Clown',
	'Chief Wiggum',
	'Apu Nahasapeemapetilon',
	'Moe Szyslak',
	'Barney Gumble',
	'Sideshow Bob',
	'Groundskeeper Willie',
	'Comic Book Guy',
	'Edna Krabappel',
	'Nelson Muntz',
	'Peter Griffin',
	'Lois Griffin',
	'Meg Griffin',
	'Chris Griffin',
	'Stewie Griffin',
	'Brian Griffin',
	'Glenn Quagmire',
	'Joe Swanson',
	'Cleveland Brown',
	'Fred Flintstone',
	'Wilma Flintstone',
	'Pebbles Flintstone',
	'Dino',
	'Barney Rubble',
	'Betty Rubble',
	'Bamm-Bamm Rubble',
	'Ted Lasso',
	'Roy Kent',
	'Keeley Jones',
	'Rebecca Welton',
	'Nathan Shelley',
	'Jamie Tartt',
	'Leslie Higgins',
	'Coach Beard',
	'Walter White',
	'Skyler White',
	'Jesse Pinkman',
	'Hank Schrader',
	'Bandit Heeler',
	'Bluey Heeler',
	'Chilli Heeler',
	'Bingo Heeler',
	'Calvin and Hobbes',
	'A Cow from The Far Side',
	'Garfield',
	'Jon Arbuckle',
	'Odie',
	'Snoopy',
	'Charlie Brown',
	'Woodstock',
	'Lucy van Pelt',
	'Linus van Pelt',
	'Peppermint Patty',
	'Bender',
	'Fry',
	'Leela',
	'Zoidberg',
	'Hermes',
	'Professor Farnsworth',
	'Zapp Brannigan',
	'Kif Kroker',
	'Marty McFly',
	'Biff Tannen',
	'George McFly',
	'Lorraine Baines',
	'Jennifer Parker',
	'Emmett Brown',
	'Captain Jack Sparrow',
	'Will Turner',
	'Elizabeth Swann',
	'Hector Barbossa',
	'Davy Jones',
];

$(document).ready(() => {
	bindCells();
});

function gameOver(msg) {
	setStatus(msg);
}

function setStatus(status) {
	$('#status').html(status);
}

function setTournamentStatus(status) {
	$('#tournament-status').html(status);
}

function join(role) {
	clientType = role;
	players = {};
	let serverUrl = $('#server-url').val();
	setTournamentStatus('Connecting to ' + serverUrl);
	clearTimeout(closeTimeout);
	$('#server-url').prop("disabled", true);
	$('button').prop("disabled", true);

	socket = new WebSocket(serverUrl);

	socket.onopen = () => {
		setTournamentStatus('Connected to ' + serverUrl);
		setStatus('Waiting for game to start...');
		setTimeout(() => {
			setTournamentStatus('Waiting for tournament...');
		}, 1000);

		startGame(); // Reset game board

		$('#play-button').hide();
		$('#observe-button').hide();
		$('#player-name').show().prop('disabled', true);
		$('#disconnect-button').show().prop('disabled', false);
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
		clientType = undefined;
		console.log('Disconnected from ' + serverUrl);
		setTournamentStatus('Disconnected from ' + serverUrl);
		closeTimeout = setTimeout(() => {
			setTournamentStatus('Not connected');
		}, 3500);
		$('#server-url').prop("disabled", false);
		$('#player-name').prop("disabled", false);
		$('#play-button').prop("disabled", false).show();
		$('#observe-button').prop("disabled", false).show();
		$('#disconnect-button').hide();
		$('.scores').hide();
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
			const reply = { type: 'hello', clientType };

			if (clientType === 'player') {
				if (!$('#player-name').val().trim()) {
					$('#player-name').val(pickRandomName());
				}

				reply.name = $('#player-name').val().trim();
			}

			socket.send(JSON.stringify(reply));
			break;

		case 'illegal':
			setStatus('Illegal move: ' + msg.reason);
			break;

		case 'tournament-started':
			setTournamentStatus('Tournament started! Waiting for game...');
			$('.scores').hide();
			break;

		case 'tournament-ended':
			setTournamentStatus('Tournament ended!');
			$('.cell').removeClass('selected').html('');
			$('#winner').hide();
			$('#game').css('background-color', 'transparent');

			if (clientType === 'observer' && msg.rows) {
				showScores(msg.rows);
			}

			break;

		case 'player-count':
			// do nothing
			break;

		case 'player-joined':
			players[msg.id] = msg.name;
			break;

		case 'player-dropped':
			delete players[msg.id];
			break;

		case 'tic-tac-toe:game-started':
			if (clientType === 'player') {
				gameId = msg.id;
				setTournamentStatus(`Game ${gameId} started!`);
				startGame();
				waitingForTurnTimeout = setTimeout(() => {
					setStatus('Waiting for turn...');
				}, 1500);
			}

			break;

		case 'tic-tac-toe:game-ended':
			if (clientType === 'player') {
				let result;

				if (msg.winningMark === null) {
					result = 'Stalemate!';
				} else {
					result = msg.winningMark + ' wins!';
					drawWinner(msg.winningPattern);
				}

				setStatus('Game ended: ' + result);
			}

			break;

		case 'tic-tac-toe:your-turn':
			if (clientType === 'player') {
				clearTimeout(waitingForTurnTimeout);
				mark = msg.mark;
				yourTurn = true;
				setStatus(`Your turn! You are ${mark}`);
				$('#game').addClass('yourTurn');
			}

			break;

		case 'tic-tac-toe:move-accepted':
			if (clientType === 'player') {
				console.log(`${msg.mark} to ${msg.cellIndex}`);
				setStatus('Move accepted. Waiting for turn...');
				recordMove(msg.cellIndex, msg.mark);
			}

			break;

		default:
			console.log('Message type not understood: ', msg.type, '\nReason: ', msg.reason);
			setTournamentStatus('Received unknown message type: ' + msg.type);
			break;
	}
}

function startGame() {
	yourTurn = false;
	$('#game').css('background-color', backgroundColors[(gameId % backgroundColors.length)]);
	$('#winner').hide();
	$('.cell').removeClass('selected').html('');
}

function bindCells() {
	$('.cell')
		.click(function () {
			if (clientType !== 'player') {
				return; // only players can make moves
			}

			if ($(this).hasClass('selected')) {
				return; // don't allow re-selecting a cell
			}

			console.log('CLICK! cell # = ' + $(this).index() + ', ' + (yourTurn ? '' : 'NOT') + ' your turn! ' + (yourTurn ? 'YAY!' : 'BOO!') + ', Mark is ' + mark);

			if (!yourTurn) return;

			makeYourMove($(this).index());
		});
}

function recordMove(cellIndex, mark) {
	$('.cell:nth-child(' + (cellIndex + 1) + ')')
		.html(mark)
		.addClass('selected');
}

function drawWinner(pattern) {
	$('#winner').show();
	let canvas = $('#winner').get(0);
	let context = canvas.getContext('2d');
	canvas.width = 300;
	canvas.height = 300;
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.beginPath();
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

function showScores(scores) {
	const tbody = $('.scores tbody');
	tbody.html(
		scores.map(({ id, score }) => {
			const name = players[id] ?? id;
			return `<tr><td>${name}</td><td>${score}</td></tr>`;
		}).join('')
	);
	$('.scores').show();
}

function pickRandomName() {
	return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}