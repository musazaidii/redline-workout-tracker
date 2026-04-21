const STORAGE_KEY = "redline-workout-tracker-v1";

const DEFAULT_SPLIT = [
  {
    id: "day-monday",
    name: "Monday",
    focus: "Chest / Triceps / Abs",
    exercises: [
      { id: "bench-press", name: "Bench Press" },
      { id: "incline-db-press", name: "Incline Dumbbell Press" },
      { id: "cable-fly", name: "Cable Fly" },
      { id: "tricep-pushdown", name: "Tricep Pushdown" },
      { id: "skull-crusher", name: "Skull Crusher" },
      { id: "cable-crunch", name: "Cable Crunch" },
    ],
  },
  {
    id: "day-tuesday",
    name: "Tuesday",
    focus: "Back / Biceps",
    exercises: [
      { id: "deadlift", name: "Deadlift" },
      { id: "lat-pulldown", name: "Lat Pulldown" },
      { id: "barbell-row", name: "Barbell Row" },
      { id: "db-curl", name: "Dumbbell Curl" },
      { id: "hammer-curl", name: "Hammer Curl" },
    ],
  },
  {
    id: "day-wednesday",
    name: "Wednesday",
    focus: "Abs / Legs",
    exercises: [
      { id: "back-squat", name: "Back Squat" },
      { id: "leg-press", name: "Leg Press" },
      { id: "romanian-deadlift", name: "Romanian Deadlift" },
      { id: "hanging-leg-raise", name: "Hanging Leg Raise" },
      { id: "plank", name: "Plank" },
    ],
  },
  {
    id: "day-thursday",
    name: "Thursday",
    focus: "Shoulders / Chest",
    exercises: [
      { id: "overhead-press", name: "Overhead Press" },
      { id: "lateral-raise", name: "Lateral Raise" },
      { id: "rear-delt-fly", name: "Rear Delt Fly" },
      { id: "incline-bench", name: "Incline Bench Press" },
    ],
  },
  {
    id: "day-friday",
    name: "Friday",
    focus: "Back / Biceps (Repeat) / Abs",
    exercises: [
      { id: "pull-up", name: "Pull-Up" },
      { id: "seated-row", name: "Seated Row" },
      { id: "ez-curl", name: "EZ Bar Curl" },
      { id: "preacher-curl", name: "Preacher Curl" },
      { id: "ab-wheel", name: "Ab Wheel" },
    ],
  },
  {
    id: "day-saturday",
    name: "Saturday",
    focus: "Shoulders / Triceps",
    exercises: [
      { id: "arnold-press", name: "Arnold Press" },
      { id: "cable-lateral-raise", name: "Cable Lateral Raise" },
      { id: "close-grip-bench", name: "Close Grip Bench Press" },
      { id: "overhead-tricep-ext", name: "Overhead Tricep Extension" },
    ],
  },
];

const summaryDays = document.querySelector("#summary-days");
const summaryExercises = document.querySelector("#summary-exercises");
const summaryLogs = document.querySelector("#summary-logs");
const summaryBest = document.querySelector("#summary-best");
const splitList = document.querySelector("#split-list");
const addDayForm = document.querySelector("#add-day-form");
const logForm = document.querySelector("#log-form");
const daySelect = document.querySelector("#day-select");
const exerciseSelect = document.querySelector("#exercise-select");
const unitSelect = document.querySelector("#unit-select");
const monthPicker = document.querySelector("#month-picker");
const chartExerciseSelect = document.querySelector("#chart-exercise-select");
const historyTableBody = document.querySelector("#history-table-body");
const progressTableBody = document.querySelector("#progress-table-body");
const liftHint = document.querySelector("#lift-hint");
const metricDays = document.querySelector("#metric-days");
const metricActive = document.querySelector("#metric-active");
const metricImproved = document.querySelector("#metric-improved");
const metricJump = document.querySelector("#metric-jump");
const progressChart = document.querySelector("#progress-chart");
const chartTitle = document.querySelector("#chart-title");
const chartSubtitle = document.querySelector("#chart-subtitle");
const installButton = document.querySelector("#install-button");
const installCopy = document.querySelector("#install-copy");

