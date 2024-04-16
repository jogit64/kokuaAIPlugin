document.addEventListener("DOMContentLoaded", function () {
  var allButtons = document.querySelectorAll("button");
  var microButton = document.getElementById("assistant1a-record");
  var stopButton = document.getElementById("assistant1a-stop");
  var submitButton = document.getElementById("assistant1a-submit");
  var fileSubmitButton = document.getElementById("assistant1a-file-submit");
  var fileInput = document.getElementById("assistant1a-file");
  var questionInput = document.getElementById("assistant1a-question");
  var resetButton = document.getElementById("assistant1a-reset");
  var indicator = document.getElementById("assistant1a-file-upload-status");
  var selectedVoice;

  const consignes = {
    salarie: "Copiez et collez l'entretien ou importez un fichier (DOC, DOCX).",
    direction:
      "Copiez et collez l'entretien ou importez un fichier (DOC, DOCX).",
    document: "Importez le fichier (PDF) à analyser pour cette session.",
    mp3: "Utilisez l'importation de fichier pour partager l'enregistrement MP3 à transcrire.",
    discussion:
      "Utilisez cet espace pour discuter de la rédaction et de la structuration de votre rapport.",
  };

  const instructionDiv = document.getElementById("instructionText");

  var isRequestPending = false;

  var copyButton = document.getElementById("copyButton");
  var saveButton = document.getElementById("saveButton");

  if (copyButton && saveButton) {
    copyButton.addEventListener("click", copyChatHistory);
    saveButton.addEventListener("click", saveChatHistory);
  } else {
    console.error("Buttons not found");
  }

  const radios = document.querySelectorAll('.zone-radio input[type="radio"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", function () {
      radios.forEach((r) => r.parentNode.classList.remove("active"));
      if (radio.checked) {
        radio.parentNode.classList.add("active");
        instructionDiv.textContent = consignes[radio.value];
      }
    });
    if (radio.checked) {
      radio.parentNode.classList.add("active");
    }
    document
      .querySelector('.zone-radio input[type="radio"]:checked')
      .dispatchEvent(new Event("change"));
  });

  var cancelButton = document.createElement("button");
  cancelButton.textContent = "Annuler le choix du fichier";
  cancelButton.id = "assistant1a-cancel-file";
  cancelButton.className = "custom-button";
  cancelButton.style.display = "none";
  document.getElementById("assistant1a-file-section").appendChild(cancelButton);

  cancelButton.addEventListener("click", function () {
    fileInput.value = "";
    this.style.display = "none";
    setButtonStates();
  });

  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      cancelButton.style.display = "block";
      lastAction = "file";
      setButtonStates();
    }
  });

  function resetUI() {
    questionInput.value = "";
    fileInput.value = "";
    updateResponseContainer("");
    cancelButton.style.display = "none";
    lastAction = null;
    setButtonStates();
    resetSession();
    clearHistory();
  }

  function clearHistory() {
    var historyContainer = document.getElementById("assistant1a-history");
    historyContainer.innerHTML = "";
    historyContainer.style.display = "none";
  }

  function formatLists(text) {
    return text.replace(/^-\s(.*)/gm, "<ul><li>$1</li></ul>");
  }

  var historyContainer = document.getElementById("assistant1a-history");
  var isFirstExchange = true;
  var toggleHistoryCheckbox = document.getElementById("toggleHistoryCheckbox");

  historyContainer.style.display = toggleHistoryCheckbox.checked
    ? "block"
    : "none";

  toggleHistoryCheckbox.addEventListener("change", function () {
    historyContainer.style.display = this.checked ? "block" : "none";
  });

  function updateResponseContainer(content) {
    var formattedContent = formatLists(content);
    var responseContainer = document.getElementById("assistant1a-response");
    var questionText = document
      .getElementById("assistant1a-question")
      .value.trim();
    var actionsContainer = document.getElementById("response-actions");
    var historyContainer = document.getElementById("assistant1a-history");

    if (formattedContent.trim() !== "") {
      responseContainer.innerHTML = formattedContent;
      responseContainer.style.display = "block";
      actionsContainer.style.display = "block";
    } else {
      responseContainer.style.display = "none";
      actionsContainer.style.display = "none";
    }

    if (questionText && !isFirstExchange) {
      addHistoryEntry(questionText, "", "question");
    }

    if (formattedContent.trim() !== "" && !isFirstExchange) {
      addHistoryEntry("", formattedContent, "response");
    }

    isFirstExchange = false;
  }

  function addHistoryEntry(questionText, responseText, type) {
    var entry = document.createElement("p");
    entry.className = type;

    var prefix = document.createElement("span");
    prefix.className = "prefix";
    prefix.innerHTML = type === "question" ? "VOUS" : "ASSISTANT";

    var message = document.createElement("span");
    message.className = "message";
    message.innerHTML = type === "question" ? questionText : responseText;

    entry.appendChild(prefix);
    entry.appendChild(message);

    var historyContainer = document.getElementById("assistant1a-history");
    historyContainer.appendChild(entry);
    historyContainer.scrollTop = historyContainer.scrollHeight;
  }

  function setButtonStates() {
    let hasFile = fileInput.files.length > 0;
    let hasText = questionInput.value.trim().length > 0;
    let isSpeaking = synth.speaking;

    console.log(
      `hasFile: ${hasFile}, hasText: ${hasText}, isSpeaking: ${isSpeaking}, isRequestPending: ${isRequestPending}`
    );

    allButtons.forEach((btn) => (btn.disabled = true));

    if (!isRequestPending) {
      microButton.disabled = hasFile || isSpeaking;
      submitButton.disabled = hasFile || !hasText || isSpeaking;
      fileSubmitButton.disabled = !hasFile || isSpeaking;
      cancelButton.style.display = hasFile ? "block" : "none";
    }
    stopButton.disabled = !isSpeaking;
    resetButton.disabled = lastAction === null && !isSpeaking;

    var responseText = document.getElementById(
      "assistant1a-response"
    ).innerText;
    if (responseText.trim().length > 0) {
      copyButton.disabled = false;
      saveButton.disabled = false;
    }
  }

  questionInput.addEventListener("input", () => {
    lastAction = "text";
    setButtonStates();
  });

  resetButton.addEventListener("click", resetUI);

  function setLoadingState(isLoading) {
    isRequestPending = isLoading;
    indicator.style.display = isLoading ? "block" : "none";
    setButtonStates();
  }

  function sendRequest(isVoice = false) {
    if (isRequestPending) return;
    setLoadingState(true);

    var formData = new FormData();
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }
    if (questionInput.value.trim().length > 0) {
      formData.append("question", questionInput.value.trim());
    }

    const selectedConfig = document.querySelector(
      'input[name="config"]:checked'
    ).value;
    formData.append("config", selectedConfig);

    fetch("https://kokua060424-caea7e92447d.herokuapp.com/ask", {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        updateResponseContainer(data.response);
        if (isVoice) {
          speak(data.response);
        }
        if (!isVoice && fileInput.files.length > 0) {
          cancelButton.style.display = "none";
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(
          "Une erreur s'est produite lors de la communication avec le serveur. Veuillez réessayer."
        );
        updateResponseContainer("Erreur lors de la requête.");
      })
      .finally(() => {
        if (!isVoice) {
          questionInput.value = "";
        }
        setLoadingState(false);
      });
  }

  stopButton.addEventListener("click", function () {
    synth.cancel();
    questionInput.value = "";
    lastAction = "voice";
    setButtonStates();
    this.style.display = "none";
  });

  submitButton.addEventListener("click", () => sendRequest(false));

  fileSubmitButton.addEventListener("click", () => {
    sendRequest(false);
    fileInput.value = "";
    cancelButton.style.display = "none";
  });

  microButton.addEventListener("click", function () {
    this.classList.add("recording");
    recognition.start();
    stopButton.style.display = "block";
  });

  recognition.onresult = function (event) {
    var text = event.results[0][0].transcript;
    questionInput.value = text;
    sendRequest(true);
  };

  recognition.onend = function () {
    microButton.classList.remove("recording");
    setButtonStates();
  };

  synth.onvoiceschanged = function () {
    var voices = synth.getVoices();
  };

  synth.onend = function () {
    console.log("Speech synthesis has ended.");
    handleSpeechEnd();
  };

  function removeHtmlTags(text) {
    var doc = new DOMParser().parseFromString(text, "text/html");
    return doc.body.textContent || "";
  }

  function removeHtmlTags(text) {
    var doc = new DOMParser().parseFromString(text, "text/html");
    return doc.body.textContent || "";
  }

  function speak(text) {
    var cleanText = removeHtmlTags(text);
    var utterThis = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) {
      utterThis.voice = selectedVoice;
    }
    utterThis.onend = function () {
      console.log("Local speech synthesis has ended.");
      handleSpeechEnd();
    };
    synth.speak(utterThis);
  }

  function handleSpeechEnd() {
    console.log("Handling speech end, updating button states.");
    stopButton.style.display = "none";
    stopButton.disabled = true;
    microButton.disabled = false;
    questionInput.value = "";
  }

  function resetSession() {
    fetch("https://kokua060424-caea7e92447d.herokuapp.com/reset-session", {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          console.log("Session réinitialisée avec succès.");
        } else {
          console.error("Erreur lors de la réinitialisation de la session.");
        }
      })
      .catch((error) => console.error("Erreur:", error));
  }

  resetUI();
});
