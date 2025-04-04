/***************************************************************
 * DATA STRUCTURES
 ***************************************************************/
/**
 * Each tournament object looks like:
 * {
 *   id: string (unique),
 *   name: string,
 *   format: "roundRobin" | "groups",
 *   teams: [
 *     {
 *       id: string,
 *       name: string,
 *       players: [ { id: string, name: string }, ... ]
 *     },
 *     ...
 *   ],
 *   matches: [
 *     {
 *       id: string,
 *       team1Id: string,
 *       team2Id: string,
 *       played: boolean,
 *       team1Sets: number,
 *       team2Sets: number,
 *       individualMatches: [
 *         {
 *           player1Name: string,
 *           player2Name: string,
 *           player1Sets: [number, number, number, ...],
 *           player2Sets: [number, number, number, ...],
 *           winner: 1 or 2
 *         },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 * }
 */

// Helper to get tournaments from localStorage
function getTournaments() {
  const data = localStorage.getItem('tournaments');
  return data ? JSON.parse(data) : [];
}

function saveTournaments(tournaments) {
  localStorage.setItem('tournaments', JSON.stringify(tournaments));
}

function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

/***************************************************************
 * ON LOAD, INITIALIZE THE DASHBOARD
 ***************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const createForm = document.getElementById('createTournamentForm');
  const tournamentsList = document.getElementById('tournamentsList');

  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('tournamentName').value;
      const format = document.getElementById('tournamentFormat').value;
      createForm.reset();
      renderTournamentsList();
    });
  }

  if (tournamentsList) {
    renderTournamentsList();
  }
});


/***************************************************************
 * CREATE TOURNAMENT
 ***************************************************************/
function createTournament(name, format) {
  const tournaments = getTournaments();
  const newTournament = {
    id: generateId(),
    name,
    format,
    teams: [],
    matches: []
  };
  tournaments.push(newTournament);
  saveTournaments(tournaments);
  alert(`Tournament "${name}" created!`);
}

/***************************************************************
 * RENDER TOURNAMENTS LIST
 ***************************************************************/
function renderTournamentsList() {
  const tournaments = getTournaments();
  const container = document.getElementById('tournamentsList');
  if (!container) return;

  container.innerHTML = '';

  if (tournaments.length === 0) {
    container.innerHTML = '<p>No tournaments yet.</p>';
    return;
  }

  tournaments.forEach(t => {
    const div = document.createElement('div');
    div.classList.add('tournament-card'); // Flex kontejner

    // Za brisanje možeš koristiti emoji smeća (🗑), ili unicode &#128465;, 
    // ili pak neki <svg> ili FontAwesome ikonicu (npr. <i class="fa fa-trash"></i>).
    div.innerHTML = `
  <div class="tournament-info">
    <strong>${t.name || ''}</strong> (Format: ${t.format || ''})
  </div>
  <div class="tournament-actions">
    <a href="tournament.html?t=${encodeURIComponent(t.name)}">
      <button>Open</button>
    </a>
    <!-- Ikona za brisanje -->
    <button class="delete-icon" onclick="deleteTournament('${t.id}')">🗑</button>
  </div>
`;
    container.appendChild(div);
  });
}


function deleteTournament(tournamentId) {
  if (!confirm('Da li sigurno želiš obrisati ovaj turnir?')) {
    return;
  }

  let tournaments = getTournaments();
  // Filtriraj da ostanu svi osim onog s proslijeđenim ID-om
  tournaments = tournaments.filter(t => t.id !== tournamentId);
  saveTournaments(tournaments);
  
  // Osvježi prikaz
  renderTournamentsList();
}



/***************************************************************
 * OPEN A TOURNAMENT (SHOW TEAMS, MATCHES, ETC.)
 ***************************************************************/
