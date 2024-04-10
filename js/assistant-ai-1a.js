document.addEventListener("DOMContentLoaded", function () {
  var allButtons = document.querySelectorAll("button");
  var microButton = document.getElementById("assistant1a-record");
  stopButton = document.getElementById("assistant1a-stop");
  var submitButton = document.getElementById("assistant1a-submit");
  var fileSubmitButton = document.getElementById("assistant1a-file-submit");
  var fileInput = document.getElementById("assistant1a-file");
  var questionInput = document.getElementById("assistant1a-question");
  var resetButton = document.getElementById("assistant1a-reset");
  var indicator = document.getElementById("assistant1a-file-upload-status");
  var synth = window.speechSynthesis;
  var recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  var isRequestPending = false;
  var lastAction = null; // 'voice', 'text', 'file'
  recognition.lang = "fr-FR";
  recognition.continuous = false;

  var responseContainer = document.getElementById("assistant1a-response");

  var cancelButton = document.createElement("button");
  cancelButton.textContent = "Annuler le choix du fichier";
  cancelButton.id = "assistant1a-cancel-file";
  cancelButton.className = "custom-button";
  cancelButton.style.display = "none"; // Caché par défaut
  document.getElementById("assistant1a-file-section").appendChild(cancelButton);

  cancelButton.addEventListener("click", function () {
    fileInput.value = ""; // Réinitialise le choix du fichier
    this.style.display = "none"; // Cache le bouton d'annulation
    setButtonStates(); // Met à jour l'état des boutons
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
    responseContainer.innerHTML = "";
    cancelButton.style.display = "none";
    lastAction = null;
    setButtonStates();
  }

  function setButtonStates() {
    let hasFile = fileInput.files.length > 0;
    let hasText = questionInput.value.trim().length > 0;
    let isSpeaking = synth.speaking;

    allButtons.forEach((btn) => (btn.disabled = true)); // Désactive tous les boutons par défaut
    if (!isRequestPending) {
      microButton.disabled = hasFile || isSpeaking; // Active le micro si aucun fichier n'est sélectionné et pas en train de parler
      submitButton.disabled = hasFile || !hasText || isSpeaking; // Active soumettre si du texte est présent et pas en train de parler ou un fichier est sélectionné
      fileSubmitButton.disabled = !hasFile || isSpeaking; // Active envoyer fichier si un fichier est sélectionné
      cancelButton.style.display = hasFile ? "block" : "none"; // Affiche le bouton d'annulation si un fichier est sélectionné
    }
    stopButton.disabled = !isSpeaking; // Active le bouton arrêter seulement si la synthèse est en cours
    resetButton.disabled = lastAction === null && !isSpeaking; // Active réinitialiser si une action a été effectuée ou en train de parler
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

    fetch("https://kokua060424-caea7e92447d.herokuapp.com/ask", {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        responseContainer.innerHTML = data.response;
        if (isVoice) {
          speak(data.response);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        responseContainer.innerHTML = "Erreur lors de la requête.";
      })
      .finally(() => {
        if (!isVoice) {
          questionInput.value = ""; // Vide l'input si la requête n'est pas vocale
        }
        setLoadingState(false);
      });
  }

  stopButton.addEventListener("click", function () {
    synth.cancel();
  });

  submitButton.addEventListener("click", () => sendRequest(false));
  fileSubmitButton.addEventListener("click", () => sendRequest(false));

  microButton.addEventListener("click", function () {
    this.classList.add("recording");
    recognition.start();
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

  document
    .getElementById("assistant1a-stop")
    .addEventListener("click", function () {
      synth.cancel();
    });

  function speak(text) {
    var utterThis = new SpeechSynthesisUtterance(text);
    synth.speak(utterThis);
  }

  function resetSession() {
    // Implémentez la logique pour réinitialiser la session côté serveur ici
    // Cela peut être un appel fetch à un endpoint qui gère la réinitialisation
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

  resetUI(); // Initialise l'UI au chargement
});