const state = loadState();
let deferredInstallPrompt = null;

init();

function init() {
  logForm.elements.date.value = todayString();
  unitSelect.value = state.settings.unit;
  monthPicker.value = state.analytics.month;

  bindEvents();
  registerAppShell();
  renderAll();
  updateInstallUI();
}

function bindEvents() {
  addDayForm.addEventListener("submit", handleAddDay);
  logForm.addEventListener("submit", handleLogSubmit);

  splitList.addEventListener("submit", handleSplitSubmit);
  splitList.addEventListener("click", handleSplitClick);
  splitList.addEventListener("change", handleSplitChange);

  historyTableBody.addEventListener("click", handleHistoryClick);

  daySelect.addEventListener("change", () => {
    syncExerciseOptions();
    renderLiftHint();
  });

  exerciseSelect.addEventListener("change", renderLiftHint);

  unitSelect.addEventListener("change", () => {
    state.settings.unit = unitSelect.value;
    saveState();
    renderAll();
  });

  monthPicker.addEventListener("change", () => {
    state.analytics.month = monthPicker.value || currentMonth();
    saveState();
    renderAnalytics();
  });

  chartExerciseSelect.addEventListener("change", () => {
    state.analytics.exerciseId = chartExerciseSelect.value;
    saveState();
    renderChart();
  });

  if (installButton) {
    installButton.addEventListener("click", handleInstallClick);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallUI();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallUI();
  });
}

function handleAddDay(event) {
  event.preventDefault();

  const dayName = event.currentTarget.dayName.value.trim();
  const focus = event.currentTarget.focus.value.trim();

  if (!dayName || !focus) {
    return;
  }

  state.split.push({
    id: createId("day"),
    name: dayName,
    focus,
    exercises: [],
  });

  event.currentTarget.reset();
  saveState();
  renderAll();
}

function handleSplitSubmit(event) {
  event.preventDefault();

  const form = event.target;
  if (form.dataset.form !== "add-exercise") {
    return;
  }

  const day = findDay(form.dataset.dayId);
  const exerciseName = form.exerciseName.value.trim();

  if (!day || !exerciseName) {
    return;
  }

  day.exercises.push({
    id: createId("exercise"),
    name: exerciseName,
  });

  form.reset();
  saveState();
  renderAll();
}

function handleSplitClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const dayId = button.dataset.dayId;
  const exerciseId = button.dataset.exerciseId;

  if (action === "remove-day") {
    state.split = state.split.filter((day) => day.id !== dayId);
  }

  if (action === "remove-exercise") {
    const day = findDay(dayId);
    if (day) {
      day.exercises = day.exercises.filter((exercise) => exercise.id !== exerciseId);
    }
  }

  saveState();
  renderAll();
}

function handleSplitChange(event) {
  const target = event.target;
  const dayId = target.dataset.dayId;
  const exerciseId = target.dataset.exerciseId;
  const field = target.dataset.field;
  const value = target.value.trim();

  if (!field) {
    return;
  }

  if (field === "day-name" || field === "day-focus") {
    const day = findDay(dayId);
    if (!day) {
      return;
    }

    if (field === "day-name" && value) {
      day.name = value;
    }

    if (field === "day-focus" && value) {
      day.focus = value;
    }
  }

  if (field === "exercise-name") {
    const day = findDay(dayId);
    const exercise = day?.exercises.find((item) => item.id === exerciseId);
    if (exercise && value) {
      exercise.name = value;
    }
  }

  saveState();
  renderAll();
}

function handleLogSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const dayId = form.dayId.value;
  const exerciseId = form.exerciseId.value;
  const date = form.date.value;
  const weight = Number.parseFloat(form.weight.value);
  const reps = form.reps.value ? Number.parseInt(form.reps.value, 10) : null;
  const notes = form.notes.value.trim();

  if (!dayId || !exerciseId || !date || Number.isNaN(weight)) {
    return;
  }

  const day = findDay(dayId);
  const exercise = day?.exercises.find((item) => item.id === exerciseId);

  state.logs.push({
    id: createId("log"),
    createdAt: new Date().toISOString(),
    date,
    dayId,
    exerciseId,
    dayName: day?.name || "Unknown day",
    exerciseName: exercise?.name || "Unknown exercise",
    weight,
    reps,
    notes,
  });

  const preservedDay = dayId;
  const preservedExercise = exerciseId;

  form.reset();
  form.date.value = todayString();
  unitSelect.value = state.settings.unit;

  saveState();
  renderAll();

  daySelect.value = preservedDay;
  syncExerciseOptions();
  exerciseSelect.value = preservedExercise;
  renderLiftHint();
}