function openTournament(tournamentId) {
  // We can create a modal or new window. For simplicity, let's do a simple overlay.
  const overlay = document.createElement('div');
  overlay.classList.add('overlay');

  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);

  // Build inner HTML
  overlay.innerHTML = `
    <div class="overlay-content">
      <h2>${tournament.name} - Management</h2>
      <button class="close-btn" onclick="document.body.removeChild(this.parentNode.parentNode)">Close</button>

      <!-- Section for adding a new team -->
      <div>
        <h3>Add Team</h3>
        <input type="text" id="newTeamName" placeholder="Team name" />
        <button onclick="addTeam('${tournamentId}')">Add Team</button>
      </div>

      <!-- List teams -->
      <div>
        <h3>Teams</h3>
        <div id="teamsContainer">
          ${tournament.teams.length === 0 ? '<p>No teams yet.</p>' : ''}
          ${tournament.teams.map(team => `
            <div class="team-card">
              <strong>${team.name}</strong>
              <button onclick="openTeam('${tournamentId}','${team.id}')">Manage Players</button>
            </div>
          `).join('')}
        </div>
      </div>

      <hr/>

      <!-- Button to generate matches (Round Robin for example) -->
      <div>
        <button onclick="generateMatches('${tournamentId}')">Generate Matches</button>
      </div>

      <!-- List matches -->
      <div>
        <h3>Matches</h3>
        <div id="matchesContainer">
          ${renderMatchesHtml(tournament)}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

/***************************************************************
 * ADD TEAM TO TOURNAMENT
 ***************************************************************/
function addTeam(tournamentId, newTeamName) {
  const tournaments = getTournaments();
  const index = tournaments.findIndex(t => t.id === tournamentId);
  if (index === -1) return; // ne postoji turnir s tim ID-om

  // Dodaj novi tim
  tournaments[index].teams.push({
    id: generateId(),
    name: newTeamName,
    players: []
  });

  saveTournaments(tournaments);

  // Ponovo dohvati turnir i renderiraj timove
  const updatedTournament = tournaments[index];
  renderTeams(updatedTournament);
}

/***************************************************************
 * OPEN TEAM - MANAGE PLAYERS
 ***************************************************************/
function openTeam(tournamentId, teamId) {
  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);
  if (!tournament) return;
  
  const team = tournament.teams.find(tm => tm.id === teamId);
  if (!team) return;

  const overlay = document.createElement('div');
  overlay.classList.add('overlay');

  overlay.innerHTML = `
    <div class="overlay-content">
      <h2>Manage Players - ${team.name}</h2>
      <button class="close-btn" onclick="document.body.removeChild(this.parentNode.parentNode)">Close</button>

      <div>
        <input type="text" id="newPlayerName" placeholder="Player name" />
        <button onclick="addPlayer('${tournamentId}','${teamId}')">Add Player</button>
      </div>

      <div>
        <h3>Existing Players</h3>
        <ul id="playersList">
          ${
            team.players.length === 0 
              ? '<li>No players yet.</li>' 
              : team.players.map(p => `
                  <li>
                    ${p.name}
                    <button style="margin-left:10px;" onclick="deletePlayer('${tournamentId}', '${teamId}', '${p.id}')">🗑️</button>
                  </li>
                `).join('')
          }
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function addPlayer(tournamentId, teamId) {
  const nameInput = document.getElementById('newPlayerName');
  const playerName = nameInput.value.trim();
  if (!playerName) {
    alert('Enter a player name');
    return;
  }

  const tournaments = getTournaments();
  const tIndex = tournaments.findIndex(t => t.id === tournamentId);
  if (tIndex === -1) return;

  const team = tournaments[tIndex].teams.find(tm => tm.id === teamId);
  if (!team) return;

  // Dodaj igrača
  team.players.push({
    id: generateId(),
    name: playerName
  });

  saveTournaments(tournaments);

  // Zatvori i ponovo otvori overlay da se osvježi
  document.body.removeChild(document.querySelector('.overlay'));
  openTeam(tournamentId, teamId);
}

