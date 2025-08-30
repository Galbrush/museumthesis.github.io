let quizDatabase = {};
let currentQuiz = null;

let currentCardIndex = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let gameHistory = [];
let playerAnswers = [];

// ------------------------Privacy notice -------------------------
function acceptPrivacyNotice() {
  document.getElementById("privacy-notice").style.display = "none";
  document.querySelector(".menu-screen").style.display = "flex";
}

// Date Functions here for format and getting quizzes, i need today, yesterday and vorgestern
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

function getDayBeforeYesterdayDate() {
  const dayBeforeYesterday = new Date();
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  return dayBeforeYesterday.toISOString().split("T")[0];
}

function formatDateForDisplay(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  if (dateString === todayString) {
    return "Today's Quiz";
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split("T")[0];

  if (dateString === yesterdayString) {
    return "Yesterday's Quiz";
  }

//format a date to UK format: https://stackoverflow.com/questions/54254556/how-to-format-a-javascript-date-to-uk-format
  return (
    date.toLocaleDateString("en-GB", {
      month: "long",
      day: "numeric",
    }) + " Quiz"
  );
}

function getTodaysQuiz() {
  return quizDatabase["today"] || null;
}

function getYesterdaysQuiz() {
  return quizDatabase["yesterday"] || null;
}

function getDayBeforeYesterdaysQuiz() {
  return quizDatabase["day-before-yesterday"] || null;
}

// Functions for results and storage
function getGameResultsFromStorage() {
  try {
    const saved = localStorage.getItem("artQuizResults");
    console.log('GOOD: Game Results fetched from storage');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Error loading game results from localStorage:", error);
    return [];
  }
}

function saveGameResultsToStorage(results) {
  try {
    localStorage.setItem("artQuizResults", JSON.stringify(results));
    console.log('GOOD: game results saved to storage');
  } catch (error) {
    console.error("Error saving game results to localStorage:", error);
  }
}

// get quiz data from json file
async function loadQuizData() {
  console.log('start loading quiz data...');
  try {
    const response = await fetch("quiz-data.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    quizDatabase = await response.json();
    console.log('GOOD: quiz data loaded');
    console.log('quizzes: ', Object.keys(quizDatabase));
  } catch (error) {
    console.error("Error loading quiz data:", error);
    // if it can't be found - fall back to empty database. 
    quizDatabase = {};
  }
}

// load game history from localStorage to show in archive
function loadGameHistory() {
  const archiveQuizzes = [];

  const todaysQuiz = getTodaysQuiz();
  if (todaysQuiz) {
    const savedResults = getGameResultsFromStorage();
    const todayResult = savedResults.find(
      (result) => result.quizType === "today",
    );

    archiveQuizzes.push({
      date: getTodayDate(),
      quizType: "today",
      title: "Today's Quiz",
      available: true,
      played: !!todayResult,
      score: todayResult ? `${todayResult.correct}/${todayResult.total}` : null,
      accuracy: todayResult
        ? Math.round((todayResult.correct / todayResult.total) * 100)
        : null,
    });
  }

  const yesterdaysQuiz = getYesterdaysQuiz();
  if (yesterdaysQuiz) {
    const savedResults = getGameResultsFromStorage();
    const yesterdayResult = savedResults.find(
      (result) => result.quizType === "yesterday",
    );

    archiveQuizzes.push({
      date: getYesterdayDate(),
      quizType: "yesterday",
      title: "Yesterday's Quiz",
      available: true,
      played: !!yesterdayResult,
      score: yesterdayResult
        ? `${yesterdayResult.correct}/${yesterdayResult.total}`
        : null,
      accuracy: yesterdayResult
        ? Math.round((yesterdayResult.correct / yesterdayResult.total) * 100)
        : null,
    });
  }

  const dayBeforeYesterdaysQuiz = getDayBeforeYesterdaysQuiz();
  if (dayBeforeYesterdaysQuiz) {
    const savedResults = getGameResultsFromStorage();
    const dayBeforeResult = savedResults.find(
      (result) => result.quizType === "day-before-yesterday",
    );

    archiveQuizzes.push({
      date: getDayBeforeYesterdayDate(),
      quizType: "day-before-yesterday",
      title: formatDateForDisplay(getDayBeforeYesterdayDate()),
      available: true,
      played: !!dayBeforeResult,
      score: dayBeforeResult
        ? `${dayBeforeResult.correct}/${dayBeforeResult.total}`
        : null,
      accuracy: dayBeforeResult
        ? Math.round((dayBeforeResult.correct / dayBeforeResult.total) * 100)
        : null,
    });
  }

  return archiveQuizzes;
}

function saveGameResult() {
  const gameResult = {
    date: getTodayDate(),
    quizType: currentQuiz.type,
    correct: correctAnswers,
    incorrect: incorrectAnswers,
    total: correctAnswers + incorrectAnswers,
    timestamp: new Date().toISOString(),
  };

  let savedResults = getGameResultsFromStorage();

  // allow for replay - remove old.
  savedResults = savedResults.filter(
    (result) => result.quizType !== gameResult.quizType,
  );

  // Add new result
  savedResults.unshift(gameResult);
  saveGameResultsToStorage(savedResults);
  gameHistory = loadGameHistory();
}

function showMenu() {
  document.querySelector(".menu-screen").style.display = "flex";
  document.querySelector(".game-screen").style.display = "none";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".explanation-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "none";

  updateTodaysQuizButton();
}

function showArchive() {
  gameHistory = loadGameHistory();

  document.querySelector(".menu-screen").style.display = "none";
  document.querySelector(".game-screen").style.display = "none";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".explanation-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "block";

  populateArchive();
}

function showExplanation() {
  // clarity tracking
  if (typeof clarity !== "undefined") {
    clarity("event", "explanation_viewed", { quiz_type: currentQuiz.type });
  }

  document.querySelector(".menu-screen").style.display = "none";
  document.querySelector(".game-screen").style.display = "none";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".explanation-screen").style.display = "block";
  document.querySelector(".archive-screen").style.display = "none";

  populateExplanation();
}

function populateExplanation() {
  const questionElement = document.getElementById("explanation-question");
  const listElement = document.getElementById("explanation-list");

  questionElement.innerHTML = currentQuiz.question;

  listElement.innerHTML = "";

  if (playerAnswers.length === 0) {
    listElement.innerHTML =
      '<p style="opacity: 0.7; padding: 20px;">No answers to display.</p>';
    return;
  }

  playerAnswers.forEach((answer, index) => {
    const item = currentQuiz.items[index];
    const isCorrect = answer.userAnswer === item.correct;

    const domElement = document.createElement("div");
    domElement.className = isCorrect
      ? "explanation-item correct"
      : "explanation-item incorrect";

    const statusText = isCorrect ? "Correct" : "Incorrect";
    const statusClass = isCorrect ? "correct" : "incorrect";

    const userAnswerText = answer.userAnswer ? "YES" : "NO";
    const correctAnswerText = item.correct ? "YES" : "NO";

    domElement.innerHTML = `
      <div class="explanation-header">
        <div class="explanation-title-year">
          <div class="explanation-item-title">${item.title}</div>
          <div class="explanation-item-year">${item.year}</div>
        </div>
        <div class="explanation-status ${statusClass}">${statusText}</div>
      </div>
      <div class="explanation-your-answer">
        Your answer: ${userAnswerText} | Correct answer: ${correctAnswerText}
      </div>
    `;

    listElement.appendChild(domElement);
  });
}

function populateArchive() {
  const archiveList = document.getElementById("archive-list");
  archiveList.innerHTML = "";

  if (gameHistory.length === 0) {
    archiveList.innerHTML =
      '<p style="opacity: 0.7; padding: 20px;">No past quizzes found.</p>';
    return;
  }

  gameHistory.forEach((quiz) => {
    const item = document.createElement("div");
    item.className = quiz.played ? "archive-item played" : "archive-item";

    let scoreDisplay = "Click to play →";
    if (quiz.played) {
      scoreDisplay = `Score: ${quiz.score} (${quiz.accuracy}%)`;
    }

    item.innerHTML = `
            <div class="archive-date">${quiz.title}</div>
            <div class="archive-score">${scoreDisplay}</div>
        `;
    item.onclick = () => startArchiveQuiz(quiz.quizType);
    archiveList.appendChild(item);
  });
}

function startArchiveQuiz(quizType) {
  console.log('archive quiz starting...');
  let quiz = null;

  if (quizType === "today") {
    quiz = getTodaysQuiz();
  } else if (quizType === "yesterday") {
    quiz = getYesterdaysQuiz();
  } else if (quizType === "day-before-yesterday") {
    quiz = getDayBeforeYesterdaysQuiz();
  }

  if (!quiz) {
    alert("Quiz not available.");
    return;
  }

  // clarity tracking
  if (typeof clarity !== "undefined") {
    clarity("event", "archive_quiz_started", { quiz_type: quizType });
  }

  currentQuiz = { ...quiz, type: quizType };

  // Update question from JSON
  document.getElementById("quiz-question").innerHTML = currentQuiz.question;

  document.querySelector(".menu-screen").style.display = "none";
  document.querySelector(".game-screen").style.display = "block";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".explanation-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "none";

  // Reset game state
  currentCardIndex = 0;
  correctAnswers = 0;
  incorrectAnswers = 0;
  playerAnswers = [];

  loadCards();
}


function startTodaysQuiz() {
  console.log('starting today quiz...');
  const todaysQuiz = getTodaysQuiz();

  if (!todaysQuiz) {
    alert("No quiz available for today. Please check back later!");
    return;
  }

  console.log('GOOD: quiz loaded and startable. Today question: ', todaysQuiz.question);

  // clarity tracking
  if (typeof clarity !== "undefined") {
    clarity("event", "quiz_started", { quiz_type: "today" });
  }

  currentQuiz = { ...todaysQuiz, type: "today" };

  document.getElementById("quiz-question").innerHTML = currentQuiz.question;

  document.querySelector(".menu-screen").style.display = "none";
  document.querySelector(".game-screen").style.display = "block";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".explanation-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "none";

  // Reset game state
  currentCardIndex = 0;
  correctAnswers = 0;
  incorrectAnswers = 0;
  playerAnswers = []; // Reset player answers
  console.log('game reset. can be started again');
  loadCards();
}

function endGame() {
  // clarity tracking
  if (typeof clarity !== "undefined") {
    clarity("event", "quiz_completed", {
      quiz_type: currentQuiz.type,
      score: correctAnswers,
      total: correctAnswers + incorrectAnswers,
      accuracy: Math.round(
        (correctAnswers / (correctAnswers + incorrectAnswers)) * 100,
      ),
    });
  }

  saveGameResult();
  document.querySelector(".game-screen").style.display = "none";
  document.querySelector(".results-screen").style.display = "block";
  document.getElementById("correct-count").textContent = correctAnswers;
  document.getElementById("incorrect-count").textContent = incorrectAnswers;
}

function createCard(item, index) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.zIndex = currentQuiz.items.length - index;

  const hasImage = item.image && item.image.trim() !== "";

  if (hasImage) {
    card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" class="card-image">
        <div class="card-content">
            <h2 class="card-title">${item.title}</h2>
            <p class="card-year">${item.year}</p>
        </div>
    `;
  } else {
    card.classList.add("no-image");
    card.innerHTML = `
        <div class="card-content">
            <h2 class="card-title">${item.title}</h2>
            <p class="card-year">${item.year}</p>
        </div>
    `;
  }

  card.addEventListener("mousedown", handleStart);
  card.addEventListener("touchstart", handleStart);
  card.addEventListener("mousemove", handleMove);
  card.addEventListener("touchmove", handleMove);
  card.addEventListener("mouseup", handleEnd);
  card.addEventListener("touchend", handleEnd);
  card.addEventListener("mouseleave", handleEnd);

  return card;
}

function handleStart(e) {
  if (
    e.target.closest(".card") !==
    document.querySelector(".card-container .card")
  )
    return;

  isDragging = true;
  const card = e.target.closest(".card");
  card.classList.add("dragging");

  const clientX = e.clientX || e.touches[0].clientX;
  const clientY = e.clientY || e.touches[0].clientY;

  startX = clientX;
  startY = clientY;
  currentX = clientX;
  currentY = clientY;
}

function handleMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const clientX = e.clientX || e.touches[0].clientX;
  const clientY = e.clientY || e.touches[0].clientY;

  currentX = clientX;
  currentY = clientY;

  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  const card = document.querySelector(".card-container .card");
  const rotation = deltaX * 0.1;

  card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;

  // swipe hints showing
  const leftHint = document.querySelector(".swipe-hint.left");
  const rightHint = document.querySelector(".swipe-hint.right");

  if (deltaX < -50) {
    leftHint.classList.add("show");
    rightHint.classList.remove("show");
  } else if (deltaX > 50) {
    rightHint.classList.add("show");
    leftHint.classList.remove("show");
  } else {
    leftHint.classList.remove("show");
    rightHint.classList.remove("show");
  }
}

function handleEnd(e) {
  if (!isDragging) return;

  isDragging = false;
  const card = document.querySelector(".card-container .card");
  card.classList.remove("dragging");

  const deltaX = currentX - startX;
  const threshold = 100;

  // hide swipe hints when done
  document.querySelector(".swipe-hint.left").classList.remove("show");
  document.querySelector(".swipe-hint.right").classList.remove("show");

  if (Math.abs(deltaX) > threshold) {
    // swipe detected
    const isYes = deltaX > 0;
    console.log("swipe detected");
    answerQuestion(isYes);
  } else {
    card.style.transform = "";
  }
}

function loadCards() {
  console.log('loading cards...');
  if (!currentQuiz) return;

  console.log('total cards: ', currentQuiz.items.length);
  const container = document.querySelector(".card-container");
  // clearing cards
  const existingCards = container.querySelectorAll(".card");
  existingCards.forEach((card) => card.remove());

  // add cards
  for (let i = currentCardIndex; i < currentQuiz.items.length; i++) {
    const card = createCard(currentQuiz.items[i], i);
    container.appendChild(card);
  }
}

function answerQuestion(userAnswer) {
  if (!currentQuiz || currentCardIndex >= currentQuiz.items.length) return;

  const currentItem = currentQuiz.items[currentCardIndex];
  const isCorrect = userAnswer === currentItem.correct;

  // store answers
  playerAnswers.push({
    item: currentItem,
    userAnswer: userAnswer,
    isCorrect: isCorrect,
  });

  if (isCorrect) {
    correctAnswers++;
  } else {
    incorrectAnswers++;
  }

  // animation for card out
  const card = document.querySelector(".card-container .card");
  if (card) {
    const direction = userAnswer ? 1 : -1;
    card.style.transform = `translateX(${direction * 400}px) rotate(${direction * 30}deg)`;
    card.style.opacity = "0";

    setTimeout(() => {
      card.remove();
    }, 300);
  }

  currentCardIndex++;

  if (currentCardIndex >= currentQuiz.items.length) {
    setTimeout(endGame, 500);
  }
}


// showing play today's quiz only if it hasn't been played today yet. otherwise just show archive
function updateTodaysQuizButton() {
  const button = document.querySelector(".menu-option.primary");
  const todaysQuiz = getTodaysQuiz();

  // check if today quiz has been played
  const savedResults = getGameResultsFromStorage();
  const todayResultExists = savedResults.find(
    (result) => result.quizType === "today",
  );

  if (todayResultExists) {
    button.style.display = "none";
  } else {
    const todayDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    button.textContent = `Today's Quiz - ${todayDate}`;
    button.disabled = false;
    button.style.opacity = "1";
    button.style.cursor = "pointer";
    button.style.display = "block";
  }
}

// initialise game
async function initialiseGame() {
  console.log('initialising game...');
  await loadQuizData();
  gameHistory = loadGameHistory();

  updateTodaysQuizButton();
}

// start initialisation when page loads
window.addEventListener("DOMContentLoaded", initialiseGame);