function handleHistoryClick(event) {
  const button = event.target.closest("button[data-log-id]");
  if (!button) {
    return;
  }

  state.logs = state.logs.filter((log) => log.id !== button.dataset.logId);
  saveState();
  renderAll();
}

function renderAll() {
  renderSummary();
  renderSplit();
  syncDayOptions();
  syncExerciseOptions();
  renderHistory();
  renderAnalytics();
  renderLiftHint();
}

function renderSummary() {
  const monthLogs = logsInMonth(state.analytics.month);
  const dayCount = state.split.length;
  const exerciseCount = state.split.reduce(
    (total, day) => total + day.exercises.length,
    0
  );
  const best = monthLogs.length ? Math.max(...monthLogs.map((log) => log.weight)) : 0;

  summaryDays.textContent = String(dayCount);
  summaryExercises.textContent = String(exerciseCount);
  summaryLogs.textContent = String(monthLogs.length);
  summaryBest.textContent = `${formatWeight(best)} ${state.settings.unit}`;
}

function renderSplit() {
  if (!state.split.length) {
    splitList.innerHTML =
      '<div class="day-card"><p class="empty-exercise">No days yet. Add a day to start your split.</p></div>';
    return;
  }

  splitList.innerHTML = state.split
    .map((day) => {
      const exercisesMarkup = day.exercises.length
        ? day.exercises
            .map(
              (exercise) => `
                <li class="exercise-row">
                  <input
                    type="text"
                    value="${escapeHtml(exercise.name)}"
                    data-field="exercise-name"
                    data-day-id="${day.id}"
                    data-exercise-id="${exercise.id}"
                    maxlength="48"
                  />
                  <button
                    type="button"
                    class="icon-button danger-button"
                    data-action="remove-exercise"
                    data-day-id="${day.id}"
                    data-exercise-id="${exercise.id}"
                  >
                    Remove
                  </button>
                </li>
              `
            )
            .join("")
        : '<li class="empty-exercise">No exercises yet. Add one below.</li>';

      return `
        <article class="day-card">
          <div class="day-top">
            <div>
              <p class="section-kicker">Training Day</p>
              <h3>${escapeHtml(day.name)}</h3>
            </div>
            <button
              type="button"
              class="icon-button danger-button"
              data-action="remove-day"
              data-day-id="${day.id}"
            >
              Delete Day
            </button>
          </div>

          <div class="mini-form">
            <label>
              Day Name
              <input
                type="text"
                value="${escapeHtml(day.name)}"
                data-field="day-name"
                data-day-id="${day.id}"
                maxlength="24"
              />
            </label>

            <label>
              Focus
              <input
                type="text"
                value="${escapeHtml(day.focus)}"
                data-field="day-focus"
                data-day-id="${day.id}"
                maxlength="60"
              />
            </label>
          </div>

          <ul class="exercise-list">${exercisesMarkup}</ul>

          <form class="inline-form" data-form="add-exercise" data-day-id="${day.id}">
            <label>
              New Exercise
              <input
                type="text"
                name="exerciseName"
                placeholder="Add an exercise"
                maxlength="48"
                required
              />
            </label>
            <button type="submit">Add Exercise</button>
          </form>
        </article>
      `;
    })
    .join("");
}

function syncDayOptions() {
  const previousValue = daySelect.value;

  daySelect.innerHTML = state.split.length
    ? state.split
        .map(
          (day) =>
            `<option value="${day.id}">${escapeHtml(day.name)} - ${escapeHtml(
              day.focus
            )}</option>`
        )
        .join("")
    : '<option value="">No days available</option>';

  const validDay = state.split.some((day) => day.id === previousValue)
    ? previousValue
    : state.split[0]?.id || "";

  daySelect.value = validDay;
}