/***************************************************************
 * GENERATE MATCHES (Round Robin example)
 ***************************************************************/
function generateMatches(tournamentId) {
  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);

  // Ako već postoje mečevi
  if (tournament.matches && tournament.matches.length > 0) {
    const confirmMsg = confirm('Matches already generated. Regenerate? This will clear current results.');
    if (!confirmMsg) return;
    tournament.matches = [];
  }

  const teams = tournament.teams;
  if (teams.length < 2) {
    alert('You need at least 2 teams to generate matches.');
    return;
  }

  // Generisanje round robin parova
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      tournament.matches.push({
        id: generateId(),
        team1Id: teams[i].id,
        team2Id: teams[j].id,
        played: false,
        team1Sets: 0,
        team2Sets: 0,
        individualMatches: []
      });
    }
  }

  saveTournaments(tournaments);

  // ✨ NOVO: Redirekcija na novu stranicu
  const safeName = tournament.name.toLowerCase().replaceAll(' ', '_');
  window.location.href = `tournament.html?t=${safeName}`;
}


/***************************************************************
 * RENDER MATCHES HTML
 ***************************************************************/
function renderMatchesHtml(tournament) {
  if (!tournament.matches || tournament.matches.length === 0) {
    return '<p>No matches generated yet.</p>';
  }

  let html = '';
  tournament.matches.forEach(m => {
    const team1 = tournament.teams.find(t => t.id === m.team1Id);
    const team2 = tournament.teams.find(t => t.id === m.team2Id);
    const team1Name = team1 ? team1.name : 'Unknown';
    const team2Name = team2 ? team2.name : 'Unknown';

    const winnerText = m.played
      ? (m.team1Sets > m.team2Sets ? (team1Name + ' WON') : (team2Name + ' WON'))
      : 'Not played yet';

    html += `
      <div class="match-card">
        <p><strong>${team1Name}</strong> vs <strong>${team2Name}</strong></p>
        <p>Match Result: ${m.team1Sets} : ${m.team2Sets}</p>
        <p>Winner: ${winnerText}</p>
        <button onclick="openMatchEditor('${tournament.id}','${m.id}')">Record Results</button>
      </div>
    `;
  });
  return html;
}

/***************************************************************
 * OPEN MATCH EDITOR (to enter set scores)
 ***************************************************************/
/* === openMatchEditor.js === */

