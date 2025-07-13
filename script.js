// Quiz database will be loaded from JSON file
let quizDatabase = {};
let currentQuiz = null;

let currentCardIndex = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let gameTimer;
let timeRemaining = 116; // 1:56 in seconds
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let gameHistory = [];

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// Get today's quiz
function getTodaysQuiz() {
  return quizDatabase["today"] || null;
}

// Check if today's quiz is available
function isTodaysQuizAvailable() {
  return getTodaysQuiz() !== null;
}

// Get game results from localStorage
function getGameResultsFromStorage() {
  try {
    const saved = localStorage.getItem("artQuizResults");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Error loading game results from localStorage:", error);
    return [];
  }
}

// Save game results to localStorage
function saveGameResultsToStorage(results) {
  try {
    localStorage.setItem("artQuizResults", JSON.stringify(results));
  } catch (error) {
    console.error("Error saving game results to localStorage:", error);
  }
}

// Load quiz data from JSON file
async function loadQuizData() {
  try {
    const response = await fetch("quiz-data.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    quizDatabase = await response.json();
    console.log("Quiz data loaded successfully");
  } catch (error) {
    console.error("Error loading quiz data:", error);
    // Fallback to empty database if file can't be loaded
    quizDatabase = {};
  }
}

// Load game history from localStorage
function loadGameHistory() {
  // Get all available quiz dates from the database and sort them
  const availableDates = Object.keys(quizDatabase).sort().reverse();
  const todayString = getTodayDate();

  // Filter to only show dates from today and earlier (no future dates)
  const pastAndTodayDates = availableDates.filter(
    (date) => date <= todayString,
  );

  // Get saved results from localStorage
  const savedResults = getGameResultsFromStorage();

  return pastAndTodayDates.map((date) => {
    const savedResult = savedResults.find((result) => result.date === date);
    return {
      date: date,
      title: formatDateForDisplay(date),
      available: true,
      played: !!savedResult,
      score: savedResult ? `${savedResult.correct}/${savedResult.total}` : null,
      accuracy: savedResult
        ? Math.round((savedResult.correct / savedResult.total) * 100)
        : null,
    };
  });
}

// Format date for display (e.g., "2025-06-15" -> "June 15th Quiz")
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

  return (
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    }) + " Quiz"
  );
}

function saveGameResult() {
  const todayDate = getTodayDate();
  const gameResult = {
    date: todayDate,
    correct: correctAnswers,
    incorrect: incorrectAnswers,
    total: correctAnswers + incorrectAnswers,
    timestamp: new Date().toISOString(),
  };

  // Get existing results
  let savedResults = getGameResultsFromStorage();

  // Remove any existing result for today (in case they replay)
  savedResults = savedResults.filter((result) => result.date !== todayDate);

  // Add new result
  savedResults.unshift(gameResult);

  // Keep only the last 30 results to avoid localStorage getting too large
  savedResults = savedResults.slice(0, 30);

  // Save to localStorage
  saveGameResultsToStorage(savedResults);

  // Update the game history for display
  gameHistory = loadGameHistory();
}

function showMenu() {
  document.querySelector(".menu-screen").style.display = "flex";
  document.querySelector(".game-screen").style.display = "none";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "none";
}