function syncExerciseOptions() {
  const previousValue = exerciseSelect.value;
  const currentDay = findDay(daySelect.value);

  if (!currentDay || !currentDay.exercises.length) {
    exerciseSelect.innerHTML = '<option value="">No exercises available</option>';
    exerciseSelect.disabled = true;
    return;
  }

  exerciseSelect.disabled = false;
  exerciseSelect.innerHTML = currentDay.exercises
    .map(
      (exercise) =>
        `<option value="${exercise.id}">${escapeHtml(exercise.name)}</option>`
    )
    .join("");

  const validExercise = currentDay.exercises.some(
    (exercise) => exercise.id === previousValue
  )
    ? previousValue
    : currentDay.exercises[0].id;

  exerciseSelect.value = validExercise;
}

function renderHistory() {
  const logs = [...state.logs].sort(compareLogsDesc).slice(0, 18);

  if (!logs.length) {
    historyTableBody.innerHTML =
      '<tr><td colspan="6" class="table-empty">No lifts logged yet. Add your first entry above.</td></tr>';
    return;
  }

  historyTableBody.innerHTML = logs
    .map((log) => {
      const repsText = log.reps ? String(log.reps) : "-";
      const notesText = log.notes ? escapeHtml(log.notes) : '<span class="muted">-</span>';
      const exerciseName = escapeHtml(getExerciseName(log.exerciseId, log.exerciseName));

      return `
        <tr>
          <td data-label="Date">${formatDisplayDate(log.date)}</td>
          <td data-label="Exercise">${exerciseName}</td>
          <td data-label="Weight">${formatWeight(log.weight)} ${state.settings.unit}</td>
          <td data-label="Reps">${repsText}</td>
          <td data-label="Notes">${notesText}</td>
          <td data-label="Action">
            <button type="button" class="icon-button danger-button" data-log-id="${log.id}">
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAnalytics() {
  const month = monthPicker.value || state.analytics.month;
  state.analytics.month = month;

  const monthLogs = logsInMonth(month);
  const uniqueDays = new Set(monthLogs.map((log) => log.date)).size;
  const currentMonthSummaries = buildExerciseSummaries(month);
  const improvedCount = currentMonthSummaries.filter(
    (item) => item.deltaWithinMonth !== null && item.deltaWithinMonth > 0
  ).length;
  const biggestJumpValue = currentMonthSummaries.reduce((best, item) => {
    if (item.deltaWithinMonth === null) {
      return best;
    }

    return item.deltaWithinMonth > best ? item.deltaWithinMonth : best;
  }, 0);

  metricDays.textContent = String(uniqueDays);
  metricActive.textContent = String(
    currentMonthSummaries.filter((item) => item.entries > 0).length
  );
  metricImproved.textContent = String(improvedCount);
  metricJump.textContent = `${formatWeight(biggestJumpValue)} ${state.settings.unit}`;

  renderProgressTable(currentMonthSummaries);
  syncChartExerciseOptions(currentMonthSummaries);
  renderChart();
  saveState();
}

function renderProgressTable(rows) {
  const activeRows = rows.filter((row) => row.entries > 0 || row.prevMax !== null);

  if (!activeRows.length) {
    progressTableBody.innerHTML =
      '<tr><td colspan="6" class="table-empty">No progress for this month yet. Log some lifts to see your trend.</td></tr>';
    return;
  }

  progressTableBody.innerHTML = activeRows
    .map((row) => {
      const changeText = formatDelta(row.deltaVsLastMonth);
      const changeClass =
        row.deltaVsLastMonth === null
          ? "muted"
          : row.deltaVsLastMonth >= 0
            ? "delta-up"
            : "delta-down";

      return `
        <tr>
          <td data-label="Exercise">${escapeHtml(row.name)}</td>
          <td data-label="Start">${formatNullableWeight(row.start)}</td>
          <td data-label="Latest">${formatNullableWeight(row.latest)}</td>
          <td data-label="Best">${formatNullableWeight(row.best)}</td>
          <td data-label="Vs Last Month" class="${changeClass}">${changeText}</td>
          <td data-label="Entries">${row.entries}</td>
        </tr>
      `;
    })
    .join("");
}

function syncChartExerciseOptions(rows) {
  const activeRows = rows.filter((row) => row.entries > 0);

  if (!activeRows.length) {
    chartExerciseSelect.innerHTML = '<option value="">No exercise data</option>';
    chartExerciseSelect.disabled = true;
    state.analytics.exerciseId = "";
    return;
  }

  chartExerciseSelect.disabled = false;
  chartExerciseSelect.innerHTML = activeRows
    .map(
      (row) =>
        `<option value="${row.id}">${escapeHtml(row.name)}</option>`
    )
    .join("");

  const hasExisting = activeRows.some((row) => row.id === state.analytics.exerciseId);
  state.analytics.exerciseId = hasExisting
    ? state.analytics.exerciseId
    : activeRows[0].id;

  chartExerciseSelect.value = state.analytics.exerciseId;
}

function renderChart() {
  const exerciseId = chartExerciseSelect.value;
  const month = state.analytics.month;
  const exerciseName = getExerciseName(exerciseId, "Progress Trend");
  const monthLogs = logsInMonth(month)
    .filter((log) => log.exerciseId === exerciseId)
    .sort(compareLogsAsc);

  chartTitle.textContent = exerciseId ? `${exerciseName} Trend` : "Progress Trend";

  if (!exerciseId || !monthLogs.length) {
    chartSubtitle.textContent = "Select an exercise to see your monthly line.";
    progressChart.innerHTML = `
      <rect x="20" y="20" width="600" height="240" rx="18" fill="rgba(255,255,255,0.03)"></rect>
      <text x="320" y="146" text-anchor="middle" fill="#c7beb5" font-size="18">
        No entries for this exercise in this month yet.
      </text>
    `;
    return;
  }

  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const weights = monthLogs.map((log) => log.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const flatLine = minWeight === maxWeight;
  const displayRange = flatLine ? Math.max(minWeight * 0.1, 2) : maxWeight - minWeight;
  const chartMin = flatLine ? Math.max(0, minWeight - displayRange / 2) : minWeight;
  const chartMax = flatLine ? maxWeight + displayRange / 2 : maxWeight;
  const pad = { top: 24, right: 28, bottom: 36, left: 48 };
  const width = 640;
  const height = 280;
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const points = monthLogs.map((log) => {
    const dayNumber = Number.parseInt(log.date.slice(8, 10), 10);
    const x = pad.left + ((dayNumber - 1) / Math.max(daysInMonth - 1, 1)) * plotWidth;
    const y =
      pad.top +
      plotHeight -
      ((log.weight - chartMin) / (chartMax - chartMin)) * plotHeight;
    return {
      x,
      y,
      label: `${dayNumber}`,
      weight: log.weight,
    };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const y = pad.top + ratio * plotHeight;
    const value = chartMax - ratio * (chartMax - chartMin);
    return `
      <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 8"></line>
      <text x="${pad.left - 12}" y="${y + 4}" text-anchor="end" fill="#c7beb5" font-size="12">${formatWeight(
        value
      )}</text>
    `;
  }).join("");

  const dots = points
    .map(
      (point) => `
        <circle cx="${point.x}" cy="${point.y}" r="6" fill="#ff5544" stroke="#fff" stroke-width="2"></circle>
        <text x="${point.x}" y="${point.y - 14}" text-anchor="middle" fill="#fff" font-size="12">${formatWeight(
          point.weight
        )}</text>
      `
    )
    .join("");

  progressChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="22" fill="rgba(255,255,255,0.02)"></rect>
    ${gridLines}
    <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="rgba(255,255,255,0.12)"></line>
    <polyline fill="none" stroke="#ff2d20" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
    ${dots}
    <text x="${pad.left}" y="${height - 10}" fill="#c7beb5" font-size="12">Day 1</text>
    <text x="${width - pad.right}" y="${height - 10}" text-anchor="end" fill="#c7beb5" font-size="12">Day ${daysInMonth}</text>
  `;

  chartSubtitle.textContent = `Tracked ${monthLogs.length} entries for ${exerciseName} in ${formatMonth(
    month
  )}.`;
}

function renderLiftHint() {
  const exerciseId = exerciseSelect.value;

  if (!exerciseId) {
    liftHint.innerHTML =
      "Add an exercise to the selected day, then come back here to start logging.";
    return;
  }

  const logs = state.logs
    .filter((log) => log.exerciseId === exerciseId)
    .sort(compareLogsDesc);

  if (!logs.length) {
    const exerciseName = getExerciseName(exerciseId, "This exercise");
    liftHint.innerHTML = `<strong>${escapeHtml(
      exerciseName
    )}</strong> has no saved entries yet. Log your first weight to start tracking progress.`;
    return;
  }

  const latest = logs[0];
  const monthlyBest = Math.max(...logs.map((log) => log.weight));

  liftHint.innerHTML = `
    <strong>Last lift:</strong> ${escapeHtml(
      getExerciseName(exerciseId, latest.exerciseName)
    )} was ${formatWeight(latest.weight)} ${state.settings.unit} on ${formatDisplayDate(
      latest.date
    )}.
    Best saved weight so far is <strong>${formatWeight(monthlyBest)} ${state.settings.unit}</strong>.
  `;
}

function buildExerciseSummaries(month) {
  const previousMonth = shiftMonth(month, -1);
  const allIds = new Set([
    ...state.split.flatMap((day) => day.exercises.map((exercise) => exercise.id)),
    ...state.logs.map((log) => log.exerciseId),
  ]);

  return [...allIds]
    .map((exerciseId) => {
      const currentLogs = logsInMonth(month)
        .filter((log) => log.exerciseId === exerciseId)
        .sort(compareLogsAsc);
      const previousLogs = logsInMonth(previousMonth).filter(
        (log) => log.exerciseId === exerciseId
      );

      const start = currentLogs[0]?.weight ?? null;
      const latest = currentLogs[currentLogs.length - 1]?.weight ?? null;
      const best = currentLogs.length
        ? Math.max(...currentLogs.map((log) => log.weight))
        : null;
      const prevMax = previousLogs.length
        ? Math.max(...previousLogs.map((log) => log.weight))
        : null;

      return {
        id: exerciseId,
        name: getExerciseName(
          exerciseId,
          currentLogs[currentLogs.length - 1]?.exerciseName ||
            previousLogs[previousLogs.length - 1]?.exerciseName
        ),
        start,
        latest,
        best,
        prevMax,
        entries: currentLogs.length,
        deltaWithinMonth:
          start !== null && latest !== null ? latest - start : null,
        deltaVsLastMonth:
          best !== null && prevMax !== null ? best - prevMax : null,
      };
    })
    .sort((left, right) => {
      if (right.entries !== left.entries) {
        return right.entries - left.entries;
      }

      if ((right.best ?? -1) !== (left.best ?? -1)) {
        return (right.best ?? -1) - (left.best ?? -1);
      }

      return left.name.localeCompare(right.name);
    });
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return normalizeState(raw);
  } catch (error) {
    return normalizeState({});
  }
}

function normalizeState(raw) {
  const split =
    Array.isArray(raw.split) && raw.split.length
      ? raw.split.map(normalizeDay).filter(Boolean)
      : DEFAULT_SPLIT.map((day) => ({
          ...day,
          exercises: day.exercises.map((exercise) => ({ ...exercise })),
        }));

  const logs = Array.isArray(raw.logs)
    ? raw.logs
        .map(normalizeLog)
        .filter((log) => log && typeof log.weight === "number")
    : [];

  return {
    split,
    logs,
    settings: {
      unit: raw?.settings?.unit === "lb" ? "lb" : "kg",
    },
    analytics: {
      month: isValidMonth(raw?.analytics?.month)
        ? raw.analytics.month
        : currentMonth(),
      exerciseId:
        typeof raw?.analytics?.exerciseId === "string"
          ? raw.analytics.exerciseId
          : "",
    },
  };
}

function normalizeDay(day) {
  if (!day || typeof day !== "object") {
    return null;
  }

  return {
    id: String(day.id || createId("day")),
    name: String(day.name || "Training Day"),
    focus: String(day.focus || "Workout Focus"),
    exercises: Array.isArray(day.exercises)
      ? day.exercises
          .map((exercise) =>
            exercise
              ? {
                  id: String(exercise.id || createId("exercise")),
                  name: String(exercise.name || "Exercise"),
                }
              : null
          )
          .filter(Boolean)
      : [],
  };
}

function normalizeLog(log) {
  if (!log || typeof log !== "object") {
    return null;
  }

  const weight = Number.parseFloat(log.weight);
  if (Number.isNaN(weight)) {
    return null;
  }

  return {
    id: String(log.id || createId("log")),
    createdAt: String(log.createdAt || new Date().toISOString()),
    date: String(log.date || todayString()),
    dayId: String(log.dayId || ""),
    exerciseId: String(log.exerciseId || ""),
    dayName: String(log.dayName || "Unknown day"),
    exerciseName: String(log.exerciseName || "Unknown exercise"),
    weight,
    reps: log.reps ? Number.parseInt(log.reps, 10) : null,
    notes: String(log.notes || ""),
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Workout tracker could not save to local storage.", error);
  }
}

function registerAppShell() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (!window.isSecureContext) {
    return;
  }

  navigator.serviceWorker.register("service-worker.js").catch((error) => {
    console.warn("Service worker registration failed.", error);
  });
}