function openMatchEditor(tournamentId, matchId) {
  // 1) Napravi overlay div
  const overlay = document.createElement('div');
  overlay.classList.add('overlay');

  // 2) Dohvati turnir i meč
  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);
  if (!tournament) {
    alert("Tournament not found!");
    return;
  }
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match) {
    alert("Match not found!");
    return;
  }

  // 3) Pronađi ekipe
  const team1 = tournament.teams.find(t => t.id === match.team1Id);
  const team2 = tournament.teams.find(t => t.id === match.team2Id);
  if (!team1 || !team2) {
    alert("Teams not found in this match!");
    return;
  }

  // 4) Ako individualMatches ne postoji, inicijaliziraj
  if (!match.individualMatches) {
    match.individualMatches = [];
  }

  // 5) DOPUNI do 5 mečeva (ništa ne brišemo!)
  while (match.individualMatches.length < 5) {
    match.individualMatches.push({
      player1Name: "",
      player2Name: "",
      player1Sets: ["","","","",""],
      player2Sets: ["","","","",""],
      winner: null
    });
  }

  // 6) Složi HTML redove forme
  let rowsHtml = "";
  match.individualMatches.forEach((im, rowIndex) => {
    // a) Dropdown za team1
    const team1PlayersOptions = team1.players.map(p => {
      const selected = (p.name === im.player1Name) ? "selected" : "";
      return `<option value="${p.name}" ${selected}>${p.name}</option>`;
    }).join("");

    // b) Dropdown za team2
    const team2PlayersOptions = team2.players.map(p => {
      const selected = (p.name === im.player2Name) ? "selected" : "";
      return `<option value="${p.name}" ${selected}>${p.name}</option>`;
    }).join("");

    // c) Input polja za setove (npr. 5 inputa "11:9")
    let setInputs = "";
    for (let i = 0; i < 5; i++) {
      const s1 = im.player1Sets[i];
      const s2 = im.player2Sets[i];
      // Ako su oba broja upisana, spoji ih u "11:9", inače ostavi prazno
      const val = (s1 !== "" && s2 !== "") ? (s1 + ":" + s2) : "";
      // Dodaj "oninput" da odmah računamo parcijalni rezultat:
      setInputs += `
        <input type="text" class="set-input"
               id="set_${rowIndex}_${i}"
               value="${val}"
               placeholder="11:9"
               oninput="calculateIndividualResult(${rowIndex})" />
      `;
    }

    // d) Tekstualni prikaz rezultata (npr. "3 - 0 ✅")
    let resultText = "-";
    if (im.winner === 1) {
      resultText = "3 - 0 ✅";
    } else if (im.winner === 2) {
      resultText = "0 - 3 ✅";
    }

    // e) Spoji sve u jedan <tr>
    rowsHtml += `
      <tr>
        <td>
          <select id="p1_${rowIndex}">
            <option value="">-- Player --</option>
            ${team1PlayersOptions}
          </select>
        </td>
        <td>
          <select id="p2_${rowIndex}">
            <option value="">-- Player --</option>
            ${team2PlayersOptions}
          </select>
        </td>
        <td>${setInputs}</td>
        <td id="result_${rowIndex}">${resultText}</td>
      </tr>
    `;
  });

  // 7) Sastavi cijeli overlay
  overlay.innerHTML = `
    <div class="overlay-content">
      <h2>Record Results: ${team1.name} vs ${team2.name}</h2>
      <button class="close-btn" onclick="document.body.removeChild(this.parentNode.parentNode)">Close</button>

      <table border="1" cellpadding="5" cellspacing="0" style="width:100%; text-align:left;">
        <thead>
          <tr>
            <th>Player from ${team1.name}</th>
            <th>Player from ${team2.name}</th>
            <th>Sets (up to 5)</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <br/>
      <button onclick="saveMatchResults('${tournamentId}', '${matchId}')">Save Results</button>
    </div>
  `;

  // 8) Dodaj overlay u dokument
  document.body.appendChild(overlay);
}