function showArchive() {
  gameHistory = loadGameHistory();

  document.querySelector(".menu-screen").style.display = "none";
  document.querySelector(".game-screen").style.display = "none";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "block";

  populateArchive();
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
    item.className = "archive-item";

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

function startArchiveQuiz(quizDate) {
  if (!quizDatabase[quizDate]) {
    alert("Quiz not available for this date.");
    return;
  }

  currentQuiz = quizDatabase[quizDate];

  // Update question from JSON
  document.getElementById("quiz-question").innerHTML = currentQuiz.question;

  document.querySelector(".menu-screen").style.display = "none";
  document.querySelector(".game-screen").style.display = "block";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "none";

  // Reset game state
  currentCardIndex = 0;
  correctAnswers = 0;
  incorrectAnswers = 0;
  timeRemaining = 116;

  loadCards();
  startTimer();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateString === today.toISOString().split("T")[0]) {
    return "Today";
  } else if (dateString === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

function showGameDetails(game) {
  alert(
    `Quiz from ${formatDate(game.date)}\n\nScore: ${game.correct}/${game.total} correct\nAccuracy: ${Math.round((game.correct / game.total) * 100)}%`,
  );
}

function startTodaysQuiz() {
  const todaysQuiz = getTodaysQuiz();

  if (!todaysQuiz) {
    alert(
      `No quiz available for today (${getTodayDate()}). Please check back later!`,
    );
    return;
  }

  currentQuiz = todaysQuiz;

  // Update question from JSON
  document.getElementById("quiz-question").innerHTML = currentQuiz.question;

  document.querySelector(".menu-screen").style.display = "none";
  document.querySelector(".game-screen").style.display = "block";
  document.querySelector(".results-screen").style.display = "none";
  document.querySelector(".archive-screen").style.display = "none";

  // Reset game state
  currentCardIndex = 0;
  correctAnswers = 0;
  incorrectAnswers = 0;
  timeRemaining = 116;

  loadCards();
  startTimer();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function updateTimer() {
  document.querySelector(".timer").textContent = formatTime(timeRemaining);
  if (timeRemaining <= 0) {
    endGame();
  } else {
    timeRemaining--;
  }
}

function createCard(artwork, index) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.zIndex = currentQuiz.artworks.length - index;
  card.innerHTML = `
        <img src="${artwork.image}" alt="${artwork.title}" class="card-image">
        <h2 class="card-title">${artwork.title}</h2>
        <p class="card-year">${artwork.year}</p>
    `;

  // Add touch and mouse event listeners for swiping
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

  // Show swipe hints
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

  // Hide swipe hints
  document.querySelector(".swipe-hint.left").classList.remove("show");
  document.querySelector(".swipe-hint.right").classList.remove("show");

  if (Math.abs(deltaX) > threshold) {
    // Swipe detected
    const isYes = deltaX > 0;
    answerQuestion(isYes);
  } else {
    // Snap back
    card.style.transform = "";
  }
}

function loadCards() {
  if (!currentQuiz) return;

  const container = document.querySelector(".card-container");
  // Clear existing cards
  const existingCards = container.querySelectorAll(".card");
  existingCards.forEach((card) => card.remove());

  // Add all remaining cards
  for (let i = currentCardIndex; i < currentQuiz.artworks.length; i++) {
    const card = createCard(currentQuiz.artworks[i], i);
    container.appendChild(card);
  }
}

function answerQuestion(userAnswer) {
  if (!currentQuiz || currentCardIndex >= currentQuiz.artworks.length) return;

  const currentArtwork = currentQuiz.artworks[currentCardIndex];
  const isCorrect = userAnswer === currentArtwork.correct;

  if (isCorrect) {
    correctAnswers++;
  } else {
    incorrectAnswers++;
  }

  // Animate card out
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

  if (currentCardIndex >= currentQuiz.artworks.length) {
    setTimeout(endGame, 500);
  }
}

function endGame() {
  clearInterval(gameTimer);
  saveGameResult();
  document.querySelector(".game-screen").style.display = "none";
  document.querySelector(".results-screen").style.display = "block";
  document.getElementById("correct-count").textContent = correctAnswers;
  document.getElementById("incorrect-count").textContent = incorrectAnswers;
}

function restartGame() {
  startTodaysQuiz();
}

function startTimer() {
  gameTimer = setInterval(updateTimer, 1000);
}

// Update the Today's Quiz button based on availability
function updateTodaysQuizButton() {
  const button = document.querySelector(".menu-option.primary");
  const todaysQuiz = getTodaysQuiz();

  if (todaysQuiz) {
    const todayDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    button.textContent = `Today's Quiz - ${todayDate}`;
    button.disabled = false;
    button.style.opacity = "1";
    button.style.cursor = "pointer";
  } else {
    button.textContent = "No Quiz Today";
    button.disabled = true;
    button.style.opacity = "0.5";
    button.style.cursor = "not-allowed";
  }
}

// Initialize game - load quiz data and show menu
async function initializeGame() {
  await loadQuizData();
  gameHistory = loadGameHistory();

  // Update the "Today's Quiz" button based on availability
  updateTodaysQuizButton();
}

// Start initialization when page loads
window.addEventListener("DOMContentLoaded", initializeGame);