async function handleInstallClick() {
  if (!deferredInstallPrompt) {
    updateInstallUI();
    return;
  }

  deferredInstallPrompt.prompt();

  try {
    await deferredInstallPrompt.userChoice;
  } finally {
    deferredInstallPrompt = null;
    updateInstallUI();
  }
}

function updateInstallUI() {
  if (!installButton || !installCopy) {
    return;
  }

  document.body.classList.toggle("app-standalone", isStandaloneMode());

  if (isStandaloneMode()) {
    installButton.hidden = true;
    installCopy.textContent =
      "Installed on this device. Your logs stay saved here and the app works offline.";
    return;
  }

  if (deferredInstallPrompt) {
    installButton.hidden = false;
    installCopy.textContent =
      "Tap Install App to save this tracker on your home screen.";
    return;
  }

  installButton.hidden = true;

  if (window.location.protocol === "file:") {
    installCopy.textContent =
      "To install this on your phone, host these files first, then open the link on your phone.";
    return;
  }

  if (isIOS()) {
    installCopy.textContent =
      "On iPhone, open this in Safari, tap Share, then choose Add to Home Screen.";
    return;
  }

  installCopy.textContent =
    "Open this link in your phone browser, then add it to your home screen.";
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function findDay(dayId) {
  return state.split.find((day) => day.id === dayId);
}

function getExerciseName(exerciseId, fallback = "Unknown exercise") {
  for (const day of state.split) {
    const match = day.exercises.find((exercise) => exercise.id === exerciseId);
    if (match) {
      return match.name;
    }
  }

  return fallback;
}

function logsInMonth(month) {
  return state.logs.filter((log) => log.date.slice(0, 7) === month);
}

function compareLogsAsc(left, right) {
  return `${left.date}-${left.createdAt}`.localeCompare(`${right.date}-${right.createdAt}`);
}

function compareLogsDesc(left, right) {
  return `${right.date}-${right.createdAt}`.localeCompare(`${left.date}-${left.createdAt}`);
}

function formatWeight(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatNullableWeight(value) {
  return value === null ? '<span class="muted">-</span>' : `${formatWeight(value)} ${state.settings.unit}`;
}

function formatDelta(value) {
  if (value === null) {
    return "No comparison";
  }

  if (value === 0) {
    return `0 ${state.settings.unit}`;
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${formatWeight(value)} ${state.settings.unit}`;
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMonth(month) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function currentMonth() {
  return todayString().slice(0, 7);
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(month, delta) {
  const [year, monthIndex] = month.split("-").map(Number);
  const shifted = new Date(year, monthIndex - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonth(value) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// state.logs = state.logs.filter((log) => log.id !== button.dataset.logId);
// if (confirm("Delete this log?")) {
//   state.logs = state.logs.filter((log) => log.id !== button.dataset.logId);
// }
// if (exerciseName.length < 2) {
//   alert("Exercise name too short");
//   return;
// }
// function toggleTheme() {
//   document.body.classList.toggle("light");
// }