/* === saveMatchResults.js === */
function saveMatchResults(tournamentId, matchId) {
  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);
  if (!tournament) {
    alert("Tournament not found!");
    return;
  }
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match) {
    alert("Match not found!");
    return;
  }

  // Reset ukupnog rezultata meča (broj individualnih pobjeda)
  match.team1Sets = 0;
  match.team2Sets = 0;

  // Prođi kroz svih (do) 5 individualnih partija
  match.individualMatches.forEach((im, rowIndex) => {
    // Pokupi selektirane igrače
    const p1Select = document.getElementById(`p1_${rowIndex}`);
    const p2Select = document.getElementById(`p2_${rowIndex}`);
    im.player1Name = p1Select ? p1Select.value : "";
    im.player2Name = p2Select ? p2Select.value : "";

    let p1SetWins = 0;
    let p2SetWins = 0;

    // Parsiraj do 5 setova iz input polja
    for (let i = 0; i < 5; i++) {
      const setInput = document.getElementById(`set_${rowIndex}_${i}`);
      if (!setInput) {
        im.player1Sets[i] = "";
        im.player2Sets[i] = "";
        continue;
      }

      const raw = setInput.value.trim(); // npr. "11:9"
      if (!raw) {
        im.player1Sets[i] = "";
        im.player2Sets[i] = "";
        continue;
      }

      const parts = raw.split(':');
      if (parts.length !== 2) {
        im.player1Sets[i] = "";
        im.player2Sets[i] = "";
        continue;
      }

      const s1 = parseInt(parts[0], 10);
      const s2 = parseInt(parts[1], 10);
      if (isNaN(s1) || isNaN(s2)) {
        im.player1Sets[i] = "";
        im.player2Sets[i] = "";
        continue;
      }

      // Spremi set rezultat
      im.player1Sets[i] = s1;
      im.player2Sets[i] = s2;

      // Tko je dobio set
      if (s1 > s2) p1SetWins++;
      else if (s2 > s1) p2SetWins++;
    }

    // Odredi winner te partije
    if (p1SetWins >= 3) {
      im.winner = 1;
      match.team1Sets++; // Ekipa 1 dobila ovu individualnu
    } else if (p2SetWins >= 3) {
      im.winner = 2;
      match.team2Sets++; // Ekipa 2
    } else {
      im.winner = null; // nije odlučeno
    }
  });

  // Ako jedna ekipa ima >=3 individualnih pobjeda, meč je odigran
  if (match.team1Sets >= 3 || match.team2Sets >= 3) {
    match.played = true;
  } else {
    match.played = false;
  }

  // Spremi u localStorage
  saveTournaments(tournaments);

  // Zatvori popup
  const overlayEl = document.querySelector('.overlay');
  if (overlayEl) {
    document.body.removeChild(overlayEl);
  }

  // Osvježi prikaz mečeva i standings (ako postoji na stranici)
  // Primjer: 
  const matchesListEl = document.getElementById('matchesList');
  if (matchesListEl) {
    matchesListEl.innerHTML = renderMatchesHtml(tournament);
  }
  const standingsTableEl = document.getElementById('standingsTable');
  if (standingsTableEl) {
    standingsTableEl.innerHTML = generateStandingsTable(tournament);
  }
}



/***************************************************************
 * RENDER INDIVIDUAL MATCHES
 ***************************************************************/
function renderIndividualMatches(match) {
  if (!match.individualMatches || match.individualMatches.length === 0) {
    return '<p>No individual matches yet.</p>';
  }

  let html = '';
  match.individualMatches.forEach((im, index) => {
    const setsPlayer1 = im.player1Sets.join(',');
    const setsPlayer2 = im.player2Sets.join(',');

    html += `
      <div class="individual-match-card">
        <p>${im.player1Name} vs ${im.player2Name}</p>
        <p>Sets: ${setsPlayer1} : ${setsPlayer2}</p>
        <p>Winner: ${im.winner === 1 ? im.player1Name : (im.winner === 2 ? im.player2Name : 'Not decided')}</p>
        <button onclick="enterSets('${match.id}', ${index})">Enter/Update Sets</button>
      </div>
    `;
  });

  return html;
}

/***************************************************************
 * ADD NEW INDIVIDUAL MATCH
 ***************************************************************/
function addIndividualMatch(tournamentId, matchId) {
  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);
  const match = tournament.matches.find(m => m.id === matchId);

  const player1Select = document.getElementById('player1Select');
  const player2Select = document.getElementById('player2Select');

  const newIM = {
    player1Name: player1Select.value,
    player2Name: player2Select.value,
    player1Sets: [],
    player2Sets: [],
    winner: null
  };

  match.individualMatches.push(newIM);
  saveTournaments(tournaments);

  // Re-open match editor
  document.body.removeChild(document.querySelector('.overlay'));
  openMatchEditor(tournamentId, matchId);
}

/***************************************************************
 * ENTER/UPDATE SET RESULTS
 ***************************************************************/
function enterSets(matchId, imIndex) {
  // We'll open a prompt to quickly gather set results.
  const tournaments = getTournaments();
  // We need to find which tournament has this match ID.
  // For simplicity, let's do a big find:
  let foundTournament = null;
  let foundMatch = null;
  for (let t of tournaments) {
    let m = t.matches.find(mm => mm.id === matchId);
    if (m) {
      foundTournament = t;
      foundMatch = m;
      break;
    }
  }
  if (!foundMatch) return;

  const indMatch = foundMatch.individualMatches[imIndex];
  // We'll assume up to 5 sets. We'll ask for the user input in some prompt form.

  let sets = prompt('Enter sets as "p1-p2, p1-p2, ..." e.g. "11-8, 6-11, 11-7" up to 5 sets');
  if (!sets) return;

  const setsArray = sets.split(',').map(s => s.trim());
  indMatch.player1Sets = [];
  indMatch.player2Sets = [];

  for (let s of setsArray) {
    const [p1, p2] = s.split('-').map(x => parseInt(x.trim(), 10));
    if (!isNaN(p1) && !isNaN(p2)) {
      indMatch.player1Sets.push(p1);
      indMatch.player2Sets.push(p2);
    }
  }

  // Determine winner by first to 3 sets (in practice each set is up to e.g. 11, but we'll just see who has 3 sets).
  let p1SetWins = 0;
  let p2SetWins = 0;
  for (let i = 0; i < indMatch.player1Sets.length; i++) {
    if (indMatch.player1Sets[i] > indMatch.player2Sets[i]) p1SetWins++;
    else if (indMatch.player1Sets[i] < indMatch.player2Sets[i]) p2SetWins++;
  }
  if (p1SetWins >= 3) {
    indMatch.winner = 1;
  } else if (p2SetWins >= 3) {
    indMatch.winner = 2;
  } else {
    indMatch.winner = null; // not decided yet
  }

  // Now recalc match overall if we have a winner
  recalcMatchScore(foundMatch);

  saveTournaments(tournaments);

  // Reopen match editor
  document.body.removeChild(document.querySelector('.overlay'));
  openMatchEditor(foundTournament.id, foundMatch.id);
}

/***************************************************************
 * RECALCULATE MATCH SCORE
 * Once a team hits 3 *individual* wins, the match ends.
 ***************************************************************/
function recalcMatchScore(match) {
  let team1Wins = 0;
  let team2Wins = 0;

  match.individualMatches.forEach(im => {
    if (im.winner === 1) team1Wins++;
    if (im.winner === 2) team2Wins++;
  });

  match.team1Sets = team1Wins;
  match.team2Sets = team2Wins;

  // If either hits 3, match is done
  if (team1Wins >= 3 || team2Wins >= 3) {
    match.played = true;
  } else {
    match.played = false;
  }
}

function initDashboard() {
  const createForm = document.getElementById('createTournamentForm');
  const tournamentsList = document.getElementById('tournamentsList');

  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('tournamentName').value;
      const format = document.getElementById('tournamentFormat').value;
      createTournament(name, format);
      createForm.reset();
      renderTournamentsList();
    });
  }

  if (tournamentsList) {
    renderTournamentsList();
  }
}

function renderTeams(tournament) {
  const teamsContainer = document.getElementById('teamsList');
  if (!teamsContainer) return;

  if (!tournament.teams || tournament.teams.length === 0) {
    teamsContainer.innerHTML = "<p>No teams yet.</p>";
    return;
  }

  let html = '';
  tournament.teams.forEach(team => {
    html += `
      <div class="team-card">
        <strong>${team.name}</strong>
        <button onclick="openTeam('${tournament.id}', '${team.id}')">Manage Players</button>
      </div>
    `;
  });

  teamsContainer.innerHTML = html;
}


function openTeam(tournamentId, teamId) {
  const overlay = document.createElement('div');
  overlay.classList.add('overlay');

  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);
  const team = tournament.teams.find(tm => tm.id === teamId);

  overlay.innerHTML = `
    <div class="overlay-content">
      <h2>Manage Players - ${team.name}</h2>
      <button class="close-btn" onclick="document.body.removeChild(this.parentNode.parentNode)">Close</button>

      <div>
        <input type="text" id="newPlayerName" placeholder="Player name" />
        <button onclick="addPlayer('${tournamentId}','${teamId}')">Add Player</button>
      </div>

      <div>
        <h3>Existing Players</h3>
        <ul id="playersList">
          ${team.players.map(p => `
            <li>
              ${p.name}
              <button style="margin-left:10px;" onclick="deletePlayer('${tournamentId}', '${teamId}', '${p.id}')">🗑️</button>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function deletePlayer(tournamentId, teamId, playerId) {
  const tournaments = getTournaments();
  const tIndex = tournaments.findIndex(t => t.id === tournamentId);
  if (tIndex === -1) return;

  const team = tournaments[tIndex].teams.find(tm => tm.id === teamId);
  if (!team) return;

  // Filtriraj iz niza
  team.players = team.players.filter(p => p.id !== playerId);
  saveTournaments(tournaments);

  // Zatvori i ponovo otvori overlay
  document.body.removeChild(document.querySelector('.overlay'));
  openTeam(tournamentId, teamId);
}

function generateStandingsTable(tournament) {
  const teams = tournament.teams || [];
  const matches = tournament.matches || [];

  if (!teams.length) return '<p>No teams in this tournament.</p>';

  // Napravi "statistiku" za svaku ekipu
  const standings = teams.map(team => {
    const playedMatches = matches.filter(m => m.played && (m.team1Id === team.id || m.team2Id === team.id));
    let wins = 0;
    let losses = 0;

    playedMatches.forEach(m => {
      const isTeam1 = (m.team1Id === team.id);
      const team1Won = m.team1Sets > m.team2Sets;
      const winnerIsThisTeam = (isTeam1 && team1Won) || (!isTeam1 && !team1Won);
      if (winnerIsThisTeam) wins++;
      else losses++;
    });

    return {
      name: team.name,
      wins,
      losses,
      played: wins + losses
    };
  });

  // Sortiraj po broju pobjeda
  standings.sort((a, b) => b.wins - a.wins);

  let html = `
    <table border="1" cellspacing="0" cellpadding="5">
      <tr>
        <th>Team</th><th>Played</th><th>Wins</th><th>Losses</th>
      </tr>
  `;

  standings.forEach(team => {
    html += `
      <tr>
        <td>${team.name}</td>
        <td>${team.played}</td>
        <td>${team.wins}</td>
        <td>${team.losses}</td>
      </tr>
    `;
  });

  html += `</table>`;
  return html;
}

function calculateIndividualResult(rowIndex) {
  let p1Wins = 0;
  let p2Wins = 0;

  // Prođi kroz 5 polja za dati rowIndex
  for (let i = 0; i < 5; i++) {
    const inputEl = document.getElementById(`set_${rowIndex}_${i}`);
    if (!inputEl) continue;

    const raw = inputEl.value.trim(); // npr. "11:9"
    if (!raw) continue; // prazno polje -> preskačemo

    const parts = raw.split(':');
    if (parts.length !== 2) continue; // mora biti "broj:broj"

    const s1 = parseInt(parts[0], 10);
    const s2 = parseInt(parts[1], 10);
    if (isNaN(s1) || isNaN(s2)) continue;

    // Ko je dobio set
    if (s1 > s2) p1Wins++;
    else if (s2 > s1) p2Wins++;
  }

  // Ažuriraj prikaz
  const resultEl = document.getElementById(`result_${rowIndex}`);
  if (!resultEl) return;

  if (p1Wins === 0 && p2Wins === 0) {
    resultEl.innerHTML = '-';
    return;
  }

  // Ako netko stigne do 3, stavi neku kvačicu
  const isFinished = (p1Wins >= 3 || p2Wins >= 3);
  const checkIcon = isFinished ? ' ✅' : '';
  resultEl.innerHTML = `${p1Wins} - ${p2Wins}${checkIcon}`;
}